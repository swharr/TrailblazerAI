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
