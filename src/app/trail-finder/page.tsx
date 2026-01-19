'use client';

import { useState } from 'react';
import { TrailSearchResult, VehicleInfo, TrailDifficultyPref, TripLength, SceneryType } from '@/lib/types';
import TrailFinderForm from '@/components/trail-finder/TrailFinderForm';
import TrailFinderResults from '@/components/trail-finder/TrailFinderResults';
import { Button } from '@/components/ui/button';
import { Compass, ArrowLeft } from 'lucide-react';

export default function TrailFinderPage() {
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TrailSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (params: {
    vehicleId?: string;
    vehicleInfo?: VehicleInfo;
    location: string;
    searchRadius: number;
    difficultyPref?: TrailDifficultyPref;
    tripLength?: TripLength;
    sceneryTypes?: SceneryType[];
  }) => {
    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/trail-finder/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Search failed');
      }

      setResult(json.data as TrailSearchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleNewSearch = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Compass className="h-8 w-8 text-trail-green" />
          Trail Finder
        </h1>
        <p className="text-muted-foreground">
          Discover off-road trails that match your vehicle capabilities and preferences.
          Powered by AI and real trail data from AllTrails, OnX, Gaia GPS, and more.
        </p>
      </div>

      {!result ? (
        <TrailFinderForm onSearch={handleSearch} isLoading={isSearching} />
      ) : (
        <div className="space-y-6">
          <Button variant="outline" onClick={handleNewSearch} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            New Search
          </Button>

          <TrailFinderResults result={result} />

          <Button variant="outline" onClick={handleNewSearch} className="w-full">
            Search for More Trails
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
