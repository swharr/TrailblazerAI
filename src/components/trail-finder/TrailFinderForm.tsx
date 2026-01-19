'use client';

import { useState, useEffect } from 'react';
import { VehicleInfo, TrailDifficultyPref, TripLength, SceneryType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Compass, MapPin, Truck, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleInfoForm from '@/components/upload/VehicleInfoForm';

interface SavedVehicle {
  id: string;
  name: string | null;
  make: string;
  model: string;
  year: number | null;
}

interface TrailFinderFormProps {
  onSearch: (params: {
    vehicleId?: string;
    vehicleInfo?: VehicleInfo;
    location: string;
    searchRadius: number;
    difficultyPref?: TrailDifficultyPref;
    tripLength?: TripLength;
    sceneryTypes?: SceneryType[];
  }) => void;
  isLoading?: boolean;
}

const DIFFICULTY_OPTIONS: { value: TrailDifficultyPref; label: string; description: string }[] = [
  { value: 'any', label: 'Any Difficulty', description: 'Show all trails' },
  { value: 'easy', label: 'Easy', description: 'Graded roads, any vehicle' },
  { value: 'moderate', label: 'Moderate', description: '4WD recommended' },
  { value: 'difficult', label: 'Difficult', description: 'Modified vehicle needed' },
];

const TRIP_LENGTH_OPTIONS: { value: TripLength; label: string; description: string }[] = [
  { value: 'day-trip', label: 'Day Trip', description: 'Single day adventure' },
  { value: 'weekend', label: 'Weekend', description: '2-3 days' },
  { value: 'multi-day', label: 'Multi-Day', description: '4+ days expedition' },
];

const SCENERY_OPTIONS: { value: SceneryType; label: string; icon: string }[] = [
  { value: 'desert', label: 'Desert', icon: '🏜️' },
  { value: 'forest', label: 'Forest', icon: '🌲' },
  { value: 'mountain', label: 'Mountain', icon: '⛰️' },
  { value: 'coastal', label: 'Coastal', icon: '🌊' },
  { value: 'canyon', label: 'Canyon', icon: '🏞️' },
  { value: 'prairie', label: 'Prairie', icon: '🌾' },
  { value: 'alpine', label: 'Alpine', icon: '❄️' },
  { value: 'wetland', label: 'Wetland', icon: '🌿' },
];

export default function TrailFinderForm({ onSearch, isLoading = false }: TrailFinderFormProps) {
  // Vehicle state
  const [vehicleSource, setVehicleSource] = useState<'saved' | 'manual'>('manual');
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [manualVehicleInfo, setManualVehicleInfo] = useState<VehicleInfo | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Search parameters
  const [location, setLocation] = useState('');
  const [searchRadius, setSearchRadius] = useState(50);
  const [difficultyPref, setDifficultyPref] = useState<TrailDifficultyPref>('any');
  const [tripLength, setTripLength] = useState<TripLength | ''>('');
  const [sceneryTypes, setSceneryTypes] = useState<SceneryType[]>([]);

  // Load saved vehicles on mount
  useEffect(() => {
    async function loadVehicles() {
      try {
        const response = await fetch('/api/vehicles');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setSavedVehicles(data.data);
            // If user has saved vehicles, default to saved selection
            if (data.data.length > 0) {
              setVehicleSource('saved');
              // Select the default vehicle if one exists
              const defaultVehicle = data.data.find((v: SavedVehicle & { isDefault?: boolean }) => v.isDefault);
              if (defaultVehicle) {
                setSelectedVehicleId(defaultVehicle.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load vehicles:', error);
      } finally {
        setLoadingVehicles(false);
      }
    }
    loadVehicles();
  }, []);

  const handleSceneryToggle = (scenery: SceneryType) => {
    setSceneryTypes((prev) =>
      prev.includes(scenery) ? prev.filter((s) => s !== scenery) : [...prev, scenery]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!location.trim()) {
      return;
    }

    const params: Parameters<typeof onSearch>[0] = {
      location: location.trim(),
      searchRadius,
      difficultyPref: difficultyPref !== 'any' ? difficultyPref : undefined,
      tripLength: tripLength || undefined,
      sceneryTypes: sceneryTypes.length > 0 ? sceneryTypes : undefined,
    };

    // Add vehicle info based on source
    if (vehicleSource === 'saved' && selectedVehicleId) {
      params.vehicleId = selectedVehicleId;
    } else if (vehicleSource === 'manual' && manualVehicleInfo) {
      params.vehicleInfo = manualVehicleInfo;
    }

    onSearch(params);
  };

  const canSubmit = location.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Location Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-trail-green" />
            Search Location
          </CardTitle>
          <CardDescription>
            Enter a city, state, region, or specific area to search for trails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Moab, Utah or Death Valley, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isLoading}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label>Search Radius: {searchRadius} miles</Label>
              <Slider
                value={[searchRadius]}
                onValueChange={(value) => setSearchRadius(value[0])}
                min={10}
                max={200}
                step={10}
                disabled={isLoading}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 mi</span>
                <span>100 mi</span>
                <span>200 mi</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-trail-brown" />
            Your Vehicle
          </CardTitle>
          <CardDescription>
            Provide vehicle info for personalized trail recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVehicles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedVehicles.length > 0 ? (
            <div className="space-y-4">
              {/* Vehicle source toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={vehicleSource === 'saved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVehicleSource('saved')}
                  disabled={isLoading}
                >
                  Saved Vehicles
                </Button>
                <Button
                  type="button"
                  variant={vehicleSource === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVehicleSource('manual')}
                  disabled={isLoading}
                >
                  Enter Manually
                </Button>
              </div>

              {vehicleSource === 'saved' ? (
                <Select
                  value={selectedVehicleId}
                  onValueChange={setSelectedVehicleId}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name || `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <VehicleInfoForm
                  value={manualVehicleInfo}
                  onChange={setManualVehicleInfo}
                  disabled={isLoading}
                />
              )}
            </div>
          ) : (
            <VehicleInfoForm
              value={manualVehicleInfo}
              onChange={setManualVehicleInfo}
              disabled={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-trail-orange" />
            Trail Preferences
          </CardTitle>
          <CardDescription>
            Filter results based on your preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Difficulty */}
          <div className="space-y-3">
            <Label>Difficulty Preference</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDifficultyPref(option.value)}
                  disabled={isLoading}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-lg border text-center transition-colors',
                    difficultyPref === option.value
                      ? 'bg-trail-green/10 border-trail-green text-trail-green'
                      : 'hover:bg-muted'
                  )}
                >
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trip Length */}
          <div className="space-y-3">
            <Label>Trip Length (Optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              {TRIP_LENGTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTripLength(tripLength === option.value ? '' : option.value)}
                  disabled={isLoading}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-lg border text-center transition-colors',
                    tripLength === option.value
                      ? 'bg-trail-brown/10 border-trail-brown text-trail-brown'
                      : 'hover:bg-muted'
                  )}
                >
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scenery Types */}
          <div className="space-y-3">
            <Label>Scenery Types (Optional)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SCENERY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                    sceneryTypes.includes(option.value)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <Checkbox
                    checked={sceneryTypes.includes(option.value)}
                    onCheckedChange={() => handleSceneryToggle(option.value)}
                    disabled={isLoading}
                  />
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Button */}
      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit || isLoading}
        className="w-full bg-trail-green hover:bg-trail-green/90"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Searching for Trails...
          </>
        ) : (
          <>
            <Search className="h-5 w-5 mr-2" />
            Find Trails
          </>
        )}
      </Button>
    </form>
  );
}
