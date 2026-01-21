'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhotoUpload } from './PhotoUpload';
import { GPSInput } from './GPSInput';
import {
  type TrailRecordInput,
  type TrailRecordPhotoInput,
  type Coordinates,
  type TrailRecord,
  TRAIL_TYPE_OPTIONS,
} from '@/lib/types/trail-recorder';
import { cn } from '@/lib/utils';

interface TrailRecordFormProps {
  initialData?: TrailRecord;
  mode: 'create' | 'edit';
}

export function TrailRecordForm({ initialData, mode }: TrailRecordFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(
    initialData?.date
      ? new Date(initialData.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [difficulty, setDifficulty] = useState<number | undefined>(
    initialData?.difficulty
  );
  const [trailType, setTrailType] = useState<string[]>(
    initialData?.trailType || []
  );
  const [distance, setDistance] = useState(
    initialData?.distance?.toString() || ''
  );
  const [duration, setDuration] = useState(
    initialData?.duration?.toString() || ''
  );
  const [photos, setPhotos] = useState<TrailRecordPhotoInput[]>(
    initialData?.photos?.map((p) => ({
      imageData: p.imageData,
      mimeType: p.mimeType,
      caption: p.caption,
      order: p.order,
      latitude: p.latitude,
      longitude: p.longitude,
      takenAt: p.takenAt,
    })) || []
  );
  const [startCoordinates, setStartCoordinates] = useState<
    Coordinates | undefined
  >(initialData?.startCoordinates);
  const [endCoordinates, setEndCoordinates] = useState<Coordinates | undefined>(
    initialData?.endCoordinates
  );

  const toggleTrailType = useCallback((type: string) => {
    setTrailType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim()) {
        setError('Trail name is required');
        return;
      }

      setIsSubmitting(true);

      const data: TrailRecordInput = {
        name: name.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        date: date ? new Date(date).toISOString() : undefined,
        difficulty,
        trailType,
        distance: distance ? parseFloat(distance) : undefined,
        duration: duration ? parseInt(duration, 10) : undefined,
        startCoordinates,
        endCoordinates,
        photos,
      };

      try {
        const url =
          mode === 'create'
            ? '/api/trail-recorder'
            : `/api/trail-recorder/${initialData?.id}`;

        const response = await fetch(url, {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!result.success) {
          setError(result.error || 'Failed to save trail record');
          return;
        }

        // Navigate to the record detail page
        router.push(`/trail-recorder/${result.data.id}`);
        router.refresh();
      } catch (err) {
        console.error('Failed to save trail record:', err);
        setError('Failed to save trail record. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      name,
      location,
      description,
      date,
      difficulty,
      trailType,
      distance,
      duration,
      startCoordinates,
      endCoordinates,
      photos,
      mode,
      initialData?.id,
      router,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Trail Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Trail Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Hidden Canyon Trail"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Moab, Utah"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes / Description</Label>
            <Textarea
              id="description"
              placeholder="Share your trail experience, conditions, tips..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trail Characteristics */}
      <Card>
        <CardHeader>
          <CardTitle>Trail Characteristics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Difficulty Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setDifficulty(difficulty === value ? undefined : value)
                  }
                  className="p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      difficulty !== undefined && value <= difficulty
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
              {difficulty && (
                <span className="ml-2 text-sm text-muted-foreground self-center">
                  {difficulty}/5
                </span>
              )}
            </div>
          </div>

          {/* Trail Type */}
          <div className="space-y-2">
            <Label>Trail Type</Label>
            <div className="flex flex-wrap gap-2">
              {TRAIL_TYPE_OPTIONS.map((type) => (
                <Badge
                  key={type}
                  variant={trailType.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleTrailType(type)}
                >
                  {type.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Distance and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Distance (miles)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g., 8.5"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                placeholder="e.g., 180"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload photos={photos} onChange={setPhotos} />
        </CardContent>
      </Card>

      {/* GPS Coordinates */}
      <Card>
        <CardHeader>
          <CardTitle>Location Data</CardTitle>
        </CardHeader>
        <CardContent>
          <GPSInput
            startCoordinates={startCoordinates}
            endCoordinates={endCoordinates}
            onStartChange={setStartCoordinates}
            onEndChange={setEndCoordinates}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Record Trail' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
