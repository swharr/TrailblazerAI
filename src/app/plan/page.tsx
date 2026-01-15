'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Map,
  Save,
  Download,
  Loader2,
  Trash2,
  Plus,
  ChevronRight,
  Clock,
} from 'lucide-react';
import RouteMap, { RouteWaypoint } from '@/components/maps/RouteMap';
import { calculateRouteDistance, estimateTravelTime, calculateElevationGain } from '@/lib/gpx-export';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface SavedRoute {
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
}

export default function PlanPage() {
  const { status } = useSession();
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeStatus, setRouteStatus] = useState<'draft' | 'planned' | 'completed'>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Calculate route stats
  const distance = calculateRouteDistance(waypoints);
  const estimatedMinutes = estimateTravelTime(distance);
  const elevationGain = calculateElevationGain(waypoints);

  // Fetch saved routes
  useEffect(() => {
    async function fetchRoutes() {
      if (status !== 'authenticated') {
        setLoadingRoutes(false);
        return;
      }
      try {
        const res = await fetch('/api/routes');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSavedRoutes(data.routes);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch routes:', err);
      } finally {
        setLoadingRoutes(false);
      }
    }
    fetchRoutes();
  }, [status]);

  // Handle waypoints change
  const handleWaypointsChange = useCallback((newWaypoints: RouteWaypoint[]) => {
    setWaypoints(newWaypoints);
  }, []);

  // Save route
  const handleSave = async () => {
    if (!routeName.trim() || waypoints.length < 2) return;
    setIsSaving(true);

    try {
      const routeData = {
        name: routeName.trim(),
        description: routeDescription.trim() || null,
        waypoints,
        status: routeStatus,
        totalDistance: distance,
        estimatedTime: estimatedMinutes,
        elevationGain,
      };

      let res;
      if (currentRouteId) {
        // Update existing route
        res = await fetch(`/api/routes/${currentRouteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeData),
        });
      } else {
        // Create new route
        res = await fetch('/api/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeData),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (!currentRouteId) {
            setCurrentRouteId(data.route.id);
            setSavedRoutes((prev) => [data.route, ...prev]);
          } else {
            setSavedRoutes((prev) =>
              prev.map((r) => (r.id === currentRouteId ? data.route : r))
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to save route:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Load route
  const handleLoadRoute = (route: SavedRoute) => {
    setCurrentRouteId(route.id);
    setRouteName(route.name);
    setRouteDescription(route.description || '');
    setWaypoints(route.waypoints);
    setRouteStatus(route.status as 'draft' | 'planned' | 'completed');
  };

  // Delete route
  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const res = await fetch(`/api/routes/${routeId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedRoutes((prev) => prev.filter((r) => r.id !== routeId));
        if (currentRouteId === routeId) {
          handleNewRoute();
        }
      }
    } catch (err) {
      console.error('Failed to delete route:', err);
    }
  };

  // New route
  const handleNewRoute = () => {
    setCurrentRouteId(null);
    setRouteName('');
    setRouteDescription('');
    setWaypoints([]);
    setRouteStatus('draft');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Not logged in state
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Map className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Route Planner</h1>
            <p className="text-muted-foreground">
              Plan your overland routes with an interactive map
            </p>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <Map className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sign in to Plan Routes</h2>
              <p className="text-muted-foreground mb-6">
                Create an account to plan routes, save waypoints, and export to GPX.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button>Sign Up</Button>
                </Link>
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                Want to see an example?{' '}
                <Link href="/sample-route" className="text-primary hover:underline">
                  View the Sample Route
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div
        className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r bg-card flex-shrink-0`}
      >
        <div className="w-80 h-full flex flex-col">
          {/* Route Details */}
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Route Details</h2>
              {currentRouteId && (
                <Button size="sm" variant="ghost" onClick={handleNewRoute}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              )}
            </div>

            <Input
              placeholder="Route name"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
            />

            <Textarea
              placeholder="Description (optional)"
              value={routeDescription}
              onChange={(e) => setRouteDescription(e.target.value)}
              rows={2}
            />

            <Select value={routeStatus} onValueChange={(v) => setRouteStatus(v as typeof routeStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Stats */}
            {waypoints.length >= 2 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{distance.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">miles</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{formatDuration(estimatedMinutes)}</p>
                  <p className="text-xs text-muted-foreground">est. time</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">{Math.round(elevationGain)}</p>
                  <p className="text-xs text-muted-foreground">ft gain</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving || !routeName.trim() || waypoints.length < 2}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {currentRouteId ? 'Update' : 'Save'}
              </Button>

              {currentRouteId && (
                <Button variant="outline" asChild>
                  <a href={`/api/routes/${currentRouteId}/export`} download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Saved Routes List */}
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium mb-3">Saved Routes</h3>

              {loadingRoutes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No saved routes yet
                </p>
              ) : (
                <div className="space-y-2">
                  {savedRoutes.map((route) => (
                    <div
                      key={route.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentRouteId === route.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleLoadRoute(route)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{route.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {route.totalDistance && (
                              <span>{route.totalDistance.toFixed(1)} mi</span>
                            )}
                            {route.estimatedTime && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(route.estimatedTime)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {route.status}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoute(route.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background border rounded-r-lg p-1 shadow-sm hover:bg-muted transition-colors"
        style={{ left: showSidebar ? '320px' : '0' }}
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform ${showSidebar ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Map */}
      <div className="flex-1 relative">
        <RouteMap
          waypoints={waypoints}
          onWaypointsChange={handleWaypointsChange}
          editable={true}
          className="w-full h-full"
        />

        {/* Empty state */}
        {waypoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Card className="bg-background/80 backdrop-blur pointer-events-auto">
              <CardContent className="py-8 text-center">
                <Map className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Start Planning Your Route</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click &quot;Add Waypoint&quot; then click on the map to add points.
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag waypoints to reposition them.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
