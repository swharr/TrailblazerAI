'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrailRecordForm } from '@/components/trail-recorder/TrailRecordForm';
import type { TrailRecord, Coordinates, TrailRecordPhoto } from '@/lib/types/trail-recorder';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface RecordResponse {
  success: boolean;
  data?: TrailRecord & { creator?: { name: string } };
  error?: string;
}

export default function EditTrailRecordPage({ params }: PageProps) {
  const { id } = use(params);
  const [record, setRecord] = useState<TrailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecord() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/trail-recorder/${id}`);
        const data: RecordResponse = await response.json();

        if (data.success && data.data) {
          // If there's a creator field, user doesn't own this record
          if (data.data.creator) {
            setError('You can only edit your own trail records');
            return;
          }

          // Transform the response to match our types
          const transformedRecord: TrailRecord = {
            id: data.data.id,
            userId: data.data.userId,
            name: data.data.name,
            location: data.data.location,
            description: data.data.description,
            date: data.data.date,
            difficulty: data.data.difficulty,
            trailType: data.data.trailType,
            distance: data.data.distance,
            duration: data.data.duration,
            startCoordinates: data.data.startCoordinates as Coordinates | undefined,
            endCoordinates: data.data.endCoordinates as Coordinates | undefined,
            gpsTrack: data.data.gpsTrack as Coordinates[] | undefined,
            photos: data.data.photos as TrailRecordPhoto[],
            isPublic: data.data.isPublic,
            shareToken: data.data.shareToken,
            createdAt: data.data.createdAt,
            updatedAt: data.data.updatedAt,
          };
          setRecord(transformedRecord);
        } else {
          setError(data.error || 'Failed to load trail record');
        }
      } catch (err) {
        setError('Failed to load trail record');
        console.error('Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecord();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/trail-recorder">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trail Recorder
            </Link>
          </Button>
        </div>

        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error || 'Trail record not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/trail-recorder/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trail Record
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit Trail Record</h1>

      <TrailRecordForm initialData={record} mode="edit" />
    </div>
  );
}
