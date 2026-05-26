// Multi-zone map preview for the Home screen. Drops a pin per zone (plus the
// user's location when known) and calls `onSelectZone` when a pin is tapped.
// Renders nothing when react-native-maps isn't available (e.g. web), so the
// list view stays the canonical fallback.
import { StyleSheet, View } from 'react-native';
import type { ParkingZone } from '@parking/shared-types';
import { colors, radii } from '../theme/tokens';

interface Props {
  zones: ParkingZone[];
  userCoords?: { lat: number; lng: number } | null;
  onSelectZone?: (zone: ParkingZone) => void;
  height?: number;
}

export function ZonesMap({ zones, userCoords, onSelectZone, height = 320 }: Props) {
  const withGeo = zones.filter((z) => !!z.geo);
  if (withGeo.length === 0) return null;

  let MapView: any;
  let Marker: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-maps');
    MapView = mod.default ?? mod.MapView;
    Marker = mod.Marker;
  } catch {
    return null;
  }
  // On web, react-native-maps resolves to a shim with no real exports.
  if (typeof MapView !== 'function' || typeof Marker !== 'function') return null;

  const region = computeRegion(withGeo, userCoords);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
        {withGeo.map((z) => (
          <Marker
            key={z.id}
            coordinate={{ latitude: z.geo!.lat, longitude: z.geo!.lng }}
            title={z.displayName}
            description={`Zone ${z.code}`}
            onCalloutPress={() => onSelectZone?.(z)}
            onPress={() => onSelectZone?.(z)}
          />
        ))}
        {userCoords ? (
          <Marker
            coordinate={{ latitude: userCoords.lat, longitude: userCoords.lng }}
            title="You"
            pinColor="blue"
          />
        ) : null}
      </MapView>
    </View>
  );
}

/** Fit the visible region around all zone pins (and the user pin if present). */
function computeRegion(
  zones: ParkingZone[],
  user?: { lat: number; lng: number } | null,
) {
  const points: Array<{ lat: number; lng: number }> = zones.map((z) => z.geo!);
  if (user) points.push(user);

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  // Add 60% padding so pins aren't flush against the edges, and clamp a sane
  // minimum so a single pin doesn't render at maximum zoom.
  const latitudeDelta = Math.max((maxLat - minLat) * 1.6, 0.01);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.6, 0.01);
  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
