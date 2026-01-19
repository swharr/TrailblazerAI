'use client';

import { TrailSearchResult, TrailRecommendation, VehicleCompatibility, TrailSource } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  MapPin,
  Mountain,
  AlertTriangle,
  Gauge,
  Calendar,
  FileText,
  Star,
  Truck,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrailFinderResultsProps {
  result: TrailSearchResult;
}

const SOURCE_LABELS: Record<TrailSource, { label: string; color: string }> = {
  alltrails: { label: 'AllTrails', color: 'bg-green-500' },
  onx: { label: 'OnX Offroad', color: 'bg-orange-500' },
  gaia: { label: 'Gaia GPS', color: 'bg-blue-500' },
  forum: { label: 'Forum', color: 'bg-purple-500' },
  web: { label: 'Web Source', color: 'bg-teal-500' },
  other: { label: 'Other', color: 'bg-gray-500' },
};

/**
 * Get display label for a trail source, using sourceName for proper attribution
 */
function getSourceLabel(trail: TrailRecommendation): string {
  // If we have a custom source name, use it for attribution
  if (trail.sourceName) {
    return trail.sourceName;
  }
  // Fall back to the standard labels
  return SOURCE_LABELS[trail.source]?.label || 'Unknown Source';
}

const COMPATIBILITY_STYLES: Record<VehicleCompatibility, { label: string; className: string }> = {
  excellent: { label: 'Excellent Match', className: 'bg-green-100 text-green-800 border-green-300' },
  good: { label: 'Good Match', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  marginal: { label: 'Marginal', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  'not-recommended': { label: 'Not Recommended', className: 'bg-red-100 text-red-800 border-red-300' },
};

function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= difficulty ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          )}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">({difficulty}/5)</span>
    </div>
  );
}

function TrailCard({ trail }: { trail: TrailRecommendation }) {
  const sourceInfo = SOURCE_LABELS[trail.source] || SOURCE_LABELS.web;
  const sourceLabel = getSourceLabel(trail);
  const compatibilityInfo = COMPATIBILITY_STYLES[trail.vehicleCompatibility];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{trail.name}</CardTitle>
              <Badge variant="outline" className={cn('text-xs text-white', sourceInfo.color)}>
                {sourceLabel}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {trail.location}
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn('shrink-0', compatibilityInfo.className)}>
            <Truck className="h-3 w-3 mr-1" />
            {compatibilityInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Difficulty:</span>
            <DifficultyStars difficulty={trail.difficulty} />
          </div>
          {trail.length && (
            <div className="flex items-center gap-1">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Length:</span>
              <span>{trail.length}</span>
            </div>
          )}
          {trail.elevationGain && (
            <div className="flex items-center gap-1">
              <Mountain className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Elevation:</span>
              <span>{trail.elevationGain}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">{trail.description}</p>

        {/* Why Recommended */}
        <div className="bg-trail-green/5 border border-trail-green/20 rounded-lg p-3">
          <p className="text-sm">
            <span className="font-medium text-trail-green">Why we recommend this: </span>
            {trail.whyRecommended}
          </p>
        </div>

        {/* Additional Info */}
        <div className="flex flex-wrap gap-2 text-sm">
          {trail.bestSeason && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Best: {trail.bestSeason}</span>
            </div>
          )}
          {trail.permits && trail.permits !== 'None required' && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{trail.permits}</span>
            </div>
          )}
        </div>

        {/* Scenery Tags */}
        {trail.sceneryType && trail.sceneryType.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trail.sceneryType.map((scenery) => (
              <Badge key={scenery} variant="secondary" className="text-xs capitalize">
                {scenery}
              </Badge>
            ))}
          </div>
        )}

        {/* Warnings */}
        {trail.warnings && trail.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {trail.warnings.map((warning, idx) => (
                  <p key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View Trail Button */}
        {trail.sourceUrl && (
          <Button variant="outline" size="sm" asChild className="w-full">
            <a href={trail.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on {sourceLabel}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrailFinderResults({ result }: TrailFinderResultsProps) {
  const { recommendations, searchSummary, vehicleCapabilityScore, query } = result;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-trail-green/5 to-trail-brown/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-trail-green" />
            Search Results
          </CardTitle>
          <CardDescription>
            Found {recommendations.length} trails near {query.location}
            {query.searchRadius && ` within ${query.searchRadius} miles`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{searchSummary}</p>

          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Vehicle Capability Score:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      'w-6 h-2 rounded-full',
                      level <= vehicleCapabilityScore
                        ? 'bg-trail-green'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                ))}
                <span className="ml-1 text-sm text-muted-foreground">
                  {vehicleCapabilityScore}/5
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trail Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((trail, index) => (
          <TrailCard key={`${trail.name}-${index}`} trail={trail} />
        ))}
      </div>

      {recommendations.length === 0 && (
        <Card className="py-12 text-center">
          <CardContent>
            <Mountain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Trails Found</h3>
            <p className="text-muted-foreground">
              Try expanding your search radius or adjusting your preferences.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
