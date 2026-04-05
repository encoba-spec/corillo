/**
 * Location fuzzing for privacy.
 * Rounds coordinates to a ~500m grid so exact start/end points
 * are never exposed to other users.
 */

// ~500m grid at mid-latitudes (0.005 degrees ~ 500m)
const GRID_SIZE = 0.005;

/**
 * Fuzz a coordinate to the nearest grid point.
 * Deterministic: same input always produces same output.
 */
export function fuzzCoordinate(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat / GRID_SIZE) * GRID_SIZE,
    lng: Math.round(lng / GRID_SIZE) * GRID_SIZE,
  };
}

/**
 * Calculate haversine distance between two points in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
