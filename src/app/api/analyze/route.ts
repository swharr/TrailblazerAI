import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiResponse,
  AnalysisResult,
  TrailAnalysis,
  AnalysisMetrics,
  VehicleInfo,
  AnalysisContext,
} from '@/lib/types';
import { getProviderClient, ProviderName } from '@/lib/model-clients';
import AnthropicClient from '@/lib/model-clients/anthropic';
import { buildAnalysisPrompt } from '@/lib/prompts';
import { trackMetric, calculateCost } from '@/lib/cost-tracker';
import { ModelError, RateLimitError, ModelProvider } from '@/lib/model-clients/base';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  trackAnthropicUsage,
  generateUseCaseId,
  trackTrailAnalysisSuccess,
  isPayiProxyEnabled,
  analyzeViaPayiProxy,
} from '@/lib/payi-client';

/** Supported vision models by provider */
const SUPPORTED_VISION_MODELS: Record<ProviderName, string[]> = {
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
  ],
  google: [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  xai: [
    'grok-2-vision',
    'grok-2-vision-1212',
  ],
  bedrock: [
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
  ],
};

/** Get all supported vision model names */
function getAllSupportedModels(): string[] {
  return Object.values(SUPPORTED_VISION_MODELS).flat();
}

/** Get provider for a model name */
function getProviderForModel(model: string): ProviderName | null {
  for (const [provider, models] of Object.entries(SUPPORTED_VISION_MODELS)) {
    if (models.includes(model)) {
      return provider as ProviderName;
    }
  }
  return null;
}

/** Maximum file size per image (32MB for high-resolution images) */
const MAX_FILE_SIZE = 32 * 1024 * 1024;

/** Maximum number of images */
const MAX_IMAGES = 8;

/** Allowed image MIME types */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
];

/**
 * Convert a File to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${file.type};base64,${base64}`;
}

/**
 * Parse JSON from AI response text, handling potential formatting issues
 */
function parseAnalysisJson(text: string): TrailAnalysis {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object in the response
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  // Validate required fields and provide defaults
  const analysis: TrailAnalysis = {
    difficulty: typeof parsed.difficulty === 'number' ? parsed.difficulty : 3,
    trailType: Array.isArray(parsed.trailType) ? parsed.trailType : [],
    conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
    hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [],
    bestFor: Array.isArray(parsed.bestFor) ? parsed.bestFor : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    rawResponse: text,
  };

  // Parse vehicle settings if present
  if (parsed.vehicleSettings) {
    analysis.vehicleSettings = {
      transferCase: parsed.vehicleSettings.transferCase || '4H',
      tractionControl: parsed.vehicleSettings.tractionControl || 'on',
      additionalNotes: Array.isArray(parsed.vehicleSettings.additionalNotes)
        ? parsed.vehicleSettings.additionalNotes
        : [],
    };

    if (parsed.vehicleSettings.recommendedTirePressure) {
      analysis.vehicleSettings.recommendedTirePressure = {
        front: parsed.vehicleSettings.recommendedTirePressure.front || 30,
        rear: parsed.vehicleSettings.recommendedTirePressure.rear || 30,
        unit: 'psi',
      };
    }

    if (Array.isArray(parsed.vehicleSettings.lockers)) {
      analysis.vehicleSettings.lockers = parsed.vehicleSettings.lockers;
    }
  }

  // Parse fuel estimate if present
  if (parsed.fuelEstimate) {
    analysis.fuelEstimate = {
      bestCase: parsed.fuelEstimate.bestCase || 'Unknown',
      worstCase: parsed.fuelEstimate.worstCase || 'Unknown',
      notes: parsed.fuelEstimate.notes,
    };
  }

  // Parse emergency comms if present
  if (parsed.emergencyComms) {
    const validCoverage = ['none', 'limited', 'moderate', 'good'];
    analysis.emergencyComms = {
      cellCoverage: validCoverage.includes(parsed.emergencyComms.cellCoverage)
        ? parsed.emergencyComms.cellCoverage
        : 'limited',
      recommendedMethods: Array.isArray(parsed.emergencyComms.recommendedMethods)
        ? parsed.emergencyComms.recommendedMethods
        : [],
      notes: parsed.emergencyComms.notes,
    };

    // Parse inter-vehicle comms if present
    if (parsed.emergencyComms.interVehicleComms) {
      const validChannelTypes = ['gmrs', 'ham', 'frs', 'cb'];
      analysis.emergencyComms.interVehicleComms = {
        recommendedChannel: parsed.emergencyComms.interVehicleComms.recommendedChannel || 'GMRS Channel 19',
        channelType: validChannelTypes.includes(parsed.emergencyComms.interVehicleComms.channelType)
          ? parsed.emergencyComms.interVehicleComms.channelType
          : 'gmrs',
        frequency: parsed.emergencyComms.interVehicleComms.frequency,
        notes: parsed.emergencyComms.interVehicleComms.notes,
      };
    }

    // Parse emergency frequencies if present
    if (parsed.emergencyComms.emergencyFrequencies) {
      analysis.emergencyComms.emergencyFrequencies = {
        primary: parsed.emergencyComms.emergencyFrequencies.primary || 'GMRS Channel 20 (462.675 MHz)',
        secondary: parsed.emergencyComms.emergencyFrequencies.secondary,
        hamEmergency: parsed.emergencyComms.emergencyFrequencies.hamEmergency,
        notes: parsed.emergencyComms.emergencyFrequencies.notes,
      };
    }

    // Parse local authorities if present
    if (parsed.emergencyComms.localAuthorities) {
      analysis.emergencyComms.localAuthorities = {
        sheriff: parsed.emergencyComms.localAuthorities.sheriff,
        searchAndRescue: parsed.emergencyComms.localAuthorities.searchAndRescue,
        blm: parsed.emergencyComms.localAuthorities.blm,
        nps: parsed.emergencyComms.localAuthorities.nps,
        forestService: parsed.emergencyComms.localAuthorities.forestService,
        stateParks: parsed.emergencyComms.localAuthorities.stateParks,
        emergencyServices: parsed.emergencyComms.localAuthorities.emergencyServices || '911',
        notes: parsed.emergencyComms.localAuthorities.notes,
      };
    }

    // Parse recovery services if present
    if (parsed.emergencyComms.recoveryServices) {
      analysis.emergencyComms.recoveryServices = {
        recommended: parsed.emergencyComms.recoveryServices.recommended,
        alternates: Array.isArray(parsed.emergencyComms.recoveryServices.alternates)
          ? parsed.emergencyComms.recoveryServices.alternates
          : [],
        localClubs: Array.isArray(parsed.emergencyComms.recoveryServices.localClubs)
          ? parsed.emergencyComms.recoveryServices.localClubs
          : [],
        notes: parsed.emergencyComms.recoveryServices.notes,
      };
    }
  }

  // Parse Starlink coverage if present
  if (parsed.starlinkCoverage) {
    const validCoverageLevel = ['high-performance', 'good-coverage', 'some-issues', 'major-obstructions', 'zero-availability'];
    const validConfidence = ['low', 'medium', 'high'];
    analysis.starlinkCoverage = {
      coverage: validCoverageLevel.includes(parsed.starlinkCoverage.coverage)
        ? parsed.starlinkCoverage.coverage
        : 'some-issues',
      confidence: validConfidence.includes(parsed.starlinkCoverage.confidence)
        ? parsed.starlinkCoverage.confidence
        : 'medium',
      obstructions: Array.isArray(parsed.starlinkCoverage.obstructions)
        ? parsed.starlinkCoverage.obstructions
        : [],
      bestSpots: Array.isArray(parsed.starlinkCoverage.bestSpots)
        ? parsed.starlinkCoverage.bestSpots
        : [],
      notes: parsed.starlinkCoverage.notes,
    };
  }

  return analysis;
}

/**
 * Create CORS headers for the response
 * Restricts origins to allowed domains only
 */
function getCorsHeaders(): HeadersInit {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3636';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * @swagger
 * /api/analyze:
 *   post:
 *     tags:
 *       - Analysis
 *     summary: Analyze trail photos
 *     description: Upload trail photos for AI-powered terrain analysis. Returns difficulty rating, hazards, vehicle recommendations, and more.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *               - model
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Trail images (1-8, max 32MB each)
 *               model:
 *                 type: string
 *                 enum: [claude-sonnet-4-20250514, claude-opus-4-20250514, claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022]
 *                 description: AI model to use for analysis
 *               vehicleInfo:
 *                 type: string
 *                 description: JSON string containing vehicle configuration
 *               context:
 *                 type: string
 *                 description: JSON string containing trail context (name, location, notes)
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analysis:
 *                       $ref: '#/components/schemas/TrailAnalysis'
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         model:
 *                           type: string
 *                         inputTokens:
 *                           type: integer
 *                         outputTokens:
 *                           type: integer
 *                         cost:
 *                           type: number
 *                         latency:
 *                           type: integer
 *                     id:
 *                       type: string
 *                       description: Database ID if saved
 *       400:
 *         description: Validation error (no images, invalid file type, etc.)
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AnalysisResult>>> {
  const startTime = Date.now();

  console.log('[analyze] Received analysis request');

  // Check authentication
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) {
    console.log('[analyze] Authentication required');
    return errorResponse;
  }
  console.log('[analyze] Authenticated user:', session.user?.email);

  try {
    // Parse FormData
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const modelParam = formData.get('model') as string | null;
    const vehicleInfoParam = formData.get('vehicleInfo') as string | null;
    const contextParam = formData.get('context') as string | null;

    // Parse optional vehicle info and context
    let vehicleInfo: VehicleInfo | null = null;
    let context: AnalysisContext | null = null;

    if (vehicleInfoParam) {
      try {
        vehicleInfo = JSON.parse(vehicleInfoParam) as VehicleInfo;
      } catch {
        console.warn('[analyze] Failed to parse vehicleInfo');
      }
    }

    if (contextParam) {
      try {
        context = JSON.parse(contextParam) as AnalysisContext;
      } catch {
        console.warn('[analyze] Failed to parse context');
      }
    }

    console.log('[analyze] FormData parsed:', {
      imageCount: images.length,
      imageTypes: images.map((img) => img.type),
      imageSizes: images.map((img) => img.size),
      model: modelParam,
      hasVehicleInfo: !!vehicleInfo,
      hasContext: !!context,
    });

    // Validate images
    if (!images || images.length === 0) {
      console.log('[analyze] Error: No images provided');
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate image count
    if (images.length > MAX_IMAGES) {
      console.log('[analyze] Error: Too many images:', images.length);
      return NextResponse.json(
        {
          success: false,
          error: `Too many images (${images.length}). Maximum is ${MAX_IMAGES}.`,
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(image.type)) {
        console.log('[analyze] Error: Invalid file type for image', i + 1, ':', image.type);
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file type for image ${i + 1}: ${image.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
          },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      // Validate file size
      if (image.size > MAX_FILE_SIZE) {
        const sizeMB = (image.size / (1024 * 1024)).toFixed(1);
        console.log('[analyze] Error: Image', i + 1, 'too large:', sizeMB, 'MB');
        return NextResponse.json(
          {
            success: false,
            error: `Image ${i + 1} is too large (${sizeMB}MB). Maximum size is 32MB per image.`,
          },
          { status: 400, headers: getCorsHeaders() }
        );
      }
    }

    // Validate model parameter
    if (!modelParam) {
      console.log('[analyze] Error: No model specified');
      return NextResponse.json(
        { success: false, error: 'No model specified' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const model = modelParam;

    // Get provider for this model
    const providerName = getProviderForModel(model);
    if (!providerName) {
      // Check if it's a known model but doesn't support vision
      const nonVisionModels = ['gemini-pro', 'o1', 'o1-mini', 'grok-2'];
      if (nonVisionModels.includes(model)) {
        console.log('[analyze] Error: Model does not support vision:', model);
        return NextResponse.json(
          {
            success: false,
            error: `Model ${model} does not support image analysis`,
          },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      console.log('[analyze] Error: Unknown model:', model);
      return NextResponse.json(
        {
          success: false,
          error: `Unknown model: ${model}. Supported models: ${getAllSupportedModels().join(', ')}`,
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    console.log('[analyze] Model', model, 'uses provider:', providerName);

    // Convert all images to base64
    console.log('[analyze] Converting', images.length, 'image(s) to base64...');
    const base64Images = await Promise.all(images.map((img) => fileToBase64(img)));
    console.log('[analyze] Base64 conversion complete, total length:', base64Images.reduce((sum, b64) => sum + b64.length, 0));

    // Create appropriate client based on model
    console.log('[analyze] Creating client for model:', model, 'provider:', providerName);
    let response: { text: string; usage: { inputTokens: number; outputTokens: number } };
    let proxyUseCaseId: string | undefined;

    // Build the full analysis prompt
    const prompt = buildAnalysisPrompt(vehicleInfo, context);

    // Check if Pay-i proxy is enabled for Anthropic models (full instrumentation)
    const isAnthropicModel = providerName === 'anthropic';
    if (isAnthropicModel && isPayiProxyEnabled()) {
      console.log('[analyze] Using Pay-i proxy for full instrumentation');

      // Build use case properties for Pay-i attribution
      const useCaseProperties: Record<string, string> = {};
      if (context?.trailName) useCaseProperties.trail_name = context.trailName;
      if (context?.trailLocation) useCaseProperties.trail_location = context.trailLocation;
      if (vehicleInfo?.make) useCaseProperties.vehicle_make = vehicleInfo.make;
      if (vehicleInfo?.model) useCaseProperties.vehicle_model = vehicleInfo.model;
      if (vehicleInfo?.year) useCaseProperties.vehicle_year = String(vehicleInfo.year);

      // Build request properties
      const requestProperties: Record<string, string> = {
        image_count: String(images.length),
        model_used: model,
        has_vehicle_info: String(!!vehicleInfo),
        has_context: String(!!context),
      };

      const proxyResponse = await analyzeViaPayiProxy({
        images: base64Images,
        model,
        prompt,
        vehicle_info: vehicleInfo
          ? {
              make: vehicleInfo.make,
              model: vehicleInfo.model,
              year: vehicleInfo.year,
              features: vehicleInfo.features,
              suspension_brand: vehicleInfo.suspensionBrand,
              suspension_travel: vehicleInfo.suspensionTravel,
            }
          : undefined,
        context: context
          ? {
              trail_name: context.trailName,
              trail_location: context.trailLocation,
              additional_notes: context.additionalNotes,
            }
          : undefined,
        user_id: session.user?.email || undefined,
        use_case_name: 'trail_analysis',
        use_case_version: 2,
        use_case_properties: useCaseProperties,
        request_properties: requestProperties,
      });

      response = {
        text: proxyResponse.text,
        usage: {
          inputTokens: proxyResponse.usage.input_tokens,
          outputTokens: proxyResponse.usage.output_tokens,
        },
      };
      proxyUseCaseId = proxyResponse.use_case_id;
    } else {
      // Get the provider client from the factory
      let client: ModelProvider | null = null;

      // Try to get client from database config first
      client = await getProviderClient(providerName);

      // Fallback to direct instantiation for Anthropic if no DB config
      if (!client && providerName === 'anthropic') {
        console.log('[analyze] Falling back to env-based Anthropic client');
        client = new AnthropicClient();
      }

      if (!client) {
        console.log('[analyze] Error: Provider not configured:', providerName);
        return NextResponse.json(
          {
            success: false,
            error: `Provider ${providerName} is not configured. Please add API credentials in the admin panel.`,
          },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      console.log('[analyze] Calling', providerName, 'API with', base64Images.length, 'image(s)...');
      response = await client.analyzeImages(base64Images, prompt);
    }

    const latency = Date.now() - startTime;
    console.log('[analyze] API response received:', {
      textLength: response.text.length,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      latency,
    });

    // Parse the AI response as JSON
    console.log('[analyze] Parsing AI response as JSON...');
    let analysis: TrailAnalysis;
    try {
      analysis = parseAnalysisJson(response.text);
      console.log('[analyze] Parsed analysis:', {
        difficulty: analysis.difficulty,
        trailTypes: analysis.trailType.length,
        hazards: analysis.hazards.length,
      });
    } catch (parseError) {
      console.error('[analyze] Failed to parse AI response as JSON:', parseError);
      console.error('[analyze] Raw response:', response.text.substring(0, 500));

      // Return partial result with raw response
      analysis = {
        difficulty: 0,
        trailType: [],
        conditions: [],
        hazards: [],
        recommendations: [],
        bestFor: [],
        summary: 'Failed to parse structured analysis',
        rawResponse: response.text,
      };
    }

    // Calculate cost and create metrics
    const cost = calculateCost(
      model,
      response.usage.inputTokens,
      response.usage.outputTokens
    );

    const metrics: AnalysisMetrics = {
      model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost,
      latency,
      timestamp: new Date().toISOString(),
    };

    // Track the metrics
    trackMetric(metrics);
    console.log('[analyze] Metrics tracked:', {
      model: metrics.model,
      cost: `$${cost.toFixed(4)}`,
      latency: `${latency}ms`,
    });

    // Use proxy use case ID if available, otherwise generate one
    const useCaseId = proxyUseCaseId || generateUseCaseId();

    // Only do manual Pay-i tracking if NOT using the proxy
    // (the proxy handles tracking automatically via the Python SDK)
    if (!isPayiProxyEnabled()) {
      // Build use case properties (business-level metadata)
      const useCaseProperties: Record<string, string> = {};
      if (context?.trailName) useCaseProperties.trail_name = context.trailName;
      if (context?.trailLocation) useCaseProperties.trail_location = context.trailLocation;
      if (vehicleInfo?.make) useCaseProperties.vehicle_make = vehicleInfo.make;
      if (vehicleInfo?.model) useCaseProperties.vehicle_model = vehicleInfo.model;
      if (vehicleInfo?.year) useCaseProperties.vehicle_year = String(vehicleInfo.year);

      // Build request properties (request-level metadata)
      const requestProperties: Record<string, string> = {
        image_count: String(images.length),
        model_used: model,
        has_vehicle_info: String(!!vehicleInfo),
        has_context: String(!!context),
        difficulty_result: String(analysis.difficulty),
      };
      if (analysis.trailType.length > 0) {
        requestProperties.trail_types = analysis.trailType.join(',');
      }

      // Track usage with Pay-i REST API (fire and forget)
      trackAnthropicUsage({
        model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        latencyMs: latency,
        userId: session.user?.email || undefined,
        useCaseName: 'trail_analysis',
        useCaseId,
        useCaseVersion: 2, // Version 2: Enhanced with emergency comms, Starlink, etc.
        useCaseProperties,
        requestProperties,
      });

      // Track successful analysis KPI (fire and forget)
      trackTrailAnalysisSuccess({
        useCaseId,
        difficulty: analysis.difficulty,
        imageCount: images.length,
        hasVehicleInfo: !!vehicleInfo,
      });
    } else {
      console.log('[analyze] Pay-i tracking handled by proxy, use_case_id:', useCaseId);
    }

    // Save analysis to database
    let savedAnalysisId: string | null = null;
    try {
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { email: session.user?.email?.toLowerCase() || '' },
        select: { id: true },
      });

      if (user) {
        // Check if vehicleInfo has an ID (saved vehicle) or just form data
        const vehicleId = vehicleInfo?.id || null;

        const savedAnalysis = await prisma.trailAnalysis.create({
          data: {
            userId: user.id,
            vehicleId: vehicleId,
            // Trail context
            trailName: context?.trailName || null,
            trailLocation: context?.trailLocation || null,
            notes: context?.additionalNotes || null,
            // Analysis results
            difficulty: analysis.difficulty,
            trailType: analysis.trailType,
            conditions: analysis.conditions,
            hazards: analysis.hazards,
            recommendations: analysis.recommendations,
            bestFor: analysis.bestFor,
            summary: analysis.summary,
            rawResponse: analysis.rawResponse || response.text,
            // Optional AI recommendations (cast to Prisma JSON type)
            vehicleSettings: analysis.vehicleSettings
              ? (analysis.vehicleSettings as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            fuelEstimate: analysis.fuelEstimate
              ? (analysis.fuelEstimate as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            emergencyComms: analysis.emergencyComms
              ? (analysis.emergencyComms as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            // Create metrics record
            metrics: {
              create: {
                model: metrics.model,
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                cost: cost,
                latencyMs: latency,
              },
            },
          },
        });
        savedAnalysisId = savedAnalysis.id;
        console.log('[analyze] Analysis saved to database:', savedAnalysisId);
      }
    } catch (dbError) {
      // Log but don't fail the request - analysis was successful
      console.error('[analyze] Failed to save to database:', dbError);
    }

    // Build the result
    const result: AnalysisResult = {
      analysis,
      metrics,
      id: savedAnalysisId || undefined,
    };

    console.log('[analyze] Analysis complete, returning result');

    return NextResponse.json(
      { success: true, data: result },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error('[analyze] Error during analysis:', error);

    // Handle specific error types
    if (error instanceof RateLimitError) {
      console.error('[analyze] Rate limit exceeded');
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: {
            ...getCorsHeaders(),
            'Retry-After': error.retryAfterMs
              ? String(Math.ceil(error.retryAfterMs / 1000))
              : '60',
          },
        }
      );
    }

    if (error instanceof ModelError) {
      console.error('[analyze] Model error:', error.message, 'Status:', error.statusCode);

      // Map status codes
      const status = error.statusCode || 500;
      if (status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'API key configuration error. Please contact support.',
          },
          { status: 500, headers: getCorsHeaders() }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status, headers: getCorsHeaders() }
      );
    }

    // Generic error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[analyze] Unexpected error:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze image. Please try again.',
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
