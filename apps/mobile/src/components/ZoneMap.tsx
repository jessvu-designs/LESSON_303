// Small map preview for a parking zone. Drops a pin at the zone location
// (and optionally the user's location). Renders nothing if react-native-maps
// isn't available in the current runtime (e.g. web).
//
// When `onUserCoordsChange` is provided the user marker becomes draggable,
// letting the driver fine-tune the exact parking spot when GPS lands
// between two zones.
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParkingZone } from '@parking/shared-types';
import { colors, radii } from '../theme/tokens';

interface Props {
  zone: ParkingZone;
  userCoords?: { lat: number; lng: number } | null;
  height?: number;
  /** When set, the user marker is draggable and emits new coords on drop. */
  onUserCoordsChange?: (coords: { lat: number; lng: number }) => void;
  /** Subtitle shown on the user marker callout (e.g. reverse-geocoded address). */
  userMarkerSubtitle?: string;
}

function isComponent(x: unknown): boolean {
  return typeof x === 'function' || (!!x && typeof x === 'object');
}

export function ZoneMap({
  zone,
  userCoords,
  height = 180,
  onUserCoordsChange,
  userMarkerSubtitle,
}: Props) {
  if (!zone.geo) return null;

  let MapView: any;
  let Marker: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-maps');
    MapView = mod.default ?? mod.MapView ?? mod;
    Marker = mod.Marker ?? mod.default?.Marker ?? MapView?.Marker;
  } catch {
    return (
      <StaticZoneMapFallback
        zone={zone}
        userCoords={userCoords ?? null}
        height={height}
      />
    );
  }
  // On web, react-native-maps resolves to a shim with no real exports.
  if (!isComponent(MapView) || !isComponent(Marker)) {
    return (
      <StaticZoneMapFallback
        zone={zone}
        userCoords={userCoords ?? null}
        height={height}
      />
    );
  }

  const draggable = !!onUserCoordsChange;

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        // Allow gestures when the user can drag the pin so they can pan/zoom
        // to position it accurately.
        pointerEvents={draggable ? 'auto' : 'none'}
        initialRegion={{
          latitude: (userCoords ?? zone.geo).lat,
          longitude: (userCoords ?? zone.geo).lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        <Marker
          coordinate={{ latitude: zone.geo.lat, longitude: zone.geo.lng }}
          title={zone.displayName}
          description={zone.address ?? undefined}
        />
        {userCoords ? (
          <Marker
            coordinate={{ latitude: userCoords.lat, longitude: userCoords.lng }}
            title={draggable ? 'Your spot (drag to adjust)' : 'You'}
            description={userMarkerSubtitle}
            pinColor="blue"
            draggable={draggable}
            onDragEnd={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
              if (!onUserCoordsChange) return;
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onUserCoordsChange({ lat: latitude, lng: longitude });
            }}
          />
        ) : null}
      </MapView>
    </View>
  );
}

function buildStaticMapUrl(zone: ParkingZone, user?: { lat: number; lng: number } | null) {
  const focus = user ?? zone.geo!;
  const base = 'https://staticmap.openstreetmap.de/staticmap.php';
  const params = new URLSearchParams({
    center: `${focus.lat},${focus.lng}`,
    zoom: '16',
    size: '1200x700',
    maptype: 'mapnik',
  });

  const markers = [`${zone.geo!.lat},${zone.geo!.lng},red-pushpin`];
  if (user) markers.push(`${user.lat},${user.lng},blue-pushpin`);
  params.set('markers', markers.join('|'));
  return `${base}?${params.toString()}`;
}

function StaticZoneMapFallback({
  zone,
  userCoords,
  height,
}: {
  zone: ParkingZone;
  userCoords: { lat: number; lng: number } | null;
  height: number;
}) {
  const staticUrl = buildStaticMapUrl(zone, userCoords);

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.wrap, { height }]}> 
        <Image source={{ uri: staticUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
      <Pressable
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${zone.geo!.lat},${zone.geo!.lng}`,
          )
        }
      >
        <Text style={styles.fallbackLink}>Open in Maps</Text>
      </Pressable>
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
  fallbackLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default ZoneMap;
