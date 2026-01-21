'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Star,
  Clock,
  Route,
  Share2,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TrailRecord } from '@/lib/types/trail-recorder';

interface TrailRecordDetailProps {
  record: TrailRecord & { creator?: { name: string } };
  isOwner: boolean;
}

export function TrailRecordDetail({ record, isOwner }: TrailRecordDetailProps) {
  const router = useRouter();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trail-recorder/${record.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/trail-recorder');
        router.refresh();
      } else {
        console.error('Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [record.id, router]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const response = await fetch(`/api/trail-recorder/${record.id}/share`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setShareUrl(result.data.shareUrl);
        setShowShareDialog(true);
      }
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsSharing(false);
    }
  }, [record.id]);

  const handleRevokeShare = useCallback(async () => {
    try {
      await fetch(`/api/trail-recorder/${record.id}/share`, {
        method: 'DELETE',
      });
      setShareUrl(null);
      setShowShareDialog(false);
      router.refresh();
    } catch (error) {
      console.error('Revoke share error:', error);
    }
  }, [record.id, router]);

  const copyShareUrl = useCallback(async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }, [shareUrl]);

  const navigatePhoto = useCallback(
    (direction: 'prev' | 'next') => {
      if (selectedPhotoIndex === null) return;

      const newIndex =
        direction === 'next'
          ? (selectedPhotoIndex + 1) % record.photos.length
          : (selectedPhotoIndex - 1 + record.photos.length) %
            record.photos.length;

      setSelectedPhotoIndex(newIndex);
    },
    [selectedPhotoIndex, record.photos.length]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{record.name}</h1>
          {record.creator && !isOwner && (
            <p className="text-sm text-muted-foreground mt-1">
              Recorded by {record.creator.name}
            </p>
          )}
        </div>

        {isOwner && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Share2 className="h-4 w-4 mr-1" />
              )}
              {record.isPublic ? 'Manage Share' : 'Share'}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/trail-recorder/${record.id}/edit`}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
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
                  className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedPhotoIndex(index)}
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
      {(record.startCoordinates || record.endCoordinates) && (
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
                    ` (${record.startCoordinates.elevation.toFixed(0)}m)`}
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
                    ` (${record.endCoordinates.elevation.toFixed(0)}m)`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Photo Lightbox */}
      <Dialog
        open={selectedPhotoIndex !== null}
        onOpenChange={() => setSelectedPhotoIndex(null)}
      >
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          {selectedPhotoIndex !== null && record.photos[selectedPhotoIndex] && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
                onClick={() => setSelectedPhotoIndex(null)}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation arrows */}
              {record.photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
                    onClick={() => navigatePhoto('prev')}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
                    onClick={() => navigatePhoto('next')}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.photos[selectedPhotoIndex].imageData}
                alt={
                  record.photos[selectedPhotoIndex].caption ||
                  `Photo ${selectedPhotoIndex + 1}`
                }
                className="max-h-[80vh] w-auto mx-auto"
              />

              {record.photos[selectedPhotoIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-center">
                  {record.photos[selectedPhotoIndex].caption}
                </div>
              )}

              {/* Photo counter */}
              <div className="absolute top-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                {selectedPhotoIndex + 1} / {record.photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Trail Record</DialogTitle>
            <DialogDescription>
              Anyone with this link can view your trail record.
            </DialogDescription>
          </DialogHeader>

          {shareUrl && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
              />
              <Button variant="outline" size="icon" onClick={copyShareUrl}>
                {copiedUrl ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {record.isPublic && (
              <Button variant="destructive" onClick={handleRevokeShare}>
                Revoke Access
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trail Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              trail record and all associated photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
