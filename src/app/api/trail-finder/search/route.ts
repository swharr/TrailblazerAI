import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiResponse,
  TrailSearchInput,
  TrailSearchResult,
  TrailRecommendation,
  VehicleInfo,
} from '@/lib/types';
import Anthropic from '@anthropic-ai/sdk';
import { buildTrailFinderPrompt, calculateVehicleCapabilityScore } from '@/lib/trail-finder-prompts';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { isPayiProxyEnabled, trailFinderViaPayiProxy } from '@/lib/payi-client';
import { Prisma } from '@prisma/client';

/** Default model for trail search (needs web search capability) */
const TRAIL_FINDER_MODEL = 'claude-sonnet-4-20250514';

/** Maximum tokens for response */
const MAX_TOKENS = 4096;

/**
 * Parse JSON from AI response text
 */
function parseTrailFinderJson(text: string): {
  recommendations: TrailRecommendation[];
  searchSummary: string;
  vehicleCapabilityScore: number;
} {
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

  // Validate and transform recommendations
  const recommendations: TrailRecommendation[] = [];
  if (Array.isArray(parsed.recommendations)) {
    for (const rec of parsed.recommendations) {
      const validCompatibilities = ['excellent', 'good', 'marginal', 'not-recommended'];
      const validSources = ['alltrails', 'onx', 'gaia', 'forum', 'other'];

      recommendations.push({
        name: rec.name || 'Unknown Trail',
        location: rec.location || '',
        source: validSources.includes(rec.source) ? rec.source : 'other',
        sourceUrl: rec.sourceUrl,
        difficulty: typeof rec.difficulty === 'number' ? rec.difficulty : 3,
        length: rec.length,
        elevationGain: rec.elevationGain,
        description: rec.description || '',
        whyRecommended: rec.whyRecommended || '',
        vehicleCompatibility: validCompatibilities.includes(rec.vehicleCompatibility)
          ? rec.vehicleCompatibility
          : 'good',
        sceneryType: Array.isArray(rec.sceneryType) ? rec.sceneryType : [],
        bestSeason: rec.bestSeason,
        permits: rec.permits,
        warnings: Array.isArray(rec.warnings) ? rec.warnings : [],
      });
    }
  }

  return {
    recommendations,
    searchSummary: parsed.searchSummary || 'Search completed.',
    vehicleCapabilityScore: typeof parsed.vehicleCapabilityScore === 'number'
      ? parsed.vehicleCapabilityScore
      : 3,
  };
}

/**
 * Create CORS headers
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
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * POST /api/trail-finder/search
 * Search for trails based on location, vehicle, and preferences
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TrailSearchResult>>> {
  console.log('[trail-finder] Received search request');

  // Check authentication
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) {
    console.log('[trail-finder] Authentication required');
    return errorResponse;
  }
  console.log('[trail-finder] Authenticated user:', session.user?.email);

  try {
    // Parse request body
    const body = await request.json();
    const {
      vehicleId,
      vehicleInfo: providedVehicleInfo,
      location,
      searchRadius,
      difficultyPref,
      tripLength,
      sceneryTypes,
    } = body as TrailSearchInput & { vehicleId?: string };

    // Validate required fields
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Location is required' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Get vehicle info - either from database or provided
    let vehicleInfo: VehicleInfo | undefined;
    let resolvedVehicleId: string | undefined;

    if (vehicleId) {
      // Fetch from database
      const vehicle = await prisma.vehicleProfile.findUnique({
        where: { id: vehicleId },
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          features: true,
          suspensionBrand: true,
          suspensionTravel: true,
          userId: true,
        },
      });

      if (vehicle) {
        // Verify the vehicle belongs to this user
        const user = await prisma.user.findUnique({
          where: { email: session.user?.email?.toLowerCase() || '' },
          select: { id: true },
        });

        if (user && vehicle.userId === user.id) {
          vehicleInfo = {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year || undefined,
            features: vehicle.features as VehicleInfo['features'],
            suspensionBrand: (vehicle.suspensionBrand as VehicleInfo['suspensionBrand']) || undefined,
            suspensionTravel: (vehicle.suspensionTravel as VehicleInfo['suspensionTravel']) || undefined,
          };
          resolvedVehicleId = vehicle.id;
        }
      }
    } else if (providedVehicleInfo) {
      // Use provided vehicle info
      vehicleInfo = providedVehicleInfo;
    }

    console.log('[trail-finder] Search parameters:', {
      location,
      searchRadius,
      difficultyPref,
      tripLength,
      sceneryTypes,
      hasVehicle: !!vehicleInfo,
      vehicleMake: vehicleInfo?.make,
    });

    // Build search input
    const searchInput: TrailSearchInput = {
      vehicleInfo,
      location: location.trim(),
      searchRadius: searchRadius || 50,
      difficultyPref,
      tripLength,
      sceneryTypes,
    };

    // Build the prompt
    const prompt = buildTrailFinderPrompt(searchInput);

    // Build use case properties for Pay-i tracking
    const useCaseProperties: Record<string, string> = {
      location: searchInput.location,
      difficulty_pref: searchInput.difficultyPref || 'any',
      trip_length: searchInput.tripLength || 'any',
      has_vehicle: vehicleInfo ? 'true' : 'false',
    };
    if (vehicleInfo?.make) useCaseProperties.vehicle_make = vehicleInfo.make;
    if (vehicleInfo?.model) useCaseProperties.vehicle_model = vehicleInfo.model;

    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    // Check if Pay-i proxy is enabled - route ALL calls through proxy for instrumentation
    if (isPayiProxyEnabled()) {
      console.log('[trail-finder] Using Pay-i proxy for trail search...');

      const proxyResponse = await trailFinderViaPayiProxy({
        prompt,
        model: TRAIL_FINDER_MODEL,
        max_tokens: MAX_TOKENS,
        user_id: session.user?.email || undefined,
        use_case_name: 'trail_finder',
        use_case_version: 1,
        use_case_properties: useCaseProperties,
        request_properties: {
          search_radius: String(searchInput.searchRadius),
        },
      });

      responseText = proxyResponse.text;
      inputTokens = proxyResponse.usage.input_tokens;
      outputTokens = proxyResponse.usage.output_tokens;

      console.log('[trail-finder] Proxy response received:', {
        inputTokens,
        outputTokens,
        useCaseId: proxyResponse.use_case_id,
      });
    } else {
      // Fallback: Direct Anthropic call (no Pay-i instrumentation)
      console.log('[trail-finder] Pay-i proxy not enabled, using direct Anthropic call');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('[trail-finder] No Anthropic API key configured');
        return NextResponse.json(
          { success: false, error: 'API key not configured' },
          { status: 500, headers: getCorsHeaders() }
        );
      }

      const client = new Anthropic({ apiKey });

      console.log('[trail-finder] Calling Anthropic API with web search...');

      // Call Anthropic with web search tool
      const response = await client.messages.create({
        model: TRAIL_FINDER_MODEL,
        max_tokens: MAX_TOKENS,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 10,
          },
        ],
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      console.log('[trail-finder] API response received:', {
        stopReason: response.stop_reason,
        contentBlocks: response.content.length,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      // Extract text from response
      for (const block of response.content) {
        if (block.type === 'text') {
          responseText += block.text;
        }
      }
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
    }

    // Parse the response
    let parsed: {
      recommendations: TrailRecommendation[];
      searchSummary: string;
      vehicleCapabilityScore: number;
    };

    try {
      parsed = parseTrailFinderJson(responseText);
      console.log('[trail-finder] Parsed response:', {
        recommendationCount: parsed.recommendations.length,
        capabilityScore: parsed.vehicleCapabilityScore,
      });
    } catch (parseError) {
      console.error('[trail-finder] Failed to parse response:', parseError);
      console.error('[trail-finder] Raw response:', responseText.substring(0, 1000));

      return NextResponse.json(
        { success: false, error: 'Failed to parse trail recommendations' },
        { status: 500, headers: getCorsHeaders() }
      );
    }

    // Calculate capability score (use our calculation for consistency)
    const capabilityScore = calculateVehicleCapabilityScore(vehicleInfo);

    // Note: Pay-i tracking is handled automatically by the proxy when PAYI_PROXY_URL is set
    // No manual tracking needed here

    // Build result
    const result: TrailSearchResult = {
      query: searchInput,
      recommendations: parsed.recommendations,
      searchSummary: parsed.searchSummary,
      vehicleCapabilityScore: capabilityScore,
    };

    // Save to database
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user?.email?.toLowerCase() || '' },
        select: { id: true },
      });

      if (user) {
        await prisma.trailSearch.create({
          data: {
            userId: user.id,
            vehicleId: resolvedVehicleId || null,
            location: searchInput.location,
            searchRadius: searchInput.searchRadius,
            difficultyPref: searchInput.difficultyPref,
            tripLength: searchInput.tripLength,
            sceneryTypes: searchInput.sceneryTypes || [],
            results: parsed.recommendations as unknown as Prisma.InputJsonValue,
            resultCount: parsed.recommendations.length,
            searchSummary: parsed.searchSummary,
            vehicleCapabilityScore: capabilityScore,
          },
        });
        console.log('[trail-finder] Search saved to database');
      }
    } catch (dbError) {
      console.error('[trail-finder] Failed to save to database:', dbError);
      // Don't fail the request - search was successful
    }

    console.log('[trail-finder] Returning', result.recommendations.length, 'recommendations');

    return NextResponse.json(
      { success: true, data: result },
      { status: 200, headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error('[trail-finder] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: `Failed to search for trails: ${errorMessage}` },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
