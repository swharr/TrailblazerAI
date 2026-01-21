import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import type { TrailRecordInput, TrailRecordListItem, Coordinates } from '@/lib/types/trail-recorder';
import { Prisma } from '@prisma/client';

/** Maximum photos per trail record */
const MAX_PHOTOS = 10;

/** Maximum photo size (10MB base64) */
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

/**
 * GET /api/trail-recorder - List user's trail records
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

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

    const [records, total] = await Promise.all([
      prisma.trailRecord.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          photos: {
            take: 1,
            orderBy: { order: 'asc' },
            select: {
              imageData: true,
              mimeType: true,
            },
          },
          _count: {
            select: { photos: true },
          },
        },
      }),
      prisma.trailRecord.count({ where: { userId: user.id } }),
    ]);

    const items: TrailRecordListItem[] = records.map((record) => ({
      id: record.id,
      name: record.name,
      location: record.location || undefined,
      date: record.date.toISOString(),
      difficulty: record.difficulty || undefined,
      distance: record.distance || undefined,
      photoCount: record._count.photos,
      isPublic: record.isPublic,
      thumbnailUrl: record.photos[0]
        ? `data:${record.photos[0].mimeType};base64,${record.photos[0].imageData.substring(0, 100)}...`
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[trail-recorder] Error listing records:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list trail records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trail-recorder - Create a new trail record
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

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

    // Create the trail record with photos
    const record = await prisma.trailRecord.create({
      data: {
        userId: user.id,
        name: body.name.trim(),
        location: body.location?.trim() || null,
        description: body.description?.trim() || null,
        date: body.date ? new Date(body.date) : new Date(),
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
    console.error('[trail-recorder] Error creating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create trail record' },
      { status: 500 }
    );
  }
}
