import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Star,
  Clock,
  Route,
  Mountain,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Coordinates } from '@/lib/types/trail-recorder';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedTrailPage({ params }: PageProps) {
  const { token } = await params;

  // Look up the trail record by share token
  const record = await prisma.trailRecord.findUnique({
    where: { shareToken: token },
    include: {
      photos: {
        orderBy: { order: 'asc' },
      },
      user: {
        select: { name: true },
      },
    },
  });

  if (!record || !record.isPublic) {
    notFound();
  }

  const formattedDate = new Date(record.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const startCoords = record.startCoordinates as Coordinates | null;
  const endCoords = record.endCoordinates as Coordinates | null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto py-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-trail-green" />
            <span className="font-bold">TrailBlazer AI</span>
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold">{record.name}</h1>
            {record.user.name && (
              <p className="text-sm text-muted-foreground mt-1">
                Recorded by {record.user.name}
              </p>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {record.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {record.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
            {record.distance && (
              <span className="flex items-center gap-1">
                <Route className="h-4 w-4" />
                {record.distance.toFixed(1)} miles
              </span>
            )}
            {record.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(record.duration)}
              </span>
            )}
          </div>

          {/* Difficulty and trail type */}
          <div className="flex flex-wrap items-center gap-4">
            {record.difficulty && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground mr-1">
                  Difficulty:
                </span>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={`h-5 w-5 ${
                      value <= record.difficulty!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}

            {record.trailType.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {record.trailType.map((type) => (
                  <Badge key={type} variant="secondary" className="capitalize">
                    {type.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Photos */}
          {record.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {record.photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="aspect-square relative rounded-lg overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageData}
                        alt={photo.caption || `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {record.description && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{record.description}</p>
              </CardContent>
            </Card>
          )}

          {/* GPS Coordinates */}
          {(startCoords || endCoords) && (
            <Card>
              <CardHeader>
                <CardTitle>GPS Coordinates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {startCoords && (
                  <div>
                    <span className="text-sm font-medium">Start Point:</span>
                    <p className="text-sm text-muted-foreground">
                      {startCoords.latitude.toFixed(6)},{' '}
                      {startCoords.longitude.toFixed(6)}
                      {startCoords.elevation &&
                        ` (${startCoords.elevation.toFixed(0)}m)`}
                    </p>
                  </div>
                )}
                {endCoords && (
                  <div>
                    <span className="text-sm font-medium">End Point:</span>
                    <p className="text-sm text-muted-foreground">
                      {endCoords.latitude.toFixed(6)},{' '}
                      {endCoords.longitude.toFixed(6)}
                      {endCoords.elevation &&
                        ` (${endCoords.elevation.toFixed(0)}m)`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-8 border-t">
            <p>
              Shared via{' '}
              <Link href="/" className="text-primary hover:underline">
                TrailBlazer AI
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
