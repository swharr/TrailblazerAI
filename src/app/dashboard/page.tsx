'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Map,
  Camera,
  Mountain,
  ArrowRight,
  Loader2,
  Truck,
  Clock,
  Download,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Analysis {
  id: string;
  trailName: string | null;
  trailLocation: string | null;
  difficulty: number;
  createdAt: string;
  vehicle: {
    name: string | null;
    make: string;
    model: string;
  } | null;
}

interface Route {
  id: string;
  name: string;
  status: string;
  totalDistance: number | null;
  estimatedTime: number | null;
  createdAt: string;
}

interface Vehicle {
  id: string;
  name: string | null;
  make: string;
  model: string;
  year: number | null;
  isDefault: boolean;
}

export default function DashboardPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [totalRoutes, setTotalRoutes] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (status !== 'authenticated') {
        setLoading(false);
        return;
      }

      try {
        const [analysesRes, routesRes, vehiclesRes] = await Promise.all([
          fetch('/api/analyses?limit=5'),
          fetch('/api/routes?limit=5'),
          fetch('/api/vehicles'),
        ]);

        if (analysesRes.ok) {
          const data = await analysesRes.json();
          if (data.success) {
            setAnalyses(data.analyses);
            setTotalAnalyses(data.pagination?.total || 0);
          }
        }

        if (routesRes.ok) {
          const data = await routesRes.json();
          if (data.success) {
            setRoutes(data.routes);
            setTotalRoutes(data.pagination?.total || 0);
          }
        }

        if (vehiclesRes.ok) {
          const data = await vehiclesRes.json();
          if (data.success) {
            setVehicles(data.vehicles);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [status]);

  // Calculate total distance from routes
  const totalDistance = routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-500';
    if (difficulty <= 3) return 'bg-yellow-500';
    if (difficulty <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Not logged in state
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <LayoutDashboard className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your trail analyses, routes, and vehicles
            </p>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sign in to View Your Dashboard</h2>
              <p className="text-muted-foreground mb-6">
                Create an account to track your analyses, save routes, and manage your vehicles.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button>Sign Up</Button>
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Overview of your trails, routes, and analysis history
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trail Analyses</CardDescription>
            <CardTitle className="text-3xl">{totalAnalyses}</CardTitle>
          </CardHeader>
          <CardContent>
            <Camera className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Routes Planned</CardDescription>
            <CardTitle className="text-3xl">{totalRoutes}</CardTitle>
          </CardHeader>
          <CardContent>
            <Map className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Miles Planned</CardDescription>
            <CardTitle className="text-3xl">{totalDistance.toFixed(0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Mountain className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saved Vehicles</CardDescription>
            <CardTitle className="text-3xl">{vehicles.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Truck className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Analyses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Analyses</CardTitle>
            <CardDescription>Your latest trail photo analyses</CardDescription>
          </CardHeader>
          <CardContent>
            {analyses.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No analyses yet</p>
                <Button asChild variant="outline">
                  <Link href="/analyze">
                    Analyze Your First Trail
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-8 rounded-full ${getDifficultyColor(analysis.difficulty)}`}
                      />
                      <div>
                        <p className="font-medium">
                          {analysis.trailName || 'Unnamed Trail'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {analysis.trailLocation || 'Unknown location'}
                          {analysis.vehicle && ` • ${analysis.vehicle.make} ${analysis.vehicle.model}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {analysis.difficulty}/5
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(analysis.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {totalAnalyses > 5 && (
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="/dashboard/analyses">
                      View all {totalAnalyses} analyses
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Routes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Routes</CardTitle>
            <CardDescription>Your planned routes</CardDescription>
          </CardHeader>
          <CardContent>
            {routes.length === 0 ? (
              <div className="text-center py-8">
                <Map className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No routes planned yet</p>
                <Button asChild variant="outline">
                  <Link href="/plan">
                    Plan Your First Route
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{route.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{route.status}</Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <a href={`/api/routes/${route.id}/export`} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
                {totalRoutes > 5 && (
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href="/plan">
                      View all {totalRoutes} routes
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card>
          <CardHeader>
            <CardTitle>My Vehicles</CardTitle>
            <CardDescription>Your saved vehicle profiles</CardDescription>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No vehicles saved</p>
                <Button asChild variant="outline">
                  <Link href="/settings">
                    Add Your Vehicle
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {vehicle.name || `${vehicle.make} ${vehicle.model}`}
                        </p>
                        {vehicle.name && (
                          <p className="text-xs text-muted-foreground">
                            {vehicle.make} {vehicle.model}
                            {vehicle.year && ` (${vehicle.year})`}
                          </p>
                        )}
                      </div>
                    </div>
                    {vehicle.isDefault && (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                ))}
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/settings">
                    Manage vehicles
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/analyze">
                <Camera className="mr-2 h-4 w-4" />
                Analyze Trail Photo
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/plan">
                <Map className="mr-2 h-4 w-4" />
                Plan New Route
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/sample-route">
                <Mountain className="mr-2 h-4 w-4" />
                View Sample Route
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
