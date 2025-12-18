import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Map, Mountain, Compass } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20">
        <div className="flex justify-center mb-6">
          <Mountain className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          TrailBlazer AI
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          AI-powered overland route planning and trail analysis. Upload photos of trails
          and get instant terrain analysis, or plan your next adventure with intelligent routing.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/analyze">
              <Camera className="mr-2 h-5 w-5" />
              Analyze Trail Photos
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/plan">
              <Map className="mr-2 h-5 w-5" />
              Plan a Route
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Camera className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Photo Analysis</CardTitle>
              <CardDescription>
                Upload trail photos and get AI-powered terrain analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your trail photos to identify terrain conditions,
                obstacles, and potential hazards. Get recommendations for vehicle
                requirements and difficulty ratings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Map className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Route Planning</CardTitle>
              <CardDescription>
                Plan multi-day overland routes with waypoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create detailed routes with waypoints for campsites, water sources,
                fuel stops, and points of interest. Export routes for offline navigation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Compass className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Trail Database</CardTitle>
              <CardDescription>
                Access community-contributed trail information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse trails from the community, complete with difficulty ratings,
                terrain types, and real user reviews. Contribute your own discoveries.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
