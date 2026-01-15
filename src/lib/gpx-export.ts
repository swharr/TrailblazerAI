/**
 * GPX Export Utility
 * Generates GPX 1.1 XML files compatible with:
 * - OnX Offroad
 * - Gaia GPS
 * - AllTrails
 * - Garmin devices
 * - Avenza Maps
 */

export interface GpxWaypoint {
  lat: number;
  lng: number;
  elevation?: number;
  name?: string;
  type?: string;
  description?: string;
}

export interface GpxRouteOptions {
  name: string;
  description?: string;
  waypoints: GpxWaypoint[];
  author?: string;
  includeTrack?: boolean; // Include as track (trk) in addition to route (rte)
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Map waypoint type to GPX symbol name
 * These symbols are recognized by most GPS apps
 */
function getWaypointSymbol(type?: string): string {
  const symbolMap: Record<string, string> = {
    start: 'Flag, Green',
    end: 'Flag, Red',
    waypoint: 'Waypoint',
    campsite: 'Campground',
    water: 'Water Source',
    fuel: 'Gas Station',
    hazard: 'Danger Area',
    viewpoint: 'Scenic Area',
  };
  return symbolMap[type || ''] || 'Waypoint';
}

/**
 * Generate GPX 1.1 XML from route data
 * @param options Route options including name, description, and waypoints
 * @returns GPX XML string
 */
export function generateGPX(options: GpxRouteOptions): string {
  const { name, description, waypoints, author = 'TrailBlazer AI', includeTrack = true } = options;

  const timestamp = new Date().toISOString();

  // Build waypoint elements (wpt) - standalone points of interest
  const waypointElements = waypoints
    .filter((wp) => wp.name || wp.type)
    .map((wp) => {
      const lines = [
        `    <wpt lat="${wp.lat}" lon="${wp.lng}">`,
        wp.elevation !== undefined ? `      <ele>${wp.elevation}</ele>` : null,
        wp.name ? `      <name>${escapeXml(wp.name)}</name>` : null,
        wp.description ? `      <desc>${escapeXml(wp.description)}</desc>` : null,
        `      <sym>${getWaypointSymbol(wp.type)}</sym>`,
        wp.type ? `      <type>${escapeXml(wp.type)}</type>` : null,
        `    </wpt>`,
      ];
      return lines.filter(Boolean).join('\n');
    })
    .join('\n');

  // Build route element (rte) - for navigation
  const routePointElements = waypoints
    .map((wp) => {
      const lines = [
        `      <rtept lat="${wp.lat}" lon="${wp.lng}">`,
        wp.elevation !== undefined ? `        <ele>${wp.elevation}</ele>` : null,
        wp.name ? `        <name>${escapeXml(wp.name)}</name>` : null,
        `      </rtept>`,
      ];
      return lines.filter(Boolean).join('\n');
    })
    .join('\n');

  const routeElement = `    <rte>
      <name>${escapeXml(name)}</name>${description ? `\n      <desc>${escapeXml(description)}</desc>` : ''}
${routePointElements}
    </rte>`;

  // Build track element (trk) - for recording/playback
  let trackElement = '';
  if (includeTrack) {
    const trackPointElements = waypoints
      .map((wp) => {
        const lines = [
          `        <trkpt lat="${wp.lat}" lon="${wp.lng}">`,
          wp.elevation !== undefined ? `          <ele>${wp.elevation}</ele>` : null,
          `        </trkpt>`,
        ];
        return lines.filter(Boolean).join('\n');
      })
      .join('\n');

    trackElement = `
    <trk>
      <name>${escapeXml(name)}</name>${description ? `\n      <desc>${escapeXml(description)}</desc>` : ''}
      <trkseg>
${trackPointElements}
      </trkseg>
    </trk>`;
  }

  // Assemble full GPX document
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${escapeXml(author)}"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>${description ? `\n    <desc>${escapeXml(description)}</desc>` : ''}
    <author>
      <name>${escapeXml(author)}</name>
    </author>
    <time>${timestamp}</time>
  </metadata>
${waypointElements ? waypointElements + '\n' : ''}${routeElement}${trackElement}
</gpx>`;

  return gpx;
}

/**
 * Calculate total distance between waypoints in miles
 * Uses Haversine formula
 */
export function calculateRouteDistance(waypoints: GpxWaypoint[]): number {
  if (waypoints.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    totalDistance += haversineDistance(
      waypoints[i - 1].lat,
      waypoints[i - 1].lng,
      waypoints[i].lat,
      waypoints[i].lng
    );
  }
  return totalDistance;
}

/**
 * Haversine formula to calculate distance between two points
 * @returns Distance in miles
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate total elevation gain in feet
 * Only counts uphill segments
 */
export function calculateElevationGain(waypoints: GpxWaypoint[]): number {
  if (waypoints.length < 2) return 0;

  let totalGain = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1].elevation;
    const curr = waypoints[i].elevation;
    if (prev !== undefined && curr !== undefined && curr > prev) {
      totalGain += curr - prev;
    }
  }
  return totalGain;
}

/**
 * Estimate travel time based on distance and terrain
 * @param distance Distance in miles
 * @param avgSpeedMph Average speed (default 15 mph for off-road)
 * @returns Estimated time in minutes
 */
export function estimateTravelTime(distance: number, avgSpeedMph: number = 15): number {
  return Math.round((distance / avgSpeedMph) * 60);
}
