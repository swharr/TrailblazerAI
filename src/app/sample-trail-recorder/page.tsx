'use client';

import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Star,
  Clock,
  Route,
  BookOpen,
  ArrowRight,
  Lock,
  Mountain,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TrailRecord } from '@/lib/types/trail-recorder';

// Sample trail record data for demonstration
const SAMPLE_TRAIL_RECORD: TrailRecord & { creator: { name: string } } = {
  id: 'sample-1',
  userId: 'sample-user',
  name: 'Hidden Canyon Overlook',
  location: 'Moab, Utah',
  description: `Found this unmarked trail off Highway 128 about 15 miles from town. The trailhead is easy to miss - look for a small pullout just past mile marker 15.

The first 2 miles are fairly easy dirt road, but it gets interesting after that! There's a rocky climb section around mile 3 that required some careful line selection. My Tacoma handled it well with the lockers engaged.

The views at the overlook are absolutely stunning - you can see the Colorado River winding through the canyon below. Definitely worth the effort!

Tips for others:
- Bring plenty of water, there's no shade
- Air down to 18-20 psi for the rocky section
- Best in the morning before it gets too hot
- Saw some mountain bikers on the lower section, be courteous`,
  date: '2024-10-15T10:30:00.000Z',
  difficulty: 3,
  trailType: ['dirt', 'rock', 'sand'],
  distance: 8.5,
  duration: 180, // 3 hours
  startCoordinates: {
    latitude: 38.6142,
    longitude: -109.5214,
    elevation: 4200,
  },
  endCoordinates: {
    latitude: 38.6298,
    longitude: -109.4987,
    elevation: 5100,
  },
  photos: [], // We'll show placeholder images
  isPublic: true,
  shareToken: 'sample-token',
  createdAt: '2024-10-15T18:45:00.000Z',
  updatedAt: '2024-10-15T18:45:00.000Z',
  creator: {
    name: 'TrailBlazer Demo',
  },
};

// Sample photo placeholders (since we don't have actual images)
const SAMPLE_PHOTOS = [
  { caption: 'Trail entrance off Highway 128', placeholder: 'Dusty trail head with sagebrush' },
  { caption: 'Rocky climb section at mile 3', placeholder: 'Technical rock obstacle' },
  { caption: 'Canyon view from the overlook', placeholder: 'Stunning canyon panorama' },
  { caption: 'My Tacoma at the summit', placeholder: 'Vehicle parked at scenic overlook' },
];

export default function SampleTrailRecorderPage() {
  const record = SAMPLE_TRAIL_RECORD;

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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          Sample Trail Record
        </Badge>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-trail-green" />
          Trail Recorder Preview
        </h1>
        <p className="text-muted-foreground">
          See how Trail Recorder helps you document and share your trail experiences.
          This example shows a recorded trail run near Moab, Utah.
        </p>
      </div>

      {/* Sample Trail Record Display */}
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold">{record.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Recorded by {record.creator.name}
          </p>
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

        {/* Photos (placeholders) */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SAMPLE_PHOTOS.map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square relative rounded-lg overflow-hidden bg-muted"
                >
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">
                      {photo.placeholder}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                    {photo.caption}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Photos would appear here when you record your own trails
            </p>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Trail Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{record.description}</p>
          </CardContent>
        </Card>

        {/* GPS Coordinates */}
        <Card>
          <CardHeader>
            <CardTitle>GPS Coordinates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {record.startCoordinates && (
              <div>
                <span className="text-sm font-medium">Start Point:</span>
                <p className="text-sm text-muted-foreground">
                  {record.startCoordinates.latitude.toFixed(6)},{' '}
                  {record.startCoordinates.longitude.toFixed(6)}
                  {record.startCoordinates.elevation &&
                    ` (${record.startCoordinates.elevation.toFixed(0)} ft)`}
                </p>
              </div>
            )}
            {record.endCoordinates && (
              <div>
                <span className="text-sm font-medium">End Point:</span>
                <p className="text-sm text-muted-foreground">
                  {record.endCoordinates.latitude.toFixed(6)},{' '}
                  {record.endCoordinates.longitude.toFixed(6)}
                  {record.endCoordinates.elevation &&
                    ` (${record.endCoordinates.elevation.toFixed(0)} ft)`}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              GPS coordinates help others find this trail and can be exported to mapping apps.
            </p>
          </CardContent>
        </Card>

        {/* Feature Highlights */}
        <Card className="bg-gradient-to-br from-trail-tan/20 to-trail-cream/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mountain className="h-5 w-5" />
              Trail Recorder Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-trail-green">✓</span>
                <span>Document unnamed or lesser-known trails for the community</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trail-green">✓</span>
                <span>Upload multiple photos with captions and GPS metadata</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trail-green">✓</span>
                <span>Record difficulty, terrain type, distance, and duration</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trail-green">✓</span>
                <span>Add GPS coordinates using your device&apos;s location</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trail-green">✓</span>
                <span>Share your trail records with shareable links</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trail-green">✓</span>
                <span>Build your personal trail diary over time</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="mt-8 bg-gradient-to-br from-trail-green/10 to-trail-brown/10 border-trail-green/20">
        <CardContent className="py-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-trail-green mb-4" />
          <h2 className="text-xl font-bold mb-2">Ready to Record Your Trails?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Sign up to start documenting your trail adventures. Create your personal
            trail diary, upload photos, and share your experiences with the community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-trail-green hover:bg-trail-green/90">
              <Link href="/auth/signup">
                Create Free Account
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/signin">
                Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
