import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Map, Camera, Mountain, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  // Mock data - would come from API in production
  const stats = {
    totalRoutes: 0,
    totalDistance: 0,
    totalTrails: 0,
    photosAnalyzed: 0,
  };

  const recentRoutes: { id: string; name: string; distance: number; date: string }[] = [];

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
            <CardDescription>Routes Planned</CardDescription>
            <CardTitle className="text-3xl">{stats.totalRoutes}</CardTitle>
          </CardHeader>
          <CardContent>
            <Map className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Distance</CardDescription>
            <CardTitle className="text-3xl">{stats.totalDistance} km</CardTitle>
          </CardHeader>
          <CardContent>
            <Mountain className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trails Saved</CardDescription>
            <CardTitle className="text-3xl">{stats.totalTrails}</CardTitle>
          </CardHeader>
          <CardContent>
            <Mountain className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Photos Analyzed</CardDescription>
            <CardTitle className="text-3xl">{stats.photosAnalyzed}</CardTitle>
          </CardHeader>
          <CardContent>
            <Camera className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Routes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Routes</CardTitle>
            <CardDescription>Your recently planned routes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRoutes.length === 0 ? (
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
              <div className="space-y-4">
                {recentRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <div>
                      <p className="font-medium">{route.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {route.distance} km
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{route.date}</p>
                  </div>
                ))}
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
            <Button variant="outline" className="w-full justify-start" disabled>
              <Mountain className="mr-2 h-4 w-4" />
              Browse Trail Database
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
