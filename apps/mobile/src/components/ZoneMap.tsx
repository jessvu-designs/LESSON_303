// Small map preview for a parking zone. Drops a pin at the zone location
// (and optionally the user's location). Renders nothing if react-native-maps
// isn't available in the current runtime (e.g. web).
//
// When `onUserCoordsChange` is provided the user marker becomes draggable,
// letting the driver fine-tune the exact parking spot when GPS lands
// between two zones.
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
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

function projectPoint(
  lat: number,
  lng: number,
  center: { lat: number; lng: number },
  delta = 0.01,
): any {
  const x = ((lng - (center.lng - delta / 2)) / delta) * 100;
  const y = (1 - (lat - (center.lat - delta / 2)) / delta) * 100;
  return {
    left: `${Math.min(96, Math.max(4, x))}%`,
    top: `${Math.min(96, Math.max(4, y))}%`,
  };
}

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

function buildTileUrl(center: { lat: number; lng: number }, delta = 0.01) {
  const zoom = delta > 0.02 ? 14 : 16;
  const tile = latLngToTile(center.lat, center.lng, zoom);
  return `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;
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
  const center = userCoords ?? zone.geo!;
  const tileUrl = buildTileUrl(center);
  const [tileFailed, setTileFailed] = useState(false);
  const useSchematic = Platform.OS !== 'web' || tileFailed;

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.wrap, { height }]}> 
        {!useSchematic ? (
          <Image
            source={{ uri: tileUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setTileFailed(true)}
          />
        ) : (
          <View style={styles.fallbackMapBg}>
            <View style={[styles.pin, styles.pinZone, projectPoint(zone.geo!.lat, zone.geo!.lng, center)]} />
            {userCoords ? (
              <View style={[styles.pin, styles.pinUser, projectPoint(userCoords.lat, userCoords.lng, center)]} />
            ) : null}
            <Text style={styles.fallbackLegend}>
              {tileFailed ? 'Map preview (fallback)' : 'Schematic map preview'}
            </Text>
          </View>
        )}
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
    backgroundColor: '#0a1835',
  },
  fallbackMapBg: {
    flex: 1,
    backgroundColor: '#06122b',
  },
  pin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginLeft: -6,
    marginTop: -6,
  },
  pinZone: {
    backgroundColor: '#ef4444',
    borderColor: '#fecaca',
  },
  pinUser: {
    backgroundColor: '#3b82f6',
    borderColor: '#bfdbfe',
  },
  fallbackLegend: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    color: colors.textMuted,
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fallbackLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default ZoneMap;
