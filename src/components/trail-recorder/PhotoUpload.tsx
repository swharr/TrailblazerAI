'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, GripVertical, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TrailRecordPhotoInput } from '@/lib/types/trail-recorder';

interface PhotoUploadProps {
  photos: TrailRecordPhotoInput[];
  onChange: (photos: TrailRecordPhotoInput[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
}

/** Maximum dimension for resizing images */
const MAX_DIMENSION = 2000;

/**
 * Resize image to max dimensions while maintaining aspect ratio
 */
async function resizeImage(file: File, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      let { width, height } = img;

      // Only resize if larger than max dimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG for smaller file size
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Extract EXIF GPS data from image (basic implementation)
 * Note: In a production app, you'd use a library like exif-js
 */
function extractExifGps(): { latitude?: number; longitude?: number } {
  // Placeholder for EXIF extraction - returns empty object
  return {};
}

export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = 10,
  maxSizeMB = 10,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggedIndex = useRef<number | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      // Check total count
      if (photos.length + fileArray.length > maxPhotos) {
        setError(`Maximum ${maxPhotos} photos allowed`);
        return;
      }

      // Filter valid image files
      const validFiles = fileArray.filter((file) => {
        if (!file.type.startsWith('image/')) {
          return false;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`Some files exceed ${maxSizeMB}MB limit`);
          return false;
        }
        return true;
      });

      // Process files
      const newPhotos: TrailRecordPhotoInput[] = [];
      for (const file of validFiles) {
        try {
          const imageData = await resizeImage(file, MAX_DIMENSION);
          const gps = extractExifGps();

          newPhotos.push({
            imageData,
            mimeType: 'image/jpeg',
            order: photos.length + newPhotos.length,
            ...gps,
          });
        } catch (err) {
          console.error('Failed to process image:', err);
          setError('Failed to process some images');
        }
      }

      if (newPhotos.length > 0) {
        onChange([...photos, ...newPhotos]);
      }
    },
    [photos, onChange, maxPhotos, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFiles]
  );

  const removePhoto = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      // Update order values
      newPhotos.forEach((photo, i) => {
        photo.order = i;
      });
      onChange(newPhotos);
    },
    [photos, onChange]
  );

  const updateCaption = useCallback(
    (index: number, caption: string) => {
      const newPhotos = [...photos];
      newPhotos[index] = { ...newPhotos[index], caption };
      onChange(newPhotos);
    },
    [photos, onChange]
  );

  // Drag and drop reordering
  const handleDragStart = useCallback((index: number) => {
    draggedIndex.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedIndex.current = null;
  }, []);

  const handleReorderDrop = useCallback(
    (dropIndex: number) => {
      if (draggedIndex.current === null || draggedIndex.current === dropIndex) {
        return;
      }

      const newPhotos = [...photos];
      const [removed] = newPhotos.splice(draggedIndex.current, 1);
      newPhotos.splice(dropIndex, 0, removed);

      // Update order values
      newPhotos.forEach((photo, i) => {
        photo.order = i;
      });

      onChange(newPhotos);
      draggedIndex.current = null;
    },
    [photos, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          photos.length >= maxPhotos && 'opacity-50 cursor-not-allowed'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => photos.length < maxPhotos && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={photos.length >= maxPhotos}
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {photos.length >= maxPhotos
              ? `Maximum ${maxPhotos} photos reached`
              : 'Drag & drop photos here, or click to select'}
          </p>
          <p className="text-xs text-muted-foreground">
            {photos.length} / {maxPhotos} photos
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden bg-muted"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleReorderDrop(index)}
            >
              {/* Drag handle */}
              <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                <GripVertical className="h-5 w-5 text-white drop-shadow-md" />
              </div>

              {/* Remove button */}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Image preview */}
              <div className="aspect-square relative">
                {photo.imageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.imageData}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Caption input */}
              <div className="p-2">
                <Input
                  type="text"
                  placeholder="Add caption..."
                  value={photo.caption || ''}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  className="text-xs h-7"
                />
              </div>

              {/* Order indicator */}
              <div className="absolute bottom-12 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
