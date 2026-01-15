import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Access shared route by token (no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const route = await prisma.plannedRoute.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        waypoints: true,
        totalDistance: true,
        estimatedTime: true,
        elevationGain: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found or link has expired' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      route: {
        ...route,
        createdBy: route.user?.name || 'Anonymous',
        user: undefined,
      },
    });
  } catch (error) {
    console.error('Failed to fetch shared route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
