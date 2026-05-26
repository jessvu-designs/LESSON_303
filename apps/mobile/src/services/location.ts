// Lightweight wrapper around expo-location.
// Requests permission on demand and returns the current coords (or null).
import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Distance between two points in meters (Haversine). */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.round(meters)} m`;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/**
 * Best-effort reverse geocode via expo-location (uses the platform geocoder
 * on iOS/Android — no API key needed). Returns null on web or on failure.
 */
export async function reverseGeocode(coords: Coords): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    const first = results[0];
    if (!first) return null;
    // Prefer a "123 Main St" style; fall back to whatever pieces exist.
    const street = [first.streetNumber, first.street].filter(Boolean).join(' ');
    const locality = [first.city, first.region].filter(Boolean).join(', ');
    return [street || first.name, locality].filter(Boolean).join(' · ') || null;
  } catch {
    return null;
  }
}
