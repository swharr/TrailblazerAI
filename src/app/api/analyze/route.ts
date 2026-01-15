import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiResponse,
  AnalysisResult,
  TrailAnalysis,
  AnalysisMetrics,
  ModelName,
  VehicleInfo,
  AnalysisContext,
} from '@/lib/types';
import AnthropicClient from '@/lib/model-clients/anthropic';
import { buildAnalysisPrompt } from '@/lib/prompts';
import { trackMetric, calculateCost } from '@/lib/cost-tracker';
import { ModelError, RateLimitError } from '@/lib/model-clients/base';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { trackAnthropicUsage } from '@/lib/payi-client';

/** Supported models for image analysis */
const SUPPORTED_VISION_MODELS: ModelName[] = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
];

/** Maximum file size per image (5MB - Anthropic API limit) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum number of images */
const MAX_IMAGES = 4;

/** Allowed image MIME types */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
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
 *                 description: Trail images (1-4, max 5MB each)
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
            error: `Image ${i + 1} is too large (${sizeMB}MB). Maximum size is 5MB per image.`,
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

    const model = modelParam as ModelName;

    // Check if model is supported for vision
    if (!SUPPORTED_VISION_MODELS.includes(model)) {
      // Check if it's a known model but doesn't support vision
      const nonVisionModels: ModelName[] = ['gemini-pro'];
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

      // Check if it's a model we haven't implemented yet
      const notImplementedModels: ModelName[] = [
        'gpt-4o',
        'gpt-4-turbo',
        'gemini-pro-vision',
      ];
      if (notImplementedModels.includes(model)) {
        console.log('[analyze] Error: Model not yet implemented:', model);
        return NextResponse.json(
          {
            success: false,
            error: `Model ${model} is not yet implemented. Currently supported: ${SUPPORTED_VISION_MODELS.join(', ')}`,
          },
          { status: 501, headers: getCorsHeaders() }
        );
      }

      console.log('[analyze] Error: Unknown model:', model);
      return NextResponse.json(
        { success: false, error: `Unknown model: ${model}` },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Convert all images to base64
    console.log('[analyze] Converting', images.length, 'image(s) to base64...');
    const base64Images = await Promise.all(images.map((img) => fileToBase64(img)));
    console.log('[analyze] Base64 conversion complete, total length:', base64Images.reduce((sum, b64) => sum + b64.length, 0));

    // Create appropriate client based on model
    console.log('[analyze] Creating client for model:', model);
    let response;

    // Check if model is an Anthropic model
    const isAnthropicModel =
      model === 'claude-sonnet-4-20250514' ||
      model === 'claude-opus-4-20250514' ||
      model === 'claude-3-5-sonnet-20241022' ||
      model === 'claude-3-5-haiku-20241022';

    if (isAnthropicModel) {
      const client = new AnthropicClient();
      const prompt = buildAnalysisPrompt(vehicleInfo, context);
      console.log('[analyze] Calling Anthropic API with', base64Images.length, 'image(s)...');
      response = await client.analyzeImages(base64Images, prompt);
    } else {
      // This shouldn't happen due to earlier validation, but just in case
      return NextResponse.json(
        { success: false, error: 'Model not yet implemented' },
        { status: 501, headers: getCorsHeaders() }
      );
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

    // Track usage with Pay-i (fire and forget)
    trackAnthropicUsage({
      model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      latencyMs: latency,
      userId: session.user?.email || undefined,
      useCaseName: 'trail_analysis',
    });

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
