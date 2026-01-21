import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import type { TrailRecordInput, Coordinates } from '@/lib/types/trail-recorder';
import { Prisma } from '@prisma/client';

/** Maximum photos per trail record */
const MAX_PHOTOS = 10;

/** Maximum photo size (10MB base64) */
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trail-recorder/[id] - Get a single trail record
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // Check for share token in query params (for public access)
  const searchParams = request.nextUrl.searchParams;
  const shareToken = searchParams.get('token');

  // Try to get authenticated user
  const { session } = await requireAuth();
  const userEmail = session?.user?.email?.toLowerCase();

  try {
    const record = await prisma.trailRecord.findUnique({
      where: { id },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Trail record not found' },
        { status: 404 }
      );
    }

    // Check access: owner, public with token, or public without token
    const isOwner = userEmail && record.user.email.toLowerCase() === userEmail;
    const hasValidToken = shareToken && record.shareToken === shareToken;
    const isPublicAccess = record.isPublic;

    if (!isOwner && !hasValidToken && !isPublicAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        userId: record.userId,
        name: record.name,
        location: record.location,
        description: record.description,
        date: record.date.toISOString(),
        difficulty: record.difficulty,
        trailType: record.trailType,
        distance: record.distance,
        duration: record.duration,
        startCoordinates: record.startCoordinates as Coordinates | null,
        endCoordinates: record.endCoordinates as Coordinates | null,
        gpsTrack: record.gpsTrack as Coordinates[] | null,
        photos: record.photos.map((p) => ({
          id: p.id,
          trailRecordId: p.trailRecordId,
          imageData: p.imageData,
          mimeType: p.mimeType,
          caption: p.caption,
          order: p.order,
          latitude: p.latitude,
          longitude: p.longitude,
          takenAt: p.takenAt?.toISOString(),
          createdAt: p.createdAt.toISOString(),
        })),
        isPublic: record.isPublic,
        shareToken: isOwner ? record.shareToken : undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        // Include creator info for public views
        creator: !isOwner
          ? {
              name: record.user.name || 'Anonymous',
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error('[trail-recorder] Error fetching record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trail record' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trail-recorder/[id] - Update a trail record
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { id } = await params;

  try {
    const body = (await request.json()) as TrailRecordInput;

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Trail name is required' },
        { status: 400 }
      );
    }

    // Validate photos
    if (body.photos && body.photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_PHOTOS} photos allowed` },
        { status: 400 }
      );
    }

    if (body.photos) {
      for (let i = 0; i < body.photos.length; i++) {
        const photo = body.photos[i];
        if (photo.imageData.length > MAX_PHOTO_SIZE) {
          return NextResponse.json(
            { success: false, error: `Photo ${i + 1} exceeds maximum size of 10MB` },
            { status: 400 }
          );
        }
      }
    }

    // Validate difficulty
    if (body.difficulty !== undefined && (body.difficulty < 1 || body.difficulty > 5)) {
      return NextResponse.json(
        { success: false, error: 'Difficulty must be between 1 and 5' },
        { status: 400 }
      );
    }

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
        { success: false, error: 'You can only edit your own trail records' },
        { status: 403 }
      );
    }

    // Update the record - delete existing photos and create new ones
    const record = await prisma.$transaction(async (tx) => {
      // Delete existing photos
      await tx.trailRecordPhoto.deleteMany({
        where: { trailRecordId: id },
      });

      // Update record and create new photos
      return tx.trailRecord.update({
        where: { id },
        data: {
          name: body.name.trim(),
          location: body.location?.trim() || null,
          description: body.description?.trim() || null,
          date: body.date ? new Date(body.date) : undefined,
          difficulty: body.difficulty || null,
          trailType: body.trailType || [],
          distance: body.distance || null,
          duration: body.duration || null,
          startCoordinates: body.startCoordinates
            ? (body.startCoordinates as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          endCoordinates: body.endCoordinates
            ? (body.endCoordinates as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          gpsTrack: body.gpsTrack
            ? (body.gpsTrack as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          photos: body.photos
            ? {
                create: body.photos.map((photo, index) => ({
                  imageData: photo.imageData,
                  mimeType: photo.mimeType,
                  caption: photo.caption || null,
                  order: photo.order ?? index,
                  latitude: photo.latitude || null,
                  longitude: photo.longitude || null,
                  takenAt: photo.takenAt ? new Date(photo.takenAt) : null,
                })),
              }
            : undefined,
        },
        include: {
          photos: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        userId: record.userId,
        name: record.name,
        location: record.location,
        description: record.description,
        date: record.date.toISOString(),
        difficulty: record.difficulty,
        trailType: record.trailType,
        distance: record.distance,
        duration: record.duration,
        startCoordinates: record.startCoordinates as Coordinates | null,
        endCoordinates: record.endCoordinates as Coordinates | null,
        gpsTrack: record.gpsTrack as Coordinates[] | null,
        photos: record.photos.map((p) => ({
          id: p.id,
          trailRecordId: p.trailRecordId,
          imageData: p.imageData,
          mimeType: p.mimeType,
          caption: p.caption,
          order: p.order,
          latitude: p.latitude,
          longitude: p.longitude,
          takenAt: p.takenAt?.toISOString(),
          createdAt: p.createdAt.toISOString(),
        })),
        isPublic: record.isPublic,
        shareToken: record.shareToken,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[trail-recorder] Error updating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update trail record' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trail-recorder/[id] - Delete a trail record
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
        { success: false, error: 'You can only delete your own trail records' },
        { status: 403 }
      );
    }

    // Delete the record (photos cascade delete)
    await prisma.trailRecord.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Trail record deleted successfully',
    });
  } catch (error) {
    console.error('[trail-recorder] Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete trail record' },
      { status: 500 }
    );
  }
}
