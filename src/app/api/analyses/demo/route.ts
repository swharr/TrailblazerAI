import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get the demo analysis (no auth required)
export async function GET() {
  try {
    // Find the first demo analysis
    const demoAnalysis = await prisma.trailAnalysis.findFirst({
      where: { isDemo: true },
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            make: true,
            model: true,
            year: true,
            features: true,
            suspensionBrand: true,
            suspensionTravel: true,
          },
        },
        metrics: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!demoAnalysis) {
      return NextResponse.json({ error: 'Demo analysis not available' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        id: demoAnalysis.id,
        isDemo: true,
        trailName: demoAnalysis.trailName,
        trailLocation: demoAnalysis.trailLocation,
        notes: demoAnalysis.notes,
        difficulty: demoAnalysis.difficulty,
        trailType: demoAnalysis.trailType,
        conditions: demoAnalysis.conditions,
        hazards: demoAnalysis.hazards,
        recommendations: demoAnalysis.recommendations,
        bestFor: demoAnalysis.bestFor,
        summary: demoAnalysis.summary,
        vehicleSettings: demoAnalysis.vehicleSettings,
        fuelEstimate: demoAnalysis.fuelEstimate,
        emergencyComms: demoAnalysis.emergencyComms,
        createdAt: demoAnalysis.createdAt,
        vehicle: demoAnalysis.vehicle,
        metrics: demoAnalysis.metrics
          ? {
              model: demoAnalysis.metrics.model,
              inputTokens: demoAnalysis.metrics.inputTokens,
              outputTokens: demoAnalysis.metrics.outputTokens,
              latencyMs: demoAnalysis.metrics.latencyMs,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[analyses/demo] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
