import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getApiSession, unauthorizedResponse } from '@/lib/api-auth';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().max(500).optional().nullable(),
});

// GET - Get current user profile
export async function GET() {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        // Include whether user has password (for showing password change option)
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        hasPassword: !!user.passwordHash,
      },
    });
  } catch (error) {
    console.error('Failed to get profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update user profile (name, image)
export async function PATCH(request: Request) {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, image } = parsed.data;

    // Build update object only with provided fields
    const updateData: { name?: string; image?: string | null } = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (image !== undefined) {
      updateData.image = image?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
