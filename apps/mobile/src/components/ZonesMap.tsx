// Multi-zone map preview for the Home screen. Drops a pin per zone (plus the
// user's location when known) and calls `onSelectZone` when a pin is tapped.
// Renders nothing when react-native-maps isn't available (e.g. web), so the
// list view stays the canonical fallback.
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParkingZone } from '@parking/shared-types';
import { colors, radii } from '../theme/tokens';

interface Props {
  zones: ParkingZone[];
  userCoords?: { lat: number; lng: number } | null;
  onSelectZone?: (zone: ParkingZone) => void;
  height?: number;
}

function isComponent(x: unknown): boolean {
  return typeof x === 'function' || (!!x && typeof x === 'object');
}

export function ZonesMap({ zones, userCoords, onSelectZone, height = 320 }: Props) {
  const withGeo = zones.filter((z) => !!z.geo);
  if (withGeo.length === 0) return null;

  let MapView: any;
  let Marker: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-maps');
    MapView = mod.default ?? mod.MapView ?? mod;
    Marker = mod.Marker ?? mod.default?.Marker ?? MapView?.Marker;
  } catch {
    return (
      <StaticZonesMapFallback
        zones={withGeo}
        userCoords={userCoords ?? null}
        height={height}
        onSelectZone={onSelectZone}
      />
    );
  }
  // On web, react-native-maps resolves to a shim with no real exports.
  if (!isComponent(MapView) || !isComponent(Marker)) {
    return (
      <StaticZonesMapFallback
        zones={withGeo}
        userCoords={userCoords ?? null}
        height={height}
        onSelectZone={onSelectZone}
      />
    );
  }

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

function buildStaticMapUrl(zones: ParkingZone[], user?: { lat: number; lng: number } | null) {
  const region = computeRegion(zones, user);
  const base = 'https://staticmap.openstreetmap.de/staticmap.php';
  const params = new URLSearchParams({
    center: `${region.latitude},${region.longitude}`,
    zoom: '14',
    size: '1200x700',
    maptype: 'mapnik',
  });

  const markers = zones
    .filter((z) => !!z.geo)
    .map((z) => `${z.geo!.lat},${z.geo!.lng},red-pushpin`);
  if (user) markers.push(`${user.lat},${user.lng},blue-pushpin`);
  if (markers.length) params.set('markers', markers.join('|'));

  return `${base}?${params.toString()}`;
}

function StaticZonesMapFallback({
  zones,
  userCoords,
  height,
  onSelectZone,
}: {
  zones: ParkingZone[];
  userCoords: { lat: number; lng: number } | null;
  height: number;
  onSelectZone?: (zone: ParkingZone) => void;
}) {
  const staticUrl = buildStaticMapUrl(zones, userCoords);
  const firstZone = zones[0];

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.wrap, { height }]}>
        <Image source={{ uri: staticUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
      {onSelectZone ? (
        <View style={styles.fallbackActions}>
          {zones.slice(0, 4).map((z) => (
            <Pressable key={z.id} onPress={() => onSelectZone(z)} style={styles.fallbackChip}>
              <Text style={styles.fallbackChipText}>Zone {z.code}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {firstZone?.geo ? (
        <Pressable
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${firstZone.geo!.lat},${firstZone.geo!.lng}`,
            )
          }
        >
          <Text style={styles.fallbackLink}>Open in Maps</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fallbackChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fallbackChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default ZonesMap;
