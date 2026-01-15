import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getApiSession, unauthorizedResponse } from '@/lib/api-auth';

// Generate a URL-friendly share token
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// POST - Generate or regenerate share token
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // Check route exists and belongs to user
    const route = await prisma.plannedRoute.findUnique({
      where: { id },
      select: { userId: true, shareToken: true },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (route.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Generate new share token
    const shareToken = generateShareToken();

    const updatedRoute = await prisma.plannedRoute.update({
      where: { id },
      data: {
        shareToken,
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        shareToken: true,
        isPublic: true,
      },
    });

    return NextResponse.json({
      success: true,
      route: updatedRoute,
      shareUrl: `/routes/shared/${shareToken}`,
    });
  } catch (error) {
    console.error('Failed to generate share token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Revoke share token
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // Check route exists and belongs to user
    const route = await prisma.plannedRoute.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (route.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Remove share token and make private
    const updatedRoute = await prisma.plannedRoute.update({
      where: { id },
      data: {
        shareToken: null,
        isPublic: false,
      },
      select: {
        id: true,
        name: true,
        shareToken: true,
        isPublic: true,
      },
    });

    return NextResponse.json({
      success: true,
      route: updatedRoute,
    });
  } catch (error) {
    console.error('Failed to revoke share token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
