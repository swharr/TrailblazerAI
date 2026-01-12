'use client';

import { useState, useEffect, useRef } from 'react';
import { VehicleInfo, VehicleFeature, SuspensionBrand, SuspensionTravelType } from '@/lib/types';
import {
  VEHICLE_MAKES_MODELS,
  VEHICLE_FEATURES,
  VEHICLE_YEARS,
  SUSPENSION_BRANDS,
  SUSPENSION_TRAVEL_TYPES,
  getModelsForMake,
} from '@/lib/vehicle-data';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, Truck, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'trailblazer-vehicle-info';

interface VehicleInfoFormProps {
  value: VehicleInfo | null;
  onChange: (info: VehicleInfo | null) => void;
  disabled?: boolean;
}

// Load vehicle info from localStorage
function loadSavedVehicleInfo(): VehicleInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as VehicleInfo;
    }
  } catch (e) {
    console.warn('Failed to load saved vehicle info:', e);
  }
  return null;
}

// Save vehicle info to localStorage
function saveVehicleInfo(info: VehicleInfo | null) {
  if (typeof window === 'undefined') return;
  try {
    if (info) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save vehicle info:', e);
  }
}

export default function VehicleInfoForm({
  value,
  onChange,
  disabled = false,
}: VehicleInfoFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [make, setMake] = useState(value?.make ?? '');
  const [model, setModel] = useState(value?.model ?? '');
  const [year, setYear] = useState<number | undefined>(value?.year);
  const [features, setFeatures] = useState<VehicleFeature[]>(
    value?.features ?? []
  );
  const [suspensionBrand, setSuspensionBrand] = useState<SuspensionBrand | undefined>(
    value?.suspensionBrand
  );
  const [suspensionTravel, setSuspensionTravel] = useState<SuspensionTravelType | undefined>(
    value?.suspensionTravel
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [hasSavedData, setHasSavedData] = useState(false);
  const initialLoadDone = useRef(false);

  // Load saved data on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const saved = loadSavedVehicleInfo();
    if (saved && !value) {
      setMake(saved.make);
      setModel(saved.model);
      setYear(saved.year);
      setFeatures(saved.features);
      setSuspensionBrand(saved.suspensionBrand);
      setSuspensionTravel(saved.suspensionTravel);
      setHasSavedData(true);
      // Auto-open if there's saved data
      setIsOpen(true);
      onChange(saved);
    }
  }, [value, onChange]);

  // Update available models when make changes
  useEffect(() => {
    if (make) {
      setAvailableModels(getModelsForMake(make));
      // Reset model if it's not in the new list
      if (model && !getModelsForMake(make).includes(model)) {
        setModel('');
      }
    } else {
      setAvailableModels([]);
    }
  }, [make, model]);

  // Update parent when values change
  useEffect(() => {
    if (make && model) {
      onChange({
        make,
        model,
        year,
        features,
        suspensionBrand,
        suspensionTravel,
      });
    } else if (!make && !model && features.length === 0) {
      onChange(null);
    }
  }, [make, model, year, features, suspensionBrand, suspensionTravel, onChange]);

  const handleFeatureToggle = (feature: VehicleFeature) => {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSave = () => {
    if (make && model) {
      const info: VehicleInfo = { make, model, year, features, suspensionBrand, suspensionTravel };
      saveVehicleInfo(info);
      setHasSavedData(true);
    }
  };

  const handleClear = () => {
    setMake('');
    setModel('');
    setYear(undefined);
    setFeatures([]);
    setSuspensionBrand(undefined);
    setSuspensionTravel(undefined);
    saveVehicleInfo(null);
    setHasSavedData(false);
    onChange(null);
  };

  const hasVehicleInfo = make || model || year || features.length > 0;

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <span>Your Rig Info</span>
                <span className="text-xs font-normal text-muted-foreground">
                  (Optional)
                </span>
                {hasVehicleInfo && !isOpen && (
                  <span className="text-xs font-normal text-primary ml-2">
                    {make} {model} {year && `(${year})`}
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              Add your vehicle details to get personalized recommendations for
              4WD settings, tire pressure, and more.
            </p>

            {/* Make, Model, Year Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Make */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Make</label>
                <Select
                  value={make}
                  onValueChange={setMake}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_MAKES_MODELS.map((v) => (
                      <SelectItem key={v.make} value={v.make}>
                        {v.make}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <Select
                  value={model}
                  onValueChange={setModel}
                  disabled={disabled || !make}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select
                  value={year?.toString() ?? ''}
                  onValueChange={(v) => setYear(v ? parseInt(v) : undefined)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Suspension Setup */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Suspension Setup</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Suspension Brand */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Suspension Brand
                  </label>
                  <Select
                    value={suspensionBrand ?? ''}
                    onValueChange={(v) =>
                      setSuspensionBrand(v ? (v as SuspensionBrand) : undefined)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUSPENSION_BRANDS.map((brand) => (
                        <SelectItem key={brand.value} value={brand.value}>
                          {brand.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Suspension Travel */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Suspension Travel
                  </label>
                  <Select
                    value={suspensionTravel ?? ''}
                    onValueChange={(v) =>
                      setSuspensionTravel(v ? (v as SuspensionTravelType) : undefined)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select travel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUSPENSION_TRAVEL_TYPES.map((travel) => (
                        <SelectItem key={travel.value} value={travel.value}>
                          <div className="flex flex-col">
                            <span>{travel.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {travel.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Vehicle Features & Modifications
              </label>

              {/* Tires & Suspension */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tires
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_FEATURES.filter((f) => f.category === 'tires').map(
                    (feature) => (
                      <label
                        key={feature.value}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                          features.includes(feature.value)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        <Checkbox
                          checked={features.includes(feature.value)}
                          onCheckedChange={() =>
                            handleFeatureToggle(feature.value)
                          }
                          disabled={disabled}
                        />
                        <span className="text-sm">{feature.label}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Drivetrain */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Drivetrain
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_FEATURES.filter(
                    (f) => f.category === 'drivetrain'
                  ).map((feature) => (
                    <label
                      key={feature.value}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                        features.includes(feature.value)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={features.includes(feature.value)}
                        onCheckedChange={() =>
                          handleFeatureToggle(feature.value)
                        }
                        disabled={disabled}
                      />
                      <span className="text-sm">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Protection */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Protection
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_FEATURES.filter(
                    (f) => f.category === 'protection'
                  ).map((feature) => (
                    <label
                      key={feature.value}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                        features.includes(feature.value)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={features.includes(feature.value)}
                        onCheckedChange={() =>
                          handleFeatureToggle(feature.value)
                        }
                        disabled={disabled}
                      />
                      <span className="text-sm">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Recovery */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recovery
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_FEATURES.filter((f) => f.category === 'recovery').map(
                    (feature) => (
                      <label
                        key={feature.value}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                          features.includes(feature.value)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        <Checkbox
                          checked={features.includes(feature.value)}
                          onCheckedChange={() =>
                            handleFeatureToggle(feature.value)
                          }
                          disabled={disabled}
                        />
                        <span className="text-sm">{feature.label}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Accessories */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Accessories
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_FEATURES.filter(
                    (f) => f.category === 'accessories'
                  ).map((feature) => (
                    <label
                      key={feature.value}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                        features.includes(feature.value)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={features.includes(feature.value)}
                        onCheckedChange={() =>
                          handleFeatureToggle(feature.value)
                        }
                        disabled={disabled}
                      />
                      <span className="text-sm">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {hasVehicleInfo && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={disabled || !make || !model}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {hasSavedData ? 'Update Saved Rig' : 'Remember My Rig'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={disabled}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
            {hasSavedData && (
              <p className="text-xs text-muted-foreground text-center">
                ✓ Your rig info is saved and will be remembered for future analyses
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
