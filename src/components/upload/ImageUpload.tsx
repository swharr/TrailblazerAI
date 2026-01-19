'use client';

import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const MAX_IMAGES = 8;

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  onClear?: () => void;
  disabled?: boolean;
}

export default function ImageUpload({
  onImagesChange,
  onClear,
  disabled = false,
}: ImageUploadProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const maxSize = 32 * 1024 * 1024; // 32MB max per image

    if (!validTypes.includes(file.type)) {
      return 'Please upload a JPG, PNG, WebP, or AVIF image';
    }

    if (file.size > maxSize) {
      return 'Image must be less than 32MB';
    }

    return null;
  };

  /**
   * Convert an image file to WebP format using Canvas API
   * Used to convert AVIF (not supported by Anthropic API) to WebP
   */
  const convertToWebP = useCallback((file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'));
              return;
            }
            // Create a new File with .webp extension
            const newFileName = file.name.replace(/\.[^/.]+$/, '.webp');
            const convertedFile = new File([blob], newFileName, { type: 'image/webp' });
            resolve(convertedFile);
          },
          'image/webp',
          0.92 // Quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      // Check if adding these would exceed the limit
      const remainingSlots = MAX_IMAGES - images.length;
      if (fileArray.length > remainingSlots) {
        setError(`You can only upload up to ${MAX_IMAGES} images. ${remainingSlots} slot(s) remaining.`);
        return;
      }

      // Validate all files first
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      // Convert AVIF files to WebP (Anthropic API doesn't support AVIF)
      const processedFiles: File[] = [];
      for (const file of fileArray) {
        if (file.type === 'image/avif') {
          try {
            const converted = await convertToWebP(file);
            processedFiles.push(converted);
          } catch {
            setError('Failed to convert AVIF image. Please try a different format.');
            return;
          }
        } else {
          processedFiles.push(file);
        }
      }

      // Process all valid files
      const newImages: ImageFile[] = [];
      let processed = 0;

      processedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          newImages.push({
            file,
            preview: result,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          });
          processed++;

          if (processed === processedFiles.length) {
            setImages((prev) => {
              const updated = [...prev, ...newImages];
              onImagesChange(updated.map((img) => img.file));
              return updated;
            });
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [images.length, onImagesChange, convertToWebP]
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      onImagesChange(updated.map((img) => img.file));
      return updated;
    });
    setError(null);
  };

  const handleClearAll = () => {
    setImages([]);
    setError(null);
    onClear?.();
  };

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <Card className="p-6">
      {images.length === 0 ? (
        // Empty state - large drop zone
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}
          `}
        >
          <input
            type="file"
            id="trail-images"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
            onChange={handleChange}
            disabled={disabled}
            multiple
            className="hidden"
          />
          <label
            htmlFor="trail-images"
            className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              Drop trail photos here or click to upload
            </p>
            <p className="text-sm text-muted-foreground">
              JPG, PNG, WebP, or AVIF up to 32MB each (max {MAX_IMAGES} photos)
            </p>
          </label>
        </div>
      ) : (
        // Images grid with previews
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative rounded-lg overflow-hidden bg-muted aspect-video"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt="Trail preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveImage(img.id)}
                  disabled={disabled}
                  className="absolute top-2 right-2 h-7 w-7"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Add more button */}
            {canAddMore && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                className={`
                  border-2 border-dashed rounded-lg aspect-video flex flex-col items-center justify-center transition-colors
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-muted/50'}
                `}
              >
                <input
                  type="file"
                  id="trail-images-add"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                  onChange={handleChange}
                  disabled={disabled}
                  multiple
                  className="hidden"
                />
                <label
                  htmlFor="trail-images-add"
                  className={`flex flex-col items-center justify-center w-full h-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Add more</p>
                  <p className="text-xs text-muted-foreground">
                    ({MAX_IMAGES - images.length} remaining)
                  </p>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>
                {images.length} {images.length === 1 ? 'image' : 'images'} ready
                for analysis
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </Card>
  );
}
