// lib/types/trail-recorder.ts
// Types for the Trail Recorder feature

export interface Coordinates {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface TrailRecordPhotoInput {
  imageData: string; // Base64 encoded image data
  mimeType: string; // image/jpeg, image/png, etc.
  caption?: string;
  order: number;
  latitude?: number;
  longitude?: number;
  takenAt?: string; // ISO date string
}

export interface TrailRecordPhoto extends TrailRecordPhotoInput {
  id: string;
  trailRecordId: string;
  createdAt: string;
}

export interface TrailRecordInput {
  name: string;
  location?: string;
  description?: string;
  date?: string; // ISO date string
  difficulty?: number; // 1-5
  trailType?: string[];
  distance?: number; // miles
  duration?: number; // minutes
  startCoordinates?: Coordinates;
  endCoordinates?: Coordinates;
  gpsTrack?: Coordinates[];
  photos?: TrailRecordPhotoInput[];
}

export interface TrailRecord {
  id: string;
  userId: string;
  name: string;
  location?: string;
  description?: string;
  date: string;
  difficulty?: number;
  trailType: string[];
  distance?: number;
  duration?: number;
  startCoordinates?: Coordinates;
  endCoordinates?: Coordinates;
  gpsTrack?: Coordinates[];
  photos: TrailRecordPhoto[];
  isPublic: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrailRecordListItem {
  id: string;
  name: string;
  location?: string;
  date: string;
  difficulty?: number;
  distance?: number;
  photoCount: number;
  isPublic: boolean;
  // First photo thumbnail for preview
  thumbnailUrl?: string;
}

// Trail type options for the form
export const TRAIL_TYPE_OPTIONS = [
  'dirt',
  'rock',
  'sand',
  'mud',
  'gravel',
  'water-crossing',
  'snow',
  'paved',
] as const;

export type TrailType = (typeof TRAIL_TYPE_OPTIONS)[number];
