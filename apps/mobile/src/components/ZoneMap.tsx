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

  if (Platform.OS === 'web') {
    return (
      <StaticZoneMapFallback
        zone={zone}
        userCoords={userCoords ?? null}
        height={height}
      />
    );
  }

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
  const center = userCoords ?? zone.geo;
  const latitudeDelta = userCoords ? 0.0025 : 0.004;
  const longitudeDelta = userCoords ? 0.0025 : 0.004;

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        // Keep the map interactive so the user can pinch to zoom and pan.
        pointerEvents="auto"
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta,
          longitudeDelta,
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

const WEB_TILE_SIZE = 256;
const WEB_TILE_GRID = 3;
const WEB_TILE_CANVAS = WEB_TILE_SIZE * WEB_TILE_GRID;

function latLngToWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = WEB_TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

function webZoomForZone(delta = 0.01) {
  return delta > 0.02 ? 14 : 15;
}

function renderWebTileGrid(center: { lat: number; lng: number }, zoom: number) {
  const centerPx = latLngToWorldPixel(center.lat, center.lng, zoom);
  const centerTileX = Math.floor(centerPx.x / WEB_TILE_SIZE);
  const centerTileY = Math.floor(centerPx.y / WEB_TILE_SIZE);
  const offsetX = centerPx.x - centerTileX * WEB_TILE_SIZE;
  const offsetY = centerPx.y - centerTileY * WEB_TILE_SIZE;

  return Array.from({ length: WEB_TILE_GRID }, (_, y) =>
    Array.from({ length: WEB_TILE_GRID }, (_, x) => {
      const tileX = centerTileX + x - 1;
      const tileY = centerTileY + y - 1;
      const key = `${zoom}-${tileX}-${tileY}`;
      const uri = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
      return (
        <Image
          key={key}
          source={{ uri }}
          style={[
            styles.webTile,
            {
              left: x * WEB_TILE_SIZE + WEB_TILE_SIZE / 2 - offsetX,
              top: y * WEB_TILE_SIZE + WEB_TILE_SIZE / 2 - offsetY,
            },
          ]}
          resizeMode="cover"
        />
      );
    }),
  ).flat();
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
  const zoom = webZoomForZone(userCoords ? 0.005 : 0.01);
  const [tileFailed, setTileFailed] = useState(false);
  const useSchematic = tileFailed;
  const zonePosition = projectPoint(zone.geo!.lat, zone.geo!.lng, center);
  const userPosition = userCoords ? projectPoint(userCoords.lat, userCoords.lng, center) : null;
  const webCenterPx = latLngToWorldPixel(center.lat, center.lng, zoom);
  const zonePx = latLngToWorldPixel(zone.geo!.lat, zone.geo!.lng, zoom);

  const webZonePosition = {
    left: WEB_TILE_CANVAS / 2 + (zonePx.x - webCenterPx.x),
    top: WEB_TILE_CANVAS / 2 + (zonePx.y - webCenterPx.y),
  };
  const webUserPosition = userCoords
    ? {
        left: WEB_TILE_CANVAS / 2 + (latLngToWorldPixel(userCoords.lat, userCoords.lng, zoom).x - webCenterPx.x),
        top: WEB_TILE_CANVAS / 2 + (latLngToWorldPixel(userCoords.lat, userCoords.lng, zoom).y - webCenterPx.y),
      }
    : null;

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.wrap, { height }]}> 
        {!useSchematic ? (
          <View style={styles.webMapCanvas}>
            {renderWebTileGrid(center, zoom)}
            <View style={[styles.webPinGroup, webZonePosition]}>
              <View style={[styles.pin, styles.pinZone, styles.webPin]} />
              <View style={styles.pinLabel}>
                <Text style={styles.pinLabelText}>Zone {zone.code}</Text>
              </View>
            </View>
            {webUserPosition ? <View style={[styles.pin, styles.pinUser, styles.webPin, webUserPosition]} /> : null}
          </View>
        ) : (
          <View style={styles.fallbackMapBg}>
            <View style={[styles.pin, styles.pinZone, zonePosition]} />
            {userCoords ? (
              <View style={[styles.pin, styles.pinUser, userPosition ?? {}]} />
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
    borderWidth: 2,
    borderColor: colors.curb,
    backgroundColor: colors.surface,
  },
  fallbackMapBg: {
    flex: 1,
    backgroundColor: '#06122b',
  },
  webMapCanvas: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: WEB_TILE_CANVAS,
    height: WEB_TILE_CANVAS,
    marginLeft: -WEB_TILE_CANVAS / 2,
    marginTop: -WEB_TILE_CANVAS / 2,
    backgroundColor: '#08142d',
    overflow: 'hidden',
  },
  webTile: {
    position: 'absolute',
    width: WEB_TILE_SIZE,
    height: WEB_TILE_SIZE,
  },
  webPin: {
    position: 'absolute',
    marginLeft: -6,
    marginTop: -6,
  },
  webPinGroup: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinLabel: {
    position: 'absolute',
    left: 10,
    top: -28,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  pinLabelText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
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
    color: colors.link,
    fontWeight: '600',
  },
});

export default ZoneMap;
