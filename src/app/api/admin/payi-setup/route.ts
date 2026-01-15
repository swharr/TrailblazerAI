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

  // Create the trail_analysis use case definition
  console.log('[payi-setup] Creating trail_analysis use case definition...');
  const useCaseDef = await client.createUseCaseDefinition({
    use_case_name: 'trail_analysis',
    description: 'AI-powered trail photo analysis for overland route planning',
    properties: {
      app: 'trailblazer_ai',
      version: '2',
      features: 'terrain_analysis,vehicle_recommendations,emergency_comms,starlink_coverage',
    },
  });

  if (useCaseDef) {
    results.useCaseDefinition = useCaseDef;
    console.log('[payi-setup] Use case definition created:', useCaseDef.use_case_name);
  } else {
    errors.push('Failed to create use case definition (may already exist)');
    console.log('[payi-setup] Use case definition may already exist');
  }

  // Create KPIs for the trail_analysis use case
  const kpisToCreate = [
    {
      kpi_name: 'analysis_success',
      description: 'Whether the trail analysis completed successfully',
      value_type: 'boolean' as const,
    },
    {
      kpi_name: 'difficulty_rating',
      description: 'Trail difficulty rating from 1-5',
      value_type: 'numeric' as const,
    },
    {
      kpi_name: 'image_count',
      description: 'Number of images analyzed',
      value_type: 'numeric' as const,
    },
  ];

  results.kpis = [];

  for (const kpiDef of kpisToCreate) {
    console.log(`[payi-setup] Creating KPI: ${kpiDef.kpi_name}...`);
    const kpi = await client.createKpi('trail_analysis', kpiDef);
    if (kpi) {
      (results.kpis as unknown[]).push(kpi);
      console.log(`[payi-setup] KPI created: ${kpi.kpi_name}`);
    } else {
      errors.push(`Failed to create KPI: ${kpiDef.kpi_name} (may already exist)`);
      console.log(`[payi-setup] KPI ${kpiDef.kpi_name} may already exist`);
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
