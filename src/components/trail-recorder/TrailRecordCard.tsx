'use client';

import Link from 'next/link';
import { MapPin, Calendar, Star, Image as ImageIcon, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TrailRecordListItem } from '@/lib/types/trail-recorder';

interface TrailRecordCardProps {
  record: TrailRecordListItem;
}

export function TrailRecordCard({ record }: TrailRecordCardProps) {
  const formattedDate = new Date(record.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/trail-recorder/${record.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Thumbnail placeholder */}
            <div className="sm:w-32 sm:h-32 h-40 bg-muted flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            </div>

            {/* Content */}
            <div className="p-4 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg truncate">{record.name}</h3>
                {record.isPublic && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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

                {record.photoCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    {record.photoCount} photo{record.photoCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-4">
                {record.difficulty && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`h-4 w-4 ${
                          value <= record.difficulty!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {record.distance && (
                  <span className="text-sm text-muted-foreground">
                    {record.distance.toFixed(1)} mi
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
