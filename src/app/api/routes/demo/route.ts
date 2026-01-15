import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { RouteWaypoint } from '../route';

// GET - Get the demo route (no auth required)
export async function GET() {
  try {
    // Find the first demo route
    const demoRoute = await prisma.plannedRoute.findFirst({
      where: { isDemo: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!demoRoute) {
      return NextResponse.json({ error: 'Demo route not available' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      route: {
        id: demoRoute.id,
        name: demoRoute.name,
        description: demoRoute.description,
        status: demoRoute.status,
        isDemo: true,
        waypoints: demoRoute.waypoints as unknown as RouteWaypoint[],
        totalDistance: demoRoute.totalDistance,
        estimatedTime: demoRoute.estimatedTime,
        elevationGain: demoRoute.elevationGain,
        createdAt: demoRoute.createdAt,
        updatedAt: demoRoute.updatedAt,
      },
    });
  } catch (error) {
    console.error('[routes/demo] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
