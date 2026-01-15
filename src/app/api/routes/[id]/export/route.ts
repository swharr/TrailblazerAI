import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateGPX, type GpxWaypoint } from '@/lib/gpx-export';

type RouteContext = { params: Promise<{ id: string }> };

// GET - Export route as GPX file
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    const { id } = await context.params;

    // Find the route
    const route = await prisma.plannedRoute.findUnique({
      where: { id },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Check authorization - demo routes are public, others need owner
    if (!route.isDemo) {
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true },
      });

      if (!user || route.userId !== user.id) {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }
    }

    // Generate GPX
    const waypoints = route.waypoints as unknown as GpxWaypoint[];
    const gpx = generateGPX({
      name: route.name,
      description: route.description || undefined,
      waypoints,
      author: 'TrailBlazer AI',
      includeTrack: true,
    });

    // Create filename (sanitize route name)
    const sanitizedName = route.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${sanitizedName || 'route'}.gpx`;

    // Return as downloadable GPX file
    return new NextResponse(gpx, {
      status: 200,
      headers: {
        'Content-Type': 'application/gpx+xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[routes/id/export] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
