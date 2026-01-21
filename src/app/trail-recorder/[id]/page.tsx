'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrailRecordDetail } from '@/components/trail-recorder/TrailRecordDetail';
import type { TrailRecord, Coordinates, TrailRecordPhoto } from '@/lib/types/trail-recorder';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface RecordResponse {
  success: boolean;
  data?: TrailRecord & { creator?: { name: string } };
  error?: string;
}

export default function TrailRecordDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [record, setRecord] = useState<(TrailRecord & { creator?: { name: string } }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function fetchRecord() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/trail-recorder/${id}`);
        const data: RecordResponse = await response.json();

        if (data.success && data.data) {
          // Transform the response to match our types
          const transformedRecord: TrailRecord & { creator?: { name: string } } = {
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
            creator: data.data.creator,
          };
          setRecord(transformedRecord);
          // If creator field is not present, user is the owner
          setIsOwner(!data.data.creator);
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
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
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
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/trail-recorder">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trail Recorder
          </Link>
        </Button>
      </div>

      <TrailRecordDetail record={record} isOwner={isOwner} />
    </div>
  );
}
