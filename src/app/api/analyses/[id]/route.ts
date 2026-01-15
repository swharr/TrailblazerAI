import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

// Helper to verify analysis ownership
async function getAnalysisWithAuth(analysisId: string, userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
    select: { id: true },
  });

  if (!user) return null;

  const analysis = await prisma.trailAnalysis.findFirst({
    where: { id: analysisId, userId: user.id },
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
  });

  return analysis ? { user, analysis } : null;
}

// GET - Get specific analysis details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await getAnalysisWithAuth(id, session.user.email);

    if (!result) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const { analysis } = result;

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysis.id,
        trailName: analysis.trailName,
        trailLocation: analysis.trailLocation,
        notes: analysis.notes,
        difficulty: analysis.difficulty,
        trailType: analysis.trailType,
        conditions: analysis.conditions,
        hazards: analysis.hazards,
        recommendations: analysis.recommendations,
        bestFor: analysis.bestFor,
        summary: analysis.summary,
        rawResponse: analysis.rawResponse,
        vehicleSettings: analysis.vehicleSettings,
        fuelEstimate: analysis.fuelEstimate,
        emergencyComms: analysis.emergencyComms,
        createdAt: analysis.createdAt,
        vehicle: analysis.vehicle,
        metrics: analysis.metrics
          ? {
              model: analysis.metrics.model,
              inputTokens: analysis.metrics.inputTokens,
              outputTokens: analysis.metrics.outputTokens,
              cost: analysis.metrics.cost,
              latencyMs: analysis.metrics.latencyMs,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[analyses/id] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete analysis
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await getAnalysisWithAuth(id, session.user.email);

    if (!result) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Delete the analysis (metrics will cascade)
    await prisma.trailAnalysis.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Analysis deleted' });
  } catch (error) {
    console.error('[analyses/id] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
