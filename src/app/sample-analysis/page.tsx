'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  Camera,
  ArrowRight,
  MapPin,
  Mountain,
  AlertTriangle,
  Target,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import TrailAnalysisResults from '@/components/upload/TrailAnalysisResults';
import { TrailAnalysis, AnalysisMetrics, VehicleInfo } from '@/lib/types';

interface DemoAnalysisResponse {
  success: boolean;
  analysis: {
    id: string;
    isDemo: boolean;
    trailName: string | null;
    trailLocation: string | null;
    notes: string | null;
    difficulty: number;
    trailType: string[];
    conditions: string[];
    hazards: string[];
    recommendations: string[];
    bestFor: string[];
    summary: string;
    vehicleSettings: Record<string, unknown> | null;
    fuelEstimate: Record<string, unknown> | null;
    emergencyComms: Record<string, unknown> | null;
    createdAt: string;
    vehicle: {
      id: string;
      name: string | null;
      make: string;
      model: string;
      year: number | null;
      features: string[];
      suspensionBrand: string | null;
      suspensionTravel: string | null;
    } | null;
    metrics: {
      model: string;
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
    } | null;
  };
}

export default function SampleAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<DemoAnalysisResponse['analysis'] | null>(null);

  useEffect(() => {
    async function fetchDemoAnalysis() {
      try {
        const res = await fetch('/api/analyses/demo');
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Demo analysis not available');
          return;
        }

        setAnalysisData(data.analysis);
      } catch (err) {
        console.error('Failed to fetch demo analysis:', err);
        setError('Failed to load demo analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchDemoAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Sample Analysis</h1>
            <p className="text-muted-foreground">
              See what AI-powered trail analysis looks like
            </p>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Sample Analysis Available</h2>
              <p className="text-muted-foreground mb-6">
                {error || 'Check back soon for a sample trail analysis.'}
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button>Sign Up to Analyze Trails</Button>
                </Link>
                <Link href="/sample-route">
                  <Button variant="outline">View Sample Route</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Convert API response to component props format
  const trailAnalysis: TrailAnalysis = {
    difficulty: analysisData.difficulty,
    trailType: analysisData.trailType,
    conditions: analysisData.conditions,
    hazards: analysisData.hazards,
    recommendations: analysisData.recommendations,
    bestFor: analysisData.bestFor,
    summary: analysisData.summary,
    rawResponse: '', // Not displayed in demo
    vehicleSettings: analysisData.vehicleSettings as TrailAnalysis['vehicleSettings'],
    fuelEstimate: analysisData.fuelEstimate as TrailAnalysis['fuelEstimate'],
    emergencyComms: analysisData.emergencyComms as TrailAnalysis['emergencyComms'],
  };

  const metrics: AnalysisMetrics = analysisData.metrics
    ? {
        model: analysisData.metrics.model,
        inputTokens: analysisData.metrics.inputTokens,
        outputTokens: analysisData.metrics.outputTokens,
        totalTokens: analysisData.metrics.inputTokens + analysisData.metrics.outputTokens,
        cost: 0, // Not shown in demo
        latencyMs: analysisData.metrics.latencyMs,
      }
    : {
        model: 'claude-sonnet-4',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        latencyMs: 0,
      };

  const vehicleInfo: VehicleInfo | null = analysisData.vehicle
    ? {
        id: analysisData.vehicle.id,
        make: analysisData.vehicle.make,
        model: analysisData.vehicle.model,
        year: analysisData.vehicle.year || undefined,
        features: analysisData.vehicle.features as VehicleInfo['features'],
        suspensionBrand: analysisData.vehicle.suspensionBrand as VehicleInfo['suspensionBrand'],
        suspensionTravel: analysisData.vehicle.suspensionTravel as VehicleInfo['suspensionTravel'],
      }
    : null;

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 1) return 'Easy';
    if (difficulty <= 2) return 'Moderate';
    if (difficulty <= 3) return 'Challenging';
    if (difficulty <= 4) return 'Difficult';
    return 'Expert';
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1) return 'bg-green-500';
    if (difficulty <= 2) return 'bg-yellow-500';
    if (difficulty <= 3) return 'bg-orange-500';
    if (difficulty <= 4) return 'bg-red-500';
    return 'bg-red-700';
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Sample Analysis
          </Badge>
        </div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Camera className="h-8 w-8 text-orange-500" />
          {analysisData.trailName || 'Trail Analysis Demo'}
        </h1>
        {analysisData.trailLocation && (
          <p className="text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {analysisData.trailLocation}
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Mountain className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Difficulty</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getDifficultyColor(analysisData.difficulty)}`} />
              <span className="font-semibold">{getDifficultyLabel(analysisData.difficulty)}</span>
              <span className="text-sm text-muted-foreground">({analysisData.difficulty}/5)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Hazards</span>
            </div>
            <span className="font-semibold">{analysisData.hazards.length} identified</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Trail Types</span>
            </div>
            <span className="font-semibold">{analysisData.trailType.length} types</span>
          </CardContent>
        </Card>

        {analysisData.vehicle && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Vehicle</span>
              </div>
              <span className="font-semibold text-sm">
                {analysisData.vehicle.make} {analysisData.vehicle.model}
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full Analysis Results */}
      <TrailAnalysisResults
        analysis={trailAnalysis}
        metrics={metrics}
        vehicleInfo={vehicleInfo}
      />

      {/* CTA */}
      <Card className="mt-8 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
        <CardContent className="py-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Want to analyze your own trails?</h2>
          <p className="text-muted-foreground mb-6">
            Sign up to get AI-powered analysis of your trail photos with vehicle-specific recommendations.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/signup">
              <Button size="lg">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
