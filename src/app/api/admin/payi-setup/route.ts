import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getPayiClient } from '@/lib/payi-client';

/**
 * @swagger
 * /api/admin/payi-setup:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Initialize Pay-i use cases and KPIs
 *     description: Sets up the trail_analysis use case definition with KPIs for tracking. Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
export async function POST(): Promise<NextResponse> {
  // Check authentication
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) {
    return errorResponse;
  }

  // Check if user is admin (optional - remove if you want any authenticated user to run setup)
  if (session.user?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  const client = getPayiClient();

  if (!client.isEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Pay-i is not configured' },
      { status: 500 }
    );
  }

  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // ============================================================================
  // Use Case Definitions
  // ============================================================================

  const useCaseDefinitions = [
    {
      use_case_name: 'trail_analysis',
      description: 'AI-powered trail photo analysis for overland route planning',
      properties: {
        app: 'trailblazer_ai',
        version: '2',
        features: 'terrain_analysis,vehicle_recommendations,emergency_comms,starlink_coverage',
      },
    },
    {
      use_case_name: 'trail_finder',
      description: 'AI-powered trail search and discovery with web search',
      properties: {
        app: 'trailblazer_ai',
        version: '1',
        features: 'web_search,vehicle_matching,trail_recommendations',
      },
    },
    {
      use_case_name: 'trail_planner',
      description: 'AI-powered route planning and optimization',
      properties: {
        app: 'trailblazer_ai',
        version: '1',
        features: 'route_optimization,waypoint_suggestions,terrain_analysis',
      },
    },
  ];

  results.useCaseDefinitions = [];

  for (const ucDef of useCaseDefinitions) {
    console.log(`[payi-setup] Creating ${ucDef.use_case_name} use case definition...`);
    const useCaseDef = await client.createUseCaseDefinition(ucDef);
    if (useCaseDef) {
      (results.useCaseDefinitions as unknown[]).push(useCaseDef);
      console.log(`[payi-setup] Use case definition created: ${useCaseDef.use_case_name}`);
    } else {
      errors.push(`Failed to create use case definition: ${ucDef.use_case_name} (may already exist)`);
      console.log(`[payi-setup] Use case definition ${ucDef.use_case_name} may already exist`);
    }
  }

  // ============================================================================
  // KPIs for each use case
  // ============================================================================

  const kpisToCreate: { useCaseName: string; kpi: { kpi_name: string; description: string; value_type: 'boolean' | 'numeric' } }[] = [
    // trail_analysis KPIs
    {
      useCaseName: 'trail_analysis',
      kpi: {
        kpi_name: 'analysis_success',
        description: 'Whether the trail analysis completed successfully',
        value_type: 'boolean',
      },
    },
    {
      useCaseName: 'trail_analysis',
      kpi: {
        kpi_name: 'difficulty_rating',
        description: 'Trail difficulty rating from 1-5',
        value_type: 'numeric',
      },
    },
    {
      useCaseName: 'trail_analysis',
      kpi: {
        kpi_name: 'image_count',
        description: 'Number of images analyzed',
        value_type: 'numeric',
      },
    },
    // trail_finder KPIs
    {
      useCaseName: 'trail_finder',
      kpi: {
        kpi_name: 'search_success',
        description: 'Whether the trail search completed successfully',
        value_type: 'boolean',
      },
    },
    {
      useCaseName: 'trail_finder',
      kpi: {
        kpi_name: 'result_count',
        description: 'Number of trail recommendations returned',
        value_type: 'numeric',
      },
    },
    {
      useCaseName: 'trail_finder',
      kpi: {
        kpi_name: 'vehicle_capability_score',
        description: 'Vehicle capability score from 1-5',
        value_type: 'numeric',
      },
    },
    // trail_planner KPIs
    {
      useCaseName: 'trail_planner',
      kpi: {
        kpi_name: 'plan_success',
        description: 'Whether the route plan completed successfully',
        value_type: 'boolean',
      },
    },
    {
      useCaseName: 'trail_planner',
      kpi: {
        kpi_name: 'waypoint_count',
        description: 'Number of waypoints in the planned route',
        value_type: 'numeric',
      },
    },
    {
      useCaseName: 'trail_planner',
      kpi: {
        kpi_name: 'route_distance',
        description: 'Total route distance in miles',
        value_type: 'numeric',
      },
    },
  ];

  results.kpis = [];

  for (const { useCaseName, kpi: kpiDef } of kpisToCreate) {
    console.log(`[payi-setup] Creating KPI ${kpiDef.kpi_name} for ${useCaseName}...`);
    const kpi = await client.createKpi(useCaseName, kpiDef);
    if (kpi) {
      (results.kpis as unknown[]).push({ useCaseName, ...kpi });
      console.log(`[payi-setup] KPI created: ${kpi.kpi_name} for ${useCaseName}`);
    } else {
      errors.push(`Failed to create KPI: ${kpiDef.kpi_name} for ${useCaseName} (may already exist)`);
      console.log(`[payi-setup] KPI ${kpiDef.kpi_name} for ${useCaseName} may already exist`);
    }
  }

  // Create default limits
  const limitsToCreate = [
    {
      limit_name: 'daily_analysis_budget',
      limit_id: 'daily-analysis',
      max: 10.0, // $10/day default
      threshold: 8.0, // Alert at $8
      limit_type: 'allow' as const,
      properties: {
        description: 'Daily spending limit for trail analysis',
        reset_period: 'daily',
      },
    },
    {
      limit_name: 'monthly_analysis_budget',
      limit_id: 'monthly-analysis',
      max: 200.0, // $200/month default
      threshold: 150.0, // Alert at $150
      limit_type: 'allow' as const,
      properties: {
        description: 'Monthly spending limit for trail analysis',
        reset_period: 'monthly',
      },
    },
  ];

  results.limits = [];

  for (const limitDef of limitsToCreate) {
    console.log(`[payi-setup] Creating limit: ${limitDef.limit_name}...`);
    const limit = await client.createLimit(limitDef);
    if (limit) {
      (results.limits as unknown[]).push(limit.limit);
      console.log(`[payi-setup] Limit created: ${limit.limit.limit_name}`);
    } else {
      errors.push(`Failed to create limit: ${limitDef.limit_name} (may already exist)`);
      console.log(`[payi-setup] Limit ${limitDef.limit_name} may already exist`);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    data: results,
    errors: errors.length > 0 ? errors : undefined,
    message: 'Pay-i setup completed. Some items may already exist.',
  });
}

/**
 * @swagger
 * /api/admin/payi-setup:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get Pay-i configuration status
 *     description: Returns current Pay-i use cases, KPIs, and limits. Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration status retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
export async function GET(): Promise<NextResponse> {
  // Check authentication
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) {
    return errorResponse;
  }

  // Check if user is admin
  if (session.user?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  const client = getPayiClient();

  if (!client.isEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Pay-i is not configured' },
      { status: 500 }
    );
  }

  const results: Record<string, unknown> = {
    enabled: true,
  };

  // Get use case definitions
  const useCases = await client.getUseCaseDefinitions();
  results.useCases = useCases?.items || [];

  // Get KPIs for trail_analysis
  const kpis = await client.getKpis('trail_analysis');
  results.kpis = kpis?.items || [];

  // Get all limits
  const limits = await client.getLimits();
  results.limits = limits?.items || [];

  return NextResponse.json({
    success: true,
    data: results,
  });
}
