'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ImageUpload from '@/components/upload/ImageUpload';
import VehicleInfoForm from '@/components/upload/VehicleInfoForm';
import TrailAnalysisResults from '@/components/upload/TrailAnalysisResults';
import { ModelName, AnalysisResult, VehicleInfo, AnalysisContext } from '@/lib/types';
import { Loader2, Sparkles, MapPin, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyzePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelName>('claude-sonnet-4-20250514');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vehicle info state
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);

  // Additional context state
  const [contextOpen, setContextOpen] = useState(false);
  const [trailName, setTrailName] = useState('');
  const [trailLocation, setTrailLocation] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleImagesChange = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setResult(null);
    setError(null);
  }, []);

  const handleClear = () => {
    setSelectedFiles([]);
    setResult(null);
    setError(null);
  };

  const handleVehicleChange = useCallback((info: VehicleInfo | null) => {
    setVehicleInfo(info);
  }, []);

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      // Append all images
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });
      formData.append('model', selectedModel);

      // Add vehicle info if provided
      if (vehicleInfo) {
        formData.append('vehicleInfo', JSON.stringify(vehicleInfo));
      }

      // Add context if any field is filled
      const context: AnalysisContext = {};
      if (trailName) context.trailName = trailName;
      if (trailLocation) context.trailLocation = trailLocation;
      if (additionalNotes) context.additionalNotes = additionalNotes;

      if (Object.keys(context).length > 0) {
        formData.append('context', JSON.stringify(context));
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Analysis failed');
      }

      setResult(json.data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasContext = trailName || trailLocation || additionalNotes;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-orange-500" />
          Trail Analyzer
        </h1>
        <p className="text-muted-foreground">
          Upload a trail photo and get AI-powered analysis of difficulty,
          conditions, and recommendations.
        </p>
      </div>

      <div className="space-y-6">
        {/* Image Upload */}
        <ImageUpload
          onImagesChange={handleImagesChange}
          onClear={handleClear}
          disabled={isAnalyzing}
        />

        {/* Optional sections - show when images selected */}
        {selectedFiles.length > 0 && !result && (
          <>
            {/* Your Rig Info */}
            <VehicleInfoForm
              value={vehicleInfo}
              onChange={handleVehicleChange}
              disabled={isAnalyzing}
            />

            {/* Trail Context */}
            <Card className="border-dashed">
              <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-base font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <span>Trail Details</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          (Optional)
                        </span>
                        {hasContext && !contextOpen && (
                          <span className="text-xs font-normal text-primary ml-2">
                            {trailName || trailLocation || 'Notes added'}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 text-muted-foreground transition-transform',
                          contextOpen && 'rotate-180'
                        )}
                      />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add trail information to get more relevant and specific
                      analysis results.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Trail Name
                        </label>
                        <Input
                          placeholder="e.g., Rubicon Trail"
                          value={trailName}
                          onChange={(e) => setTrailName(e.target.value)}
                          disabled={isAnalyzing}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location</label>
                        <Input
                          placeholder="e.g., Lake Tahoe, CA"
                          value={trailLocation}
                          onChange={(e) => setTrailLocation(e.target.value)}
                          disabled={isAnalyzing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Additional Notes
                      </label>
                      <Textarea
                        placeholder="Any specific concerns or questions? e.g., 'I'm worried about the water crossing depth' or 'Is this passable in a stock 4Runner?'"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        disabled={isAnalyzing}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Adding context helps the AI provide more tailored
                        recommendations
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Model Selection & Analyze Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Select AI Model
                </label>
                <Select
                  value={selectedModel}
                  onValueChange={(value) => setSelectedModel(value as ModelName)}
                  disabled={isAnalyzing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-20250514">
                      Claude Sonnet 4 (Recommended)
                    </SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">
                      Claude 3.5 Sonnet
                    </SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gemini-pro-vision">
                      Gemini Pro Vision
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:self-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || selectedFiles.length === 0}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing {selectedFiles.length} {selectedFiles.length === 1 ? 'photo' : 'photos'}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze {selectedFiles.length} {selectedFiles.length === 1 ? 'Photo' : 'Photos'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <TrailAnalysisResults
              analysis={result.analysis}
              metrics={result.metrics}
              vehicleInfo={vehicleInfo}
            />
            <Button
              onClick={handleClear}
              variant="outline"
              className="w-full"
            >
              Analyze Another Trail
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
