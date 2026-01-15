'use client';

import { TrailAnalysis, AnalysisMetrics, VehicleInfo } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mountain,
  AlertTriangle,
  Truck,
  Target,
  Clock,
  DollarSign,
  Zap,
  Gauge,
  Settings2,
  Lock,
  Info,
  Fuel,
  Radio,
  Signal,
  SignalZero,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Satellite,
  Wifi,
  WifiOff,
  PhoneCall,
  Building2,
  TreePine,
  Mountain as MountainIcon,
  Shield,
  Car,
  Users
} from 'lucide-react';

interface TrailAnalysisResultsProps {
  analysis: TrailAnalysis;
  metrics: AnalysisMetrics;
  vehicleInfo?: VehicleInfo | null;
}

export default function TrailAnalysisResults({
  analysis,
  metrics,
  vehicleInfo
}: TrailAnalysisResultsProps) {
  // Guard against undefined analysis
  if (!analysis || !metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No analysis data available.</p>
        </CardContent>
      </Card>
    );
  }

  const DifficultyStars = ({ rating }: { rating: number }) => (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
            star <= rating
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'bg-transparent border-gray-300 text-gray-300'
          }`}
        >
          {star}
        </div>
      ))}
      <span className="ml-2 text-sm font-medium text-muted-foreground">
        ({rating}/5)
      </span>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Main Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5" />
            Trail Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Difficulty */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Difficulty Rating
            </p>
            <DifficultyStars rating={analysis.difficulty} />
          </div>

          {/* Trail Type */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Trail Type
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.trailType.map((type, i) => (
                <Badge key={i} variant="secondary">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Current Conditions
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.conditions.map((condition, i) => (
                <Badge key={i} variant="outline">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>

          {/* Hazards */}
          {analysis.hazards.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Hazards to Watch
              </p>
              <ul className="space-y-1 text-sm">
                {analysis.hazards.map((hazard, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{hazard}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Recommendations
            </p>
            <ul className="space-y-1 text-sm">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Best For */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Best For
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.bestFor.map((item, i) => (
                <Badge key={i} variant="default" className="bg-green-600">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fuel & Emergency Comms Card */}
      {(analysis.fuelEstimate || analysis.emergencyComms || analysis.starlinkCoverage) && (
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Radio className="h-5 w-5" />
              Safety & Preparedness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fuel Estimate */}
            {analysis.fuelEstimate && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Fuel Estimate
                </p>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Best Case</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {analysis.fuelEstimate.bestCase}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Worst Case</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {analysis.fuelEstimate.worstCase}
                    </p>
                  </div>
                </div>
                {analysis.fuelEstimate.notes && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-1 flex-shrink-0" />
                    {analysis.fuelEstimate.notes}
                  </p>
                )}
              </div>
            )}

            {/* Emergency Communications */}
            {analysis.emergencyComms && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Signal className="h-4 w-4" />
                  Emergency Communications
                </p>

                {/* Cell Coverage */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Cell Coverage</p>
                  <div className="flex items-center gap-2">
                    {analysis.emergencyComms.cellCoverage === 'none' && (
                      <>
                        <SignalZero className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">No Coverage</span>
                      </>
                    )}
                    {analysis.emergencyComms.cellCoverage === 'limited' && (
                      <>
                        <SignalLow className="h-5 w-5 text-orange-500" />
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Limited Coverage</span>
                      </>
                    )}
                    {analysis.emergencyComms.cellCoverage === 'moderate' && (
                      <>
                        <SignalMedium className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Moderate Coverage</span>
                      </>
                    )}
                    {analysis.emergencyComms.cellCoverage === 'good' && (
                      <>
                        <SignalHigh className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Good Coverage</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Recommended Methods */}
                {analysis.emergencyComms.recommendedMethods.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Recommended Methods</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.emergencyComms.recommendedMethods.map((method, i) => (
                        <Badge key={i} variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inter-Vehicle Communications */}
                {analysis.emergencyComms.interVehicleComms && (
                  <div className="mb-3 p-2 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Radio className="h-3 w-3" />
                      Inter-Vehicle Communication
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                        {analysis.emergencyComms.interVehicleComms.recommendedChannel}
                      </p>
                      {analysis.emergencyComms.interVehicleComms.frequency && (
                        <p className="text-xs text-muted-foreground">
                          Frequency: {analysis.emergencyComms.interVehicleComms.frequency}
                        </p>
                      )}
                      <Badge variant="outline" className="text-xs uppercase">
                        {analysis.emergencyComms.interVehicleComms.channelType}
                      </Badge>
                      {analysis.emergencyComms.interVehicleComms.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.emergencyComms.interVehicleComms.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Emergency Frequencies */}
                {analysis.emergencyComms.emergencyFrequencies && (
                  <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <PhoneCall className="h-3 w-3" />
                      Emergency Frequencies
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Primary</p>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                          {analysis.emergencyComms.emergencyFrequencies.primary}
                        </p>
                      </div>
                      {analysis.emergencyComms.emergencyFrequencies.secondary && (
                        <div>
                          <p className="text-xs text-muted-foreground">Secondary</p>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {analysis.emergencyComms.emergencyFrequencies.secondary}
                          </p>
                        </div>
                      )}
                      {analysis.emergencyComms.emergencyFrequencies.hamEmergency && (
                        <div>
                          <p className="text-xs text-muted-foreground">Ham Emergency</p>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {analysis.emergencyComms.emergencyFrequencies.hamEmergency}
                          </p>
                        </div>
                      )}
                      {analysis.emergencyComms.emergencyFrequencies.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.emergencyComms.emergencyFrequencies.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Local Authorities */}
                {analysis.emergencyComms.localAuthorities && (
                  <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Local Authorities & Agencies
                    </p>
                    <div className="space-y-2 text-sm">
                      {analysis.emergencyComms.localAuthorities.emergencyServices && (
                        <div className="flex items-start gap-2">
                          <PhoneCall className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-red-600 dark:text-red-400">Emergency: </span>
                            <span>{analysis.emergencyComms.localAuthorities.emergencyServices}</span>
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.localAuthorities.sheriff && (
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Sheriff: </span>
                            <span>{analysis.emergencyComms.localAuthorities.sheriff}</span>
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.localAuthorities.searchAndRescue && (
                        <div className="flex items-start gap-2">
                          <Users className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Search & Rescue: </span>
                            <span>{analysis.emergencyComms.localAuthorities.searchAndRescue}</span>
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.localAuthorities.blm && (
                        <div className="flex items-start gap-2">
                          <Building2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">BLM: </span>
                            <span>{analysis.emergencyComms.localAuthorities.blm}</span>
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.localAuthorities.nps && (
                        <div className="flex items-start gap-2">
                          <MountainIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">NPS: </span>
                            <span>{analysis.emergencyComms.localAuthorities.nps}</span>
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.localAuthorities.forestService && (
                        <div className="flex items-start gap-2">
                          <TreePine className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">USFS: </span>
                            <span>{analysis.emergencyComms.localAuthorities.forestService}</span>
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.localAuthorities.stateParks && (
                        <div className="flex items-start gap-2">
                          <TreePine className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">State Parks: </span>
                            <span>{analysis.emergencyComms.localAuthorities.stateParks}</span>
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.localAuthorities.notes && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {analysis.emergencyComms.localAuthorities.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Recovery Services */}
                {analysis.emergencyComms.recoveryServices && (
                  <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      Off-Road Recovery
                    </p>
                    <div className="space-y-2 text-sm">
                      {analysis.emergencyComms.recoveryServices.recommended && (
                        <div>
                          <p className="text-xs text-muted-foreground">Recommended Service</p>
                          <p className="font-semibold text-amber-700 dark:text-amber-300">
                            {analysis.emergencyComms.recoveryServices.recommended}
                          </p>
                        </div>
                      )}
                      {analysis.emergencyComms.recoveryServices.alternates && analysis.emergencyComms.recoveryServices.alternates.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Alternate Services</p>
                          <ul className="space-y-1">
                            {analysis.emergencyComms.recoveryServices.alternates.map((alt, i) => (
                              <li key={i} className="text-sm">{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.emergencyComms.recoveryServices.localClubs && analysis.emergencyComms.recoveryServices.localClubs.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Local 4x4 Clubs</p>
                          <div className="flex flex-wrap gap-1">
                            {analysis.emergencyComms.recoveryServices.localClubs.map((club, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                                {club}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysis.emergencyComms.recoveryServices.notes && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {analysis.emergencyComms.recoveryServices.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {analysis.emergencyComms.notes && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-1 flex-shrink-0" />
                    {analysis.emergencyComms.notes}
                  </p>
                )}
              </div>
            )}

            {/* Starlink Coverage */}
            {analysis.starlinkCoverage && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Satellite className="h-4 w-4" />
                  Starlink Coverage
                </p>

                {/* Coverage Level */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    {analysis.starlinkCoverage.coverage === 'high-performance' && (
                      <>
                        <Wifi className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">High Performance</span>
                      </>
                    )}
                    {analysis.starlinkCoverage.coverage === 'good-coverage' && (
                      <>
                        <Wifi className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Good Coverage</span>
                      </>
                    )}
                    {analysis.starlinkCoverage.coverage === 'some-issues' && (
                      <>
                        <Wifi className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Some Issues Expected</span>
                      </>
                    )}
                    {analysis.starlinkCoverage.coverage === 'major-obstructions' && (
                      <>
                        <WifiOff className="h-5 w-5 text-orange-500" />
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Major Obstructions</span>
                      </>
                    )}
                    {analysis.starlinkCoverage.coverage === 'zero-availability' && (
                      <>
                        <WifiOff className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">Zero Availability</span>
                      </>
                    )}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {analysis.starlinkCoverage.confidence} confidence
                    </Badge>
                  </div>
                </div>

                {/* Obstructions */}
                {analysis.starlinkCoverage.obstructions && analysis.starlinkCoverage.obstructions.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Potential Obstructions</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.starlinkCoverage.obstructions.map((obs, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                          {obs}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Spots */}
                {analysis.starlinkCoverage.bestSpots && analysis.starlinkCoverage.bestSpots.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Best Spots for Signal</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.starlinkCoverage.bestSpots.map((spot, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                          {spot}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {analysis.starlinkCoverage.notes && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1 mt-2">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {analysis.starlinkCoverage.notes}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Settings Card - Only shown when vehicle info provided and settings returned */}
      {vehicleInfo && analysis.vehicleSettings && (
        <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Settings2 className="h-5 w-5" />
              Your {vehicleInfo.make} {vehicleInfo.model} Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Transfer Case & Traction Control */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  Transfer Case
                </p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {analysis.vehicleSettings.transferCase}
                </p>
              </div>
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Settings2 className="h-3 w-3" />
                  Traction Control
                </p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400 capitalize">
                  {analysis.vehicleSettings.tractionControl.replace('-', ' ')}
                </p>
              </div>
            </div>

            {/* Tire Pressure */}
            {analysis.vehicleSettings.recommendedTirePressure && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  Recommended Tire Pressure
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Front</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {analysis.vehicleSettings.recommendedTirePressure.front} {analysis.vehicleSettings.recommendedTirePressure.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rear</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {analysis.vehicleSettings.recommendedTirePressure.rear} {analysis.vehicleSettings.recommendedTirePressure.unit}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lockers */}
            {analysis.vehicleSettings.lockers && analysis.vehicleSettings.lockers.length > 0 && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Locker Recommendation
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.vehicleSettings.lockers.map((locker, i) => (
                    <Badge key={i} variant="default" className="bg-orange-600 text-white capitalize">
                      {locker === 'both' ? 'Front & Rear' : locker}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {analysis.vehicleSettings.additionalNotes && analysis.vehicleSettings.additionalNotes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Tips for Your Rig
                </p>
                <ul className="space-y-1 text-sm">
                  {analysis.vehicleSettings.additionalNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics Card */}
      <Card className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Analysis Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Model</p>
              <p className="text-sm font-semibold">{metrics.model}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Cost
              </p>
              <p className="text-sm font-semibold text-green-600">
                ${metrics.cost.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Latency
              </p>
              <p className="text-sm font-semibold">
                {(metrics.latency / 1000).toFixed(2)}s
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tokens</p>
              <p className="text-sm font-semibold">
                {metrics.inputTokens + metrics.outputTokens}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}