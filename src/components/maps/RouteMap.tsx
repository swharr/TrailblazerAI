'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import type { LineLayerSpecification } from 'mapbox-gl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Layers,
  MapPin,
  Mountain,
  Droplets,
  Fuel,
  AlertTriangle,
  Camera,
  Tent,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface RouteWaypoint {
  id: string;
  lat: number;
  lng: number;
  elevation?: number;
  name?: string;
  type?: WaypointType;
}

export type WaypointType =
  | 'start'
  | 'end'
  | 'waypoint'
  | 'campsite'
  | 'water'
  | 'fuel'
  | 'hazard'
  | 'viewpoint';

interface RouteMapProps {
  waypoints: RouteWaypoint[];
  onWaypointsChange?: (waypoints: RouteWaypoint[]) => void;
  editable?: boolean;
  initialViewState?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Default to center of continental US
const DEFAULT_VIEW = {
  latitude: 39.8283,
  longitude: -98.5795,
  zoom: 4,
};

// Waypoint type icons and colors
const WAYPOINT_CONFIG: Record<
  WaypointType,
  { icon: typeof MapPin; color: string; label: string }
> = {
  start: { icon: Flag, color: 'bg-green-500', label: 'Start' },
  end: { icon: Flag, color: 'bg-red-500', label: 'End' },
  waypoint: { icon: MapPin, color: 'bg-blue-500', label: 'Waypoint' },
  campsite: { icon: Tent, color: 'bg-orange-500', label: 'Campsite' },
  water: { icon: Droplets, color: 'bg-cyan-500', label: 'Water' },
  fuel: { icon: Fuel, color: 'bg-yellow-500', label: 'Fuel' },
  hazard: { icon: AlertTriangle, color: 'bg-red-600', label: 'Hazard' },
  viewpoint: { icon: Camera, color: 'bg-purple-500', label: 'Viewpoint' },
};

// Route line style
const routeLineStyle: LineLayerSpecification = {
  id: 'route-line',
  type: 'line',
  source: 'route',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 3,
    'line-opacity': 0.8,
  },
};

export default function RouteMap({
  waypoints,
  onWaypointsChange,
  editable = true,
  initialViewState,
  className,
}: RouteMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'satellite'>('outdoors');
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  const [newWaypointType, setNewWaypointType] = useState<WaypointType>('waypoint');
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [draggingWaypointId, setDraggingWaypointId] = useState<string | null>(null);

  // Handle map click to add waypoint
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (!isAddingWaypoint || !editable || !onWaypointsChange) return;

      const newWaypoint: RouteWaypoint = {
        id: crypto.randomUUID(),
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
        type: newWaypointType,
        name:
          newWaypointType === 'start'
            ? 'Start'
            : newWaypointType === 'end'
              ? 'End'
              : `Waypoint ${waypoints.length + 1}`,
      };

      onWaypointsChange([...waypoints, newWaypoint]);
      setIsAddingWaypoint(false);
    },
    [isAddingWaypoint, editable, onWaypointsChange, waypoints, newWaypointType]
  );

  // Handle waypoint drag
  const handleWaypointDrag = useCallback(
    (waypointId: string, lat: number, lng: number) => {
      if (!editable || !onWaypointsChange) return;

      const updatedWaypoints = waypoints.map((wp) =>
        wp.id === waypointId ? { ...wp, lat, lng } : wp
      );
      onWaypointsChange(updatedWaypoints);
    },
    [editable, onWaypointsChange, waypoints]
  );

  // Delete waypoint
  const handleDeleteWaypoint = useCallback(
    (waypointId: string) => {
      if (!editable || !onWaypointsChange) return;

      onWaypointsChange(waypoints.filter((wp) => wp.id !== waypointId));
      setSelectedWaypointId(null);
    },
    [editable, onWaypointsChange, waypoints]
  );

  // Fit bounds to waypoints
  useEffect(() => {
    if (waypoints.length > 0 && mapRef.current) {
      const bounds = waypoints.reduce(
        (acc, wp) => {
          return {
            minLng: Math.min(acc.minLng, wp.lng),
            maxLng: Math.max(acc.maxLng, wp.lng),
            minLat: Math.min(acc.minLat, wp.lat),
            maxLat: Math.max(acc.maxLat, wp.lat),
          };
        },
        { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
      );

      if (bounds.minLng !== Infinity) {
        mapRef.current.fitBounds(
          [
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat],
          ],
          { padding: 50, maxZoom: 14, duration: 1000 }
        );
      }
    }
  }, [waypoints, waypoints.length]);

  // Check for Mapbox token - must be after all hooks
  if (!MAPBOX_TOKEN) {
    return (
      <div className={cn('flex items-center justify-center bg-muted rounded-lg', className)}>
        <div className="text-center p-8">
          <Mountain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Mapbox Not Configured</p>
          <p className="text-sm text-muted-foreground">
            Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables.
          </p>
        </div>
      </div>
    );
  }

  // Generate GeoJSON line from waypoints
  const routeGeoJson = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
    },
  };

  return (
    <div className={cn('relative rounded-lg overflow-hidden', className)}>
      {/* Map Controls */}
      {editable && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {/* Add Waypoint Toggle */}
          <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg p-2 space-y-2">
            <Button
              size="sm"
              variant={isAddingWaypoint ? 'default' : 'outline'}
              onClick={() => setIsAddingWaypoint(!isAddingWaypoint)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAddingWaypoint ? 'Click map to add' : 'Add Waypoint'}
            </Button>

            {isAddingWaypoint && (
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(WAYPOINT_CONFIG) as WaypointType[]).map((type) => {
                  const config = WAYPOINT_CONFIG[type];
                  const Icon = config.icon;
                  return (
                    <Button
                      key={type}
                      size="sm"
                      variant={newWaypointType === type ? 'default' : 'ghost'}
                      onClick={() => setNewWaypointType(type)}
                      className="justify-start text-xs px-2"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Map Style Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMapStyle(mapStyle === 'outdoors' ? 'satellite' : 'outdoors')}
            className="bg-background/95 backdrop-blur shadow-lg"
          >
            <Layers className="h-4 w-4 mr-2" />
            {mapStyle === 'outdoors' ? 'Satellite' : 'Terrain'}
          </Button>
        </div>
      )}

      {/* Waypoint Info Panel */}
      {selectedWaypointId && editable && (
        <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur rounded-lg shadow-lg p-3 min-w-[200px]">
          {(() => {
            const wp = waypoints.find((w) => w.id === selectedWaypointId);
            if (!wp) return null;
            const config = WAYPOINT_CONFIG[wp.type || 'waypoint'];
            const Icon = config.icon;
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1 rounded', config.color)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">{wp.name || 'Waypoint'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteWaypoint(selectedWaypointId)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Map */}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState || DEFAULT_VIEW}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        mapStyle={
          mapStyle === 'outdoors'
            ? 'mapbox://styles/mapbox/outdoors-v12'
            : 'mapbox://styles/mapbox/satellite-streets-v12'
        }
        onClick={handleMapClick}
        cursor={isAddingWaypoint ? 'crosshair' : 'grab'}
        terrain={mapStyle === 'outdoors' ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
      >
        <NavigationControl position="bottom-right" />

        {/* Terrain source for 3D effect */}
        {mapStyle === 'outdoors' && (
          <Source
            id="mapbox-dem"
            type="raster-dem"
            url="mapbox://mapbox.mapbox-terrain-dem-v1"
            tileSize={512}
            maxzoom={14}
          />
        )}

        {/* Route Line */}
        {waypoints.length >= 2 && (
          <Source id="route" type="geojson" data={routeGeoJson}>
            <Layer {...routeLineStyle} />
          </Source>
        )}

        {/* Waypoint Markers */}
        {waypoints.map((wp, index) => {
          const config = WAYPOINT_CONFIG[wp.type || 'waypoint'];
          const Icon = config.icon;
          const isSelected = selectedWaypointId === wp.id;
          const isDragging = draggingWaypointId === wp.id;

          return (
            <Marker
              key={wp.id}
              latitude={wp.lat}
              longitude={wp.lng}
              anchor="bottom"
              draggable={editable}
              onDragStart={() => setDraggingWaypointId(wp.id)}
              onDrag={(e) => handleWaypointDrag(wp.id, e.lngLat.lat, e.lngLat.lng)}
              onDragEnd={() => setDraggingWaypointId(null)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWaypointId(isSelected ? null : wp.id);
                }}
                className={cn(
                  'flex flex-col items-center transition-transform',
                  isDragging && 'scale-125',
                  isSelected && 'scale-110'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-full shadow-lg border-2 border-white',
                    config.color,
                    isSelected && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <Badge variant="secondary" className="mt-1 text-xs whitespace-nowrap">
                  {index + 1}. {wp.name || config.label}
                </Badge>
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* Instructions overlay when adding */}
      {isAddingWaypoint && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="default" className="bg-primary text-primary-foreground px-4 py-2">
            Click anywhere on the map to add a {WAYPOINT_CONFIG[newWaypointType].label.toLowerCase()}
          </Badge>
        </div>
      )}
    </div>
  );
}
