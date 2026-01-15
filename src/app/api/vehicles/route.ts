import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - List user's vehicles
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

// POST - Create new vehicle
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
