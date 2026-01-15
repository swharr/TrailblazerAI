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

/**
 * @swagger
 * /api/routes:
 *   get:
 *     tags:
 *       - Routes
 *     summary: List user's routes
 *     description: Get all planned routes for the authenticated user with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, planned, completed]
 *         description: Filter by route status
 *     responses:
 *       200:
 *         description: List of routes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 routes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlannedRoute'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/routes:
 *   post:
 *     tags:
 *       - Routes
 *     summary: Create a new route
 *     description: Create a new planned route with waypoints
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - waypoints
 *             properties:
 *               name:
 *                 type: string
 *                 description: Route name
 *               description:
 *                 type: string
 *                 description: Route description
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - lat
 *                     - lng
 *                   properties:
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *                     elevation:
 *                       type: number
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [start, end, waypoint, campsite, water, fuel, hazard, viewpoint]
 *               totalDistance:
 *                 type: number
 *               estimatedTime:
 *                 type: number
 *               elevationGain:
 *                 type: number
 *     responses:
 *       200:
 *         description: Route created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 route:
 *                   $ref: '#/components/schemas/PlannedRoute'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
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
