// lib/types.ts

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'bedrock' | 'xai';

export type ModelName =
  // Anthropic models
  | 'claude-sonnet-4-20250514'
  | 'claude-opus-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  // OpenAI models
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'o1'
  | 'o1-mini'
  // Google models
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-pro'
  | 'gemini-pro-vision'
  // xAI (Grok) models
  | 'grok-2'
  | 'grok-2-vision'
  | 'grok-2-vision-1212';

export interface ModelConfig {
  provider: ModelProvider;
  name: ModelName;
  displayName: string;
  supportsVision: boolean;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
}

export interface TrailAnalysis {
  difficulty: number; // 1-5
  trailType: string[];
  conditions: string[];
  hazards: string[];
  recommendations: string[];
  bestFor: string[];
  summary: string;
  rawResponse: string;
  // Vehicle-specific recommendations (when vehicle info provided)
  vehicleSettings?: VehicleSettings;
  // Fuel estimates
  fuelEstimate?: FuelEstimate;
  // Emergency communication recommendations
  emergencyComms?: EmergencyComms;
  // Starlink satellite coverage assessment
  starlinkCoverage?: StarlinkCoverage;
}

// Fuel estimate for the trail
export interface FuelEstimate {
  bestCase: string;
  worstCase: string;
  notes?: string;
}

// Emergency communication recommendations
export interface EmergencyComms {
  cellCoverage: 'none' | 'limited' | 'moderate' | 'good';
  recommendedMethods: string[];
  notes?: string;
  // Inter-vehicle communication recommendations
  interVehicleComms?: {
    recommendedChannel: string; // e.g., "GMRS Channel 19" or "Ham 146.520 MHz"
    channelType: 'gmrs' | 'ham' | 'frs' | 'cb';
    frequency?: string; // e.g., "462.650 MHz"
    notes?: string;
  };
  // Emergency/distress frequencies
  emergencyFrequencies?: {
    primary: string; // e.g., "GMRS Channel 20 (462.675 MHz)"
    secondary?: string;
    hamEmergency?: string; // e.g., "146.520 MHz (Ham Calling)"
    notes?: string;
  };
  // Local authority contacts
  localAuthorities?: {
    sheriff?: string; // e.g., "Nye County Sheriff: (775) 482-8101"
    searchAndRescue?: string;
    blm?: string; // Bureau of Land Management office
    nps?: string; // National Park Service
    forestService?: string; // USFS
    stateParks?: string;
    emergencyServices?: string; // e.g., "911 (if cell coverage available)"
    notes?: string;
  };
  // Off-road recovery services
  recoveryServices?: {
    recommended?: string; // e.g., "Vegas Off-Road Recovery: (702) 555-1234"
    alternates?: string[];
    localClubs?: string[]; // e.g., ["Nevada 4x4 Club", "High Desert Runners"]
    notes?: string;
  };
}

// Starlink satellite coverage assessment
export type StarlinkCoverageLevel =
  | 'high-performance'
  | 'good-coverage'
  | 'some-issues'
  | 'major-obstructions'
  | 'zero-availability';

export interface StarlinkCoverage {
  coverage: StarlinkCoverageLevel;
  confidence: 'low' | 'medium' | 'high';
  obstructions?: string[]; // e.g., ["dense tree canopy", "canyon walls"]
  bestSpots?: string[]; // e.g., ["ridgelines", "open meadows"]
  notes?: string;
}

// Vehicle-specific settings and recommendations
export interface VehicleSettings {
  transferCase: '2H' | '4H' | '4L' | 'AWD';
  recommendedTirePressure?: {
    front: number;
    rear: number;
    unit: 'psi' | 'bar';
  };
  tractionControl: 'on' | 'off' | 'trail-mode';
  lockers?: ('front' | 'rear' | 'both' | 'none')[];
  additionalNotes: string[];
}

// User's vehicle information
export interface VehicleInfo {
  id?: string; // Database ID if saved vehicle
  make: string;
  model: string;
  year?: number;
  features: VehicleFeature[];
  // Suspension setup
  suspensionBrand?: SuspensionBrand;
  suspensionTravel?: SuspensionTravelType;
}

// Suspension kit brands and combinations
// Supports both standalone brands and kit+shock combos (e.g., Camburg + King)
export type SuspensionBrand =
  // Stock/OEM
  | 'stock'
  // Complete systems (shocks included)
  | 'icon'
  | 'fox'
  | 'king'
  | 'bilstein'
  | 'ome'
  | 'dobinsons'
  | 'eibach'
  // Kit manufacturers (pair with shock brand)
  | 'camburg'
  | 'camburg-king'
  | 'camburg-fox'
  | 'camburg-complete'
  | 'dirt-king'
  | 'dirt-king-king'
  | 'dirt-king-fox'
  | 'total-chaos'
  | 'total-chaos-king'
  | 'total-chaos-fox'
  | 'rclt'
  | 'rclt-king'
  | 'rclt-fox'
  | 'kibbetech'
  | 'kibbetech-king'
  | 'kibbetech-fox'
  | 'baja-kits'
  | 'baja-kits-king'
  | 'baja-kits-fox'
  // Leaf spring specialists
  | 'deaver'
  | 'deaver-king'
  | 'deaver-fox'
  | 'other';

// Suspension travel types
export type SuspensionTravelType =
  | 'stock'
  | 'oem-plus'
  | 'mid-travel'
  | 'long-travel'
  | 'race-long-travel';

export type VehicleFeature =
  | 'lift-kit'
  | 'all-terrain-tires'
  | 'mud-terrain-tires'
  | 'locking-differentials'
  | 'front-locker'
  | 'rear-locker'
  | 'limited-slip-diff'
  | 'winch'
  | 'skid-plates'
  | 'rock-sliders'
  | 'roof-rack'
  | 'recovery-boards'
  | 'air-compressor'
  | 'snorkel'
  | 'upgraded-suspension'
  | 'steel-bumpers'
  | 'light-bar';

// Additional context for analysis
export interface AnalysisContext {
  trailName?: string;
  trailLocation?: string;
  additionalNotes?: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface AnalysisMetrics {
  model: ModelName;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number; // milliseconds
  timestamp: string;
}

export interface AnalysisResult {
  analysis: TrailAnalysis;
  metrics: AnalysisMetrics;
  imageUrl?: string;
  id?: string; // Database ID if saved
}
// Trail and Route Types
export interface Coordinates {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface Waypoint {
  id: string;
  name: string;
  coordinates: Coordinates;
  description?: string;
  type: WaypointType;
}

export type WaypointType =
  | 'start'
  | 'end'
  | 'campsite'
  | 'water'
  | 'viewpoint'
  | 'hazard'
  | 'fuel'
  | 'custom';

export interface Trail {
  id: string;
  name: string;
  description?: string;
  waypoints: Waypoint[];
  difficulty: TrailDifficulty;
  distance: number; // in kilometers
  estimatedTime: number; // in hours
  elevationGain: number; // in meters
  terrain: TerrainType[];
  createdAt: Date;
  updatedAt: Date;
}

export type TrailDifficulty = 'easy' | 'moderate' | 'difficult' | 'expert';

export type TerrainType =
  | 'paved'
  | 'gravel'
  | 'dirt'
  | 'sand'
  | 'rock'
  | 'mud'
  | 'water-crossing'
  | 'snow';

// Photo Analysis Types
export interface PhotoAnalysis {
  id: string;
  imageUrl: string;
  analyzedAt: Date;
  terrainConditions: TerrainCondition[];
  obstacles: Obstacle[];
  recommendations: string[];
  confidence: number; // 0-1
}

export interface TerrainCondition {
  type: TerrainType;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface Obstacle {
  type: string;
  description: string;
  coordinates?: Coordinates;
  clearanceRequired?: number; // in centimeters
}

// Route Planning Types
export interface Route {
  id: string;
  name: string;
  trails: Trail[];
  totalDistance: number;
  totalTime: number;
  startDate?: Date;
  endDate?: Date;
  status: RouteStatus;
}

export type RouteStatus = 'draft' | 'planned' | 'active' | 'completed';

// User Dashboard Types
export interface DashboardStats {
  totalRoutes: number;
  totalDistance: number;
  totalTrails: number;
  photosAnalyzed: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Navigation Types
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  description?: string;
}

// Comparison Mode Types
export interface ComparisonRequest {
  models: ModelName[];
  images: string[]; // base64 encoded
  vehicleInfo?: VehicleInfo;
  context?: AnalysisContext;
}

export interface ComparisonResult {
  results: Record<string, AnalysisResult>;
  errors: Record<string, string>;
  totalCost: number;
  totalLatency: number;
}
