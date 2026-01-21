import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Generate a unique share token
 */
function generateShareToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * POST /api/trail-recorder/[id]/share - Generate a share link
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email?.toLowerCase() || '' },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const existingRecord = await prisma.trailRecord.findUnique({
      where: { id },
      select: { userId: true, shareToken: true },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Trail record not found' },
        { status: 404 }
      );
    }

    if (existingRecord.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only share your own trail records' },
        { status: 403 }
      );
    }

    // If already has a share token, return existing
    if (existingRecord.shareToken) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3636';
      return NextResponse.json({
        success: true,
        data: {
          shareToken: existingRecord.shareToken,
          shareUrl: `${baseUrl}/share/trail/${existingRecord.shareToken}`,
        },
      });
    }

    // Generate new share token and make public
    const shareToken = generateShareToken();
    await prisma.trailRecord.update({
      where: { id },
      data: {
        shareToken,
        isPublic: true,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3636';
    return NextResponse.json({
      success: true,
      data: {
        shareToken,
        shareUrl: `${baseUrl}/share/trail/${shareToken}`,
      },
    });
  } catch (error) {
    console.error('[trail-recorder] Error generating share link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate share link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trail-recorder/[id]/share - Revoke share link
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email?.toLowerCase() || '' },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const existingRecord = await prisma.trailRecord.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Trail record not found' },
        { status: 404 }
      );
    }

    if (existingRecord.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only modify your own trail records' },
        { status: 403 }
      );
    }

    // Remove share token and make private
    await prisma.trailRecord.update({
      where: { id },
      data: {
        shareToken: null,
        isPublic: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
    });
  } catch (error) {
    console.error('[trail-recorder] Error revoking share link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
