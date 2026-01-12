// lib/vehicle-data.ts

import { VehicleFeature, SuspensionBrand, SuspensionTravelType } from './types';

export interface VehicleMakeModels {
  make: string;
  models: string[];
}

export const VEHICLE_MAKES_MODELS: VehicleMakeModels[] = [
  {
    make: 'Toyota',
    models: [
      '4Runner',
      'Tacoma',
      'Land Cruiser',
      'Land Cruiser 70 Series',
      'Tundra',
      'Sequoia',
      'FJ Cruiser',
      'Hilux',
    ],
  },
  {
    make: 'Jeep',
    models: [
      'Wrangler JL',
      'Wrangler JK',
      'Wrangler TJ',
      'Gladiator',
      'Grand Cherokee',
      'Cherokee',
      'Compass',
    ],
  },
  {
    make: 'Ford',
    models: [
      'Bronco',
      'Bronco Sport',
      'F-150',
      'F-250',
      'F-350',
      'Ranger',
      'Expedition',
      'Raptor',
    ],
  },
  {
    make: 'Chevrolet',
    models: [
      'Colorado',
      'Colorado ZR2',
      'Silverado',
      'Silverado ZR2',
      'Tahoe',
      'Suburban',
    ],
  },
  {
    make: 'GMC',
    models: ['Canyon', 'Canyon AT4X', 'Sierra', 'Sierra AT4X', 'Yukon'],
  },
  {
    make: 'Ram',
    models: ['1500', '1500 TRX', '2500', '2500 Power Wagon', '3500'],
  },
  {
    make: 'Nissan',
    models: ['Frontier', 'Titan', 'Xterra', 'Pathfinder', 'Patrol/Armada'],
  },
  {
    make: 'Land Rover',
    models: [
      'Defender 90',
      'Defender 110',
      'Defender 130',
      'Discovery',
      'Range Rover',
      'LR3/LR4',
    ],
  },
  {
    make: 'Lexus',
    models: ['GX 460', 'GX 550', 'LX 570', 'LX 600'],
  },
  {
    make: 'Mercedes-Benz',
    models: ['G-Class/G-Wagon', 'Sprinter 4x4', 'GLE', 'GLS'],
  },
  {
    make: 'Rivian',
    models: ['R1T', 'R1S'],
  },
  {
    make: 'Subaru',
    models: ['Outback', 'Forester', 'Crosstrek'],
  },
  {
    make: 'Mitsubishi',
    models: ['Montero/Pajero', 'Outlander'],
  },
  {
    make: 'Honda',
    models: ['Passport', 'Pilot', 'Ridgeline'],
  },
  {
    make: 'Other',
    models: ['Custom Build', 'Other'],
  },
];

export interface FeatureOption {
  value: VehicleFeature;
  label: string;
  description: string;
  category: 'tires' | 'drivetrain' | 'protection' | 'recovery' | 'accessories';
}

export const VEHICLE_FEATURES: FeatureOption[] = [
  // Tires & Suspension
  {
    value: 'lift-kit',
    label: 'Lift Kit',
    description: 'Increased ground clearance',
    category: 'tires',
  },
  {
    value: 'upgraded-suspension',
    label: 'Upgraded Suspension',
    description: 'Aftermarket shocks/springs',
    category: 'tires',
  },
  {
    value: 'all-terrain-tires',
    label: 'All-Terrain Tires',
    description: 'A/T tires for mixed conditions',
    category: 'tires',
  },
  {
    value: 'mud-terrain-tires',
    label: 'Mud-Terrain Tires',
    description: 'M/T tires for extreme conditions',
    category: 'tires',
  },
  // Drivetrain
  {
    value: 'locking-differentials',
    label: 'Locking Differentials',
    description: 'Front and/or rear lockers',
    category: 'drivetrain',
  },
  {
    value: 'front-locker',
    label: 'Front Locker',
    description: 'Front differential locker',
    category: 'drivetrain',
  },
  {
    value: 'rear-locker',
    label: 'Rear Locker',
    description: 'Rear differential locker',
    category: 'drivetrain',
  },
  {
    value: 'limited-slip-diff',
    label: 'Limited Slip Differential',
    description: 'LSD for improved traction',
    category: 'drivetrain',
  },
  // Protection
  {
    value: 'skid-plates',
    label: 'Skid Plates',
    description: 'Underbody protection',
    category: 'protection',
  },
  {
    value: 'rock-sliders',
    label: 'Rock Sliders',
    description: 'Side body protection',
    category: 'protection',
  },
  {
    value: 'steel-bumpers',
    label: 'Steel Bumpers',
    description: 'Heavy-duty front/rear bumpers',
    category: 'protection',
  },
  // Recovery
  {
    value: 'winch',
    label: 'Winch',
    description: 'Electric or hydraulic winch',
    category: 'recovery',
  },
  {
    value: 'recovery-boards',
    label: 'Recovery Boards',
    description: 'Traction boards (MaxTrax, etc.)',
    category: 'recovery',
  },
  {
    value: 'air-compressor',
    label: 'Air Compressor',
    description: 'Onboard air for tire inflation',
    category: 'recovery',
  },
  // Accessories
  {
    value: 'snorkel',
    label: 'Snorkel',
    description: 'Raised air intake',
    category: 'accessories',
  },
  {
    value: 'roof-rack',
    label: 'Roof Rack',
    description: 'Cargo rack system',
    category: 'accessories',
  },
  {
    value: 'light-bar',
    label: 'Light Bar',
    description: 'Auxiliary lighting',
    category: 'accessories',
  },
];

// Generate year options (current year down to 1990)
export const VEHICLE_YEARS: number[] = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, i) => new Date().getFullYear() - i
);

// Suspension brand options
export interface SuspensionBrandOption {
  value: SuspensionBrand;
  label: string;
  description: string;
}

export const SUSPENSION_BRANDS: SuspensionBrandOption[] = [
  { value: 'stock', label: 'Stock/OEM', description: 'Factory suspension' },
  { value: 'icon', label: 'ICON', description: 'ICON Vehicle Dynamics' },
  { value: 'king', label: 'King Shocks', description: 'King Off-Road Racing Shocks' },
  { value: 'fox', label: 'FOX', description: 'FOX Factory Racing' },
  { value: 'bilstein', label: 'Bilstein', description: 'Bilstein Shocks' },
  { value: 'dirt-king', label: 'Dirt King', description: 'Dirt King Fabrication' },
  { value: 'camburg', label: 'Camburg', description: 'Camburg Engineering' },
  { value: 'total-chaos', label: 'Total Chaos', description: 'Total Chaos Fabrication' },
  { value: 'rclt', label: 'RCLT', description: 'Race Car Long Travel' },
  { value: 'kibbetech', label: 'Kibbetech', description: 'Kibbetech Off-Road' },
  { value: 'baja-kits', label: 'Baja Kits', description: 'Baja Kits Off-Road' },
  { value: 'deaver', label: 'Deaver', description: 'Deaver Spring' },
  { value: 'ome', label: 'Old Man Emu', description: 'ARB Old Man Emu' },
  { value: 'dobinsons', label: 'Dobinsons', description: 'Dobinsons Spring & Suspension' },
  { value: 'eibach', label: 'Eibach', description: 'Eibach Springs' },
  { value: 'other', label: 'Other', description: 'Other aftermarket brand' },
];

// Suspension travel type options
export interface SuspensionTravelOption {
  value: SuspensionTravelType;
  label: string;
  description: string;
}

export const SUSPENSION_TRAVEL_TYPES: SuspensionTravelOption[] = [
  {
    value: 'stock',
    label: 'Stock',
    description: 'Factory suspension travel',
  },
  {
    value: 'oem-plus',
    label: 'OEM+',
    description: 'Upgraded shocks/springs, stock geometry (~2-3" lift)',
  },
  {
    value: 'mid-travel',
    label: 'Mid Travel',
    description: 'Extended travel arms, 10-12" of travel',
  },
  {
    value: 'long-travel',
    label: 'Long Travel',
    description: 'Full long travel kit, 12-16" of travel',
  },
  {
    value: 'race-long-travel',
    label: 'Race Long Travel',
    description: 'Race-spec LT, 16"+ travel, bypass shocks',
  },
];

// Get models for a specific make
export function getModelsForMake(make: string): string[] {
  const found = VEHICLE_MAKES_MODELS.find(
    (v) => v.make.toLowerCase() === make.toLowerCase()
  );
  return found?.models ?? [];
}

// Get all makes
export function getAllMakes(): string[] {
  return VEHICLE_MAKES_MODELS.map((v) => v.make);
}

// Get features by category
export function getFeaturesByCategory(
  category: FeatureOption['category']
): FeatureOption[] {
  return VEHICLE_FEATURES.filter((f) => f.category === category);
}

// Format feature value to display label
export function getFeatureLabel(value: VehicleFeature): string {
  return VEHICLE_FEATURES.find((f) => f.value === value)?.label ?? value;
}
