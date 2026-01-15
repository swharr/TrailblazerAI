import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { RouteWaypoint } from '../route';

type RouteContext = { params: Promise<{ id: string }> };

// Helper to verify route ownership (or demo route access)
async function getRouteWithAuth(routeId: string, userEmail?: string) {
  const route = await prisma.plannedRoute.findUnique({
    where: { id: routeId },
  });

  if (!route) return null;

  // Demo routes are accessible to anyone
  if (route.isDemo) {
    return { route, isOwner: false };
  }

  // Non-demo routes require auth
  if (!userEmail) return null;

  const user = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
    select: { id: true },
  });

  if (!user || route.userId !== user.id) return null;

  return { route, isOwner: true };
}

// GET - Get specific route details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    const { id } = await context.params;

    const result = await getRouteWithAuth(id, session?.user?.email || undefined);

    if (!result) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const { route } = result;

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        name: route.name,
        description: route.description,
        status: route.status,
        isDemo: route.isDemo,
        waypoints: route.waypoints as unknown as RouteWaypoint[],
        totalDistance: route.totalDistance,
        estimatedTime: route.estimatedTime,
        elevationGain: route.elevationGain,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
      },
    });
  } catch (error) {
    console.error('[routes/id] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update route
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await getRouteWithAuth(id, session.user.email);

    if (!result || !result.isOwner) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, status, waypoints, totalDistance, estimatedTime, elevationGain } =
      body;

    // Build update data
    const updateData: Prisma.PlannedRouteUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Route name cannot be empty' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'planned', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (waypoints !== undefined) {
      if (!Array.isArray(waypoints)) {
        return NextResponse.json({ error: 'Waypoints must be an array' }, { status: 400 });
      }
      for (const wp of waypoints) {
        if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
          return NextResponse.json(
            { error: 'Each waypoint must have lat and lng numbers' },
            { status: 400 }
          );
        }
      }
      updateData.waypoints = waypoints as unknown as Prisma.InputJsonValue;
    }

    if (totalDistance !== undefined) {
      updateData.totalDistance = totalDistance;
    }

    if (estimatedTime !== undefined) {
      updateData.estimatedTime = estimatedTime;
    }

    if (elevationGain !== undefined) {
      updateData.elevationGain = elevationGain;
    }

    const route = await prisma.plannedRoute.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        name: route.name,
        description: route.description,
        status: route.status,
        isDemo: route.isDemo,
        waypoints: route.waypoints as unknown as RouteWaypoint[],
        totalDistance: route.totalDistance,
        estimatedTime: route.estimatedTime,
        elevationGain: route.elevationGain,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
      },
    });
  } catch (error) {
    console.error('[routes/id] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete route
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await getRouteWithAuth(id, session.user.email);

    if (!result || !result.isOwner) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    await prisma.plannedRoute.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Route deleted' });
  } catch (error) {
    console.error('[routes/id] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
