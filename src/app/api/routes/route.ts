import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface RouteWaypoint {
  lat: number;
  lng: number;
  elevation?: number;
  name?: string;
  type?: 'start' | 'end' | 'waypoint' | 'campsite' | 'water' | 'fuel' | 'hazard' | 'viewpoint';
}

// GET - List user's routes
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
    const status = url.searchParams.get('status'); // draft, planned, completed

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PlannedRouteWhereInput = {
      userId: user.id,
      ...(status && { status }),
    };

    // Get routes and total count
    const [routes, total] = await Promise.all([
      prisma.plannedRoute.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.plannedRoute.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      routes: routes.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        status: r.status,
        waypoints: r.waypoints as unknown as RouteWaypoint[],
        totalDistance: r.totalDistance,
        estimatedTime: r.estimatedTime,
        elevationGain: r.elevationGain,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[routes] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new route
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, waypoints, totalDistance, estimatedTime, elevationGain } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Route name is required' }, { status: 400 });
    }

    if (!waypoints || !Array.isArray(waypoints)) {
      return NextResponse.json({ error: 'Waypoints array is required' }, { status: 400 });
    }

    // Validate waypoints structure
    for (const wp of waypoints) {
      if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
        return NextResponse.json(
          { error: 'Each waypoint must have lat and lng numbers' },
          { status: 400 }
        );
      }
    }

    const route = await prisma.plannedRoute.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        waypoints: waypoints as unknown as Prisma.InputJsonValue,
        totalDistance: totalDistance || null,
        estimatedTime: estimatedTime || null,
        elevationGain: elevationGain || null,
        status: 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        name: route.name,
        description: route.description,
        status: route.status,
        waypoints: route.waypoints as unknown as RouteWaypoint[],
        totalDistance: route.totalDistance,
        estimatedTime: route.estimatedTime,
        elevationGain: route.elevationGain,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
      },
    });
  } catch (error) {
    console.error('[routes] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
