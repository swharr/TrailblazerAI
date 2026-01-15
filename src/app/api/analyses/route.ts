import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - List user's past analyses
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const vehicleId = url.searchParams.get('vehicleId');

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      userId: user.id,
      ...(vehicleId && { vehicleId }),
    };

    // Get analyses and total count
    const [analyses, total] = await Promise.all([
      prisma.trailAnalysis.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              name: true,
              make: true,
              model: true,
              year: true,
            },
          },
          metrics: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trailAnalysis.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      analyses: analyses.map((a) => ({
        id: a.id,
        trailName: a.trailName,
        trailLocation: a.trailLocation,
        difficulty: a.difficulty,
        trailType: a.trailType,
        conditions: a.conditions,
        hazards: a.hazards,
        recommendations: a.recommendations,
        bestFor: a.bestFor,
        summary: a.summary,
        createdAt: a.createdAt,
        vehicle: a.vehicle,
        metrics: a.metrics
          ? {
              model: a.metrics.model,
              cost: a.metrics.cost,
              latencyMs: a.metrics.latencyMs,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[analyses] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
