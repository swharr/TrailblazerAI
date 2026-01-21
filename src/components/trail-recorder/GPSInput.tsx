'use client';

import { useState, useCallback } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Coordinates } from '@/lib/types/trail-recorder';

interface GPSInputProps {
  startCoordinates?: Coordinates;
  endCoordinates?: Coordinates;
  onStartChange: (coords: Coordinates | undefined) => void;
  onEndChange: (coords: Coordinates | undefined) => void;
}

export function GPSInput({
  startCoordinates,
  endCoordinates,
  onStartChange,
  onEndChange,
}: GPSInputProps) {
  const [isOpen, setIsOpen] = useState(
    !!(startCoordinates || endCoordinates)
  );
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingEnd, setIsLoadingEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(
    async (target: 'start' | 'end') => {
      setError(null);
      const setLoading = target === 'start' ? setIsLoadingStart : setIsLoadingEnd;
      const onChange = target === 'start' ? onStartChange : onEndChange;

      setLoading(true);

      try {
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by your browser');
          return;
        }

        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          }
        );

        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          elevation: position.coords.altitude || undefined,
        });
      } catch (err) {
        if (err instanceof GeolocationPositionError) {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Location permission denied');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location information unavailable');
              break;
            case err.TIMEOUT:
              setError('Location request timed out');
              break;
            default:
              setError('Unable to get location');
          }
        } else {
          setError('Failed to get location');
        }
      } finally {
        setLoading(false);
      }
    },
    [onStartChange, onEndChange]
  );

  const handleLatChange = useCallback(
    (target: 'start' | 'end', value: string) => {
      const onChange = target === 'start' ? onStartChange : onEndChange;
      const currentCoords = target === 'start' ? startCoordinates : endCoordinates;

      const lat = parseFloat(value);
      if (isNaN(lat) && value !== '' && value !== '-') return;

      if (value === '' || value === '-') {
        if (!currentCoords?.longitude) {
          onChange(undefined);
        } else {
          onChange({ ...currentCoords, latitude: 0 });
        }
      } else {
        onChange({
          latitude: lat,
          longitude: currentCoords?.longitude || 0,
          elevation: currentCoords?.elevation,
        });
      }
    },
    [startCoordinates, endCoordinates, onStartChange, onEndChange]
  );

  const handleLngChange = useCallback(
    (target: 'start' | 'end', value: string) => {
      const onChange = target === 'start' ? onStartChange : onEndChange;
      const currentCoords = target === 'start' ? startCoordinates : endCoordinates;

      const lng = parseFloat(value);
      if (isNaN(lng) && value !== '' && value !== '-') return;

      if (value === '' || value === '-') {
        if (!currentCoords?.latitude) {
          onChange(undefined);
        } else {
          onChange({ ...currentCoords, longitude: 0 });
        }
      } else {
        onChange({
          latitude: currentCoords?.latitude || 0,
          longitude: lng,
          elevation: currentCoords?.elevation,
        });
      }
    },
    [startCoordinates, endCoordinates, onStartChange, onEndChange]
  );

  const clearCoordinates = useCallback(
    (target: 'start' | 'end') => {
      const onChange = target === 'start' ? onStartChange : onEndChange;
      onChange(undefined);
    },
    [onStartChange, onEndChange]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            GPS Coordinates (Optional)
          </span>
          <span className="text-xs text-muted-foreground">
            {isOpen ? 'Hide' : 'Show'}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-6">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Start Point */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Start Point</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => getCurrentLocation('start')}
                disabled={isLoadingStart}
              >
                {isLoadingStart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                <span className="ml-1">Current</span>
              </Button>
              {startCoordinates && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCoordinates('start')}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start-lat" className="text-xs text-muted-foreground">
                Latitude
              </Label>
              <Input
                id="start-lat"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 38.5733"
                value={startCoordinates?.latitude?.toString() || ''}
                onChange={(e) => handleLatChange('start', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="start-lng" className="text-xs text-muted-foreground">
                Longitude
              </Label>
              <Input
                id="start-lng"
                type="text"
                inputMode="decimal"
                placeholder="e.g., -109.5498"
                value={startCoordinates?.longitude?.toString() || ''}
                onChange={(e) => handleLngChange('start', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* End Point */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">End Point</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => getCurrentLocation('end')}
                disabled={isLoadingEnd}
              >
                {isLoadingEnd ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                <span className="ml-1">Current</span>
              </Button>
              {endCoordinates && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCoordinates('end')}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="end-lat" className="text-xs text-muted-foreground">
                Latitude
              </Label>
              <Input
                id="end-lat"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 38.5733"
                value={endCoordinates?.latitude?.toString() || ''}
                onChange={(e) => handleLatChange('end', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-lng" className="text-xs text-muted-foreground">
                Longitude
              </Label>
              <Input
                id="end-lng"
                type="text"
                inputMode="decimal"
                placeholder="e.g., -109.5498"
                value={endCoordinates?.longitude?.toString() || ''}
                onChange={(e) => handleLngChange('end', e.target.value)}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: Use negative values for Western longitudes (e.g., -109.5) and
          Southern latitudes.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
