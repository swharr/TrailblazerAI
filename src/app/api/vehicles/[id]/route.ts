import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

// Helper to verify vehicle ownership
async function getVehicleWithAuth(vehicleId: string, userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
    select: { id: true },
  });

  if (!user) return null;

  const vehicle = await prisma.vehicleProfile.findFirst({
    where: { id: vehicleId, userId: user.id },
  });

  return vehicle ? { user, vehicle } : null;
}

// GET - Get specific vehicle
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await getVehicleWithAuth(id, session.user.email);

    if (!result) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, vehicle: result.vehicle });
  } catch (error) {
    console.error('[vehicles/id] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update vehicle
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await getVehicleWithAuth(id, session.user.email);

    if (!result) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, make, model, year, features, suspensionBrand, suspensionTravel, isDefault } = body;

    // If setting as default, unset other defaults first
    if (isDefault && !result.vehicle.isDefault) {
      await prisma.vehicleProfile.updateMany({
        where: { userId: result.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedVehicle = await prisma.vehicleProfile.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(make !== undefined && { make }),
        ...(model !== undefined && { model }),
        ...(year !== undefined && { year: year ? parseInt(year, 10) : null }),
        ...(features !== undefined && { features }),
        ...(suspensionBrand !== undefined && { suspensionBrand }),
        ...(suspensionTravel !== undefined && { suspensionTravel }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ success: true, vehicle: updatedVehicle });
  } catch (error) {
    console.error('[vehicles/id] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete vehicle
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await getVehicleWithAuth(id, session.user.email);

    if (!result) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const wasDefault = result.vehicle.isDefault;

    await prisma.vehicleProfile.delete({ where: { id } });

    // If deleted vehicle was default, set another as default
    if (wasDefault) {
      const anotherVehicle = await prisma.vehicleProfile.findFirst({
        where: { userId: result.user.id },
        orderBy: { updatedAt: 'desc' },
      });

      if (anotherVehicle) {
        await prisma.vehicleProfile.update({
          where: { id: anotherVehicle.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    console.error('[vehicles/id] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
