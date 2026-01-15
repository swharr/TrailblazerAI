import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     tags:
 *       - Vehicles
 *     summary: List user's vehicles
 *     description: Get all vehicle profiles for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 vehicles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
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

    const vehicles = await prisma.vehicleProfile.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ success: true, vehicles });
  } catch (error) {
    console.error('[vehicles] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     tags:
 *       - Vehicles
 *     summary: Create a new vehicle
 *     description: Add a new vehicle profile for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - make
 *               - model
 *             properties:
 *               name:
 *                 type: string
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               suspensionBrand:
 *                 type: string
 *               suspensionTravel:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Vehicle created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 vehicle:
 *                   $ref: '#/components/schemas/Vehicle'
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
    const { name, make, model, year, features, suspensionBrand, suspensionTravel, isDefault } = body;

    // Validate required fields
    if (!make || !model) {
      return NextResponse.json(
        { error: 'Make and model are required' },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.vehicleProfile.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the user's first vehicle - auto-set as default
    const existingCount = await prisma.vehicleProfile.count({
      where: { userId: user.id },
    });
    const shouldBeDefault = isDefault || existingCount === 0;

    const vehicle = await prisma.vehicleProfile.create({
      data: {
        userId: user.id,
        name: name || null,
        make,
        model,
        year: year ? parseInt(year, 10) : null,
        features: features || [],
        suspensionBrand: suspensionBrand || null,
        suspensionTravel: suspensionTravel || null,
        isDefault: shouldBeDefault,
      },
    });

    return NextResponse.json({ success: true, vehicle }, { status: 201 });
  } catch (error) {
    console.error('[vehicles] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
