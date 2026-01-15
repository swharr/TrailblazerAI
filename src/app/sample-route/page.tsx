'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, MapPin, Download, Clock, Mountain, Route as RouteIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface RouteWaypoint {
  lat: number;
  lng: number;
  elevation?: number;
  name?: string;
  type?: string;
}

interface DemoRoute {
  id: string;
  name: string;
  description: string | null;
  status: string;
  waypoints: RouteWaypoint[];
  totalDistance: number | null;
  estimatedTime: number | null;
  elevationGain: number | null;
}

export default function SampleRoutePage() {
  const [route, setRoute] = useState<DemoRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDemoRoute() {
      try {
        const res = await fetch('/api/routes/demo');
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load demo route');
          return;
        }

        setRoute(data.route);
      } catch {
        setError('Failed to load demo route');
      } finally {
        setLoading(false);
      }
    }

    fetchDemoRoute();
  }, []);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  const getWaypointIcon = (type?: string) => {
    switch (type) {
      case 'start':
        return '🟢';
      case 'end':
        return '🔴';
      case 'campsite':
        return '🏕️';
      case 'water':
        return '💧';
      case 'fuel':
        return '⛽';
      case 'hazard':
        return '⚠️';
      case 'viewpoint':
        return '📷';
      default:
        return '📍';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <RouteIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Demo Route Available</h2>
              <p className="text-muted-foreground mb-6">
                {error || 'A sample route has not been created yet.'}
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button>Sign Up to Create Routes</Button>
                </Link>
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            Sample Route
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{route.name}</h1>
          {route.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">{route.description}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Map className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {route.totalDistance ? `${route.totalDistance.toFixed(1)} mi` : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">Distance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{formatDuration(route.estimatedTime)}</p>
              <p className="text-sm text-muted-foreground">Est. Time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Mountain className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {route.elevationGain ? `${Math.round(route.elevationGain)} ft` : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">Elevation Gain</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Waypoints List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Waypoints
              </CardTitle>
              <CardDescription>{route.waypoints.length} points along the route</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {route.waypoints.map((waypoint, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <span className="text-xl">{getWaypointIcon(waypoint.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {waypoint.name || `Waypoint ${index + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
                        {waypoint.elevation && ` • ${Math.round(waypoint.elevation)} ft`}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Map Preview */}
          <div className="space-y-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Map Preview</CardTitle>
                <CardDescription>Interactive map coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Mapbox integration in progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button className="w-full" asChild>
                  <a href={`/api/routes/${route.id}/export`} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download GPX
                  </a>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Import into OnX Offroad, Gaia GPS, or any GPS app
                </p>
                <div className="pt-3 border-t">
                  <p className="text-sm text-center mb-3">
                    Want to create your own routes?
                  </p>
                  <div className="flex gap-2">
                    <Link href="/auth/signup" className="flex-1">
                      <Button variant="outline" className="w-full">
                        Sign Up
                      </Button>
                    </Link>
                    <Link href="/auth/signin" className="flex-1">
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
