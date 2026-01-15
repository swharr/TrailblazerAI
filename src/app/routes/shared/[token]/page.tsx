'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Map,
  Clock,
  Mountain,
  Loader2,
  User,
  Calendar,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import RouteMap, { RouteWaypoint } from '@/components/maps/RouteMap';
import Link from 'next/link';

interface SharedRoute {
  id: string;
  name: string;
  description: string | null;
  status: string;
  waypoints: RouteWaypoint[];
  totalDistance: number | null;
  estimatedTime: number | null;
  elevationGain: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function SharedRoutePage() {
  const params = useParams();
  const token = params.token as string;

  const [route, setRoute] = useState<SharedRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoute() {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/routes/shared/${token}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Route not found');
          return;
        }

        setRoute(data.route);
      } catch (err) {
        console.error('Failed to fetch route:', err);
        setError('Failed to load route');
      } finally {
        setLoading(false);
      }
    }

    fetchRoute();
  }, [token]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <Map className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Route Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {error || 'This shared route link is invalid or has expired.'}
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Create Your Own Routes</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Route Info Sidebar */}
      <div className="lg:w-96 border-b lg:border-b-0 lg:border-r bg-card flex-shrink-0 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <Badge variant="secondary" className="mb-2">
              Shared Route
            </Badge>
            <h1 className="text-2xl font-bold">{route.name}</h1>
            {route.description && (
              <p className="text-muted-foreground mt-2">{route.description}</p>
            )}
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {route.totalDistance && (
              <div className="p-3 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{route.totalDistance.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">miles</p>
              </div>
            )}
            {route.estimatedTime && (
              <div className="p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{formatDuration(route.estimatedTime)}</p>
                <p className="text-xs text-muted-foreground">est. time</p>
              </div>
            )}
            {route.elevationGain && (
              <div className="p-3 bg-muted rounded-lg">
                <Mountain className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{Math.round(route.elevationGain)}</p>
                <p className="text-xs text-muted-foreground">ft gain</p>
              </div>
            )}
          </div>

          {/* Waypoints List */}
          {route.waypoints.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium mb-3">Waypoints ({route.waypoints.length})</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {route.waypoints.map((wp, index) => (
                    <div
                      key={wp.id}
                      className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg text-sm"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{wp.name || `Waypoint ${index + 1}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                        </p>
                      </div>
                      {wp.type && wp.type !== 'waypoint' && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {wp.type}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Created by {route.createdBy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(route.createdAt)}</span>
            </div>
          </div>

          {/* CTA */}
          <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Want to create and share your own routes?
              </p>
              <Link href="/auth/signup">
                <Button size="sm">Get Started Free</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[400px]">
        <RouteMap
          waypoints={route.waypoints}
          editable={false}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
