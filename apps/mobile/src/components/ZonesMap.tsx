// Multi-zone map preview for the Home screen. Drops a pin per zone (plus the
// user's location when known) and calls `onSelectZone` when a pin is tapped.
// Renders nothing when react-native-maps isn't available (e.g. web), so the
// list view stays the canonical fallback.
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
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

  if (Platform.OS === 'web') {
    return (
      <StaticZonesMapFallback
        zones={withGeo}
        userCoords={userCoords ?? null}
        height={height}
        onSelectZone={onSelectZone}
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

function projectPoint(
  lat: number,
  lng: number,
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
): any {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  const x = ((lng - (region.longitude - halfLng)) / region.longitudeDelta) * 100;
  const y = (1 - (lat - (region.latitude - halfLat)) / region.latitudeDelta) * 100;
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

function zoomForRegion(region: { latitudeDelta: number }) {
  return region.latitudeDelta > 0.05 ? 12 : region.latitudeDelta > 0.02 ? 13 : 14;
}

function renderWebTileGrid(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}) {
  const zoom = zoomForRegion(region);
  const centerPx = latLngToWorldPixel(region.latitude, region.longitude, zoom);
  const centerTileX = Math.floor(centerPx.x / WEB_TILE_SIZE);
  const centerTileY = Math.floor(centerPx.y / WEB_TILE_SIZE);
  const offsetX = centerPx.x - centerTileX * WEB_TILE_SIZE;
  const offsetY = centerPx.y - centerTileY * WEB_TILE_SIZE;

  return {
    zoom,
    tiles: Array.from({ length: WEB_TILE_GRID }, (_, y) =>
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
    ).flat(),
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

function buildTileUrl(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}) {
  const zoom = region.latitudeDelta > 0.05 ? 12 : region.latitudeDelta > 0.02 ? 13 : 14;
  const tile = latLngToTile(region.latitude, region.longitude, zoom);
  return `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;
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
  const region = computeRegion(zones, userCoords);
  const firstZone = zones[0];
  const [tileFailed, setTileFailed] = useState(false);
  const useSchematic = tileFailed;
  const webMap = renderWebTileGrid(region);
  const centerPx = latLngToWorldPixel(region.latitude, region.longitude, webMap.zoom);

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.wrap, { height }]}>
        {!useSchematic ? (
          <View style={styles.webMapCanvas}>
            {webMap.tiles}
            {zones.map((z) => {
              const pinPx = latLngToWorldPixel(z.geo!.lat, z.geo!.lng, webMap.zoom);
              return (
                <Pressable
                  key={z.id}
                  onPress={() => onSelectZone?.(z)}
                  style={[
                    styles.webPinGroup,
                    {
                      left: WEB_TILE_CANVAS / 2 + (pinPx.x - centerPx.x),
                      top: WEB_TILE_CANVAS / 2 + (pinPx.y - centerPx.y),
                    },
                  ]}
                >
                  <View style={styles.webPinDot}>
                    <View style={styles.webPinInnerDot} />
                  </View>
                  <View style={styles.pinLabel}>
                    <Text style={styles.pinLabelText}>Zone {z.code}</Text>
                  </View>
                </Pressable>
              );
            })}
            {userCoords ? (
              <View
                style={[
                  styles.webPinGroup,
                  {
                    left: WEB_TILE_CANVAS / 2 + (latLngToWorldPixel(userCoords.lat, userCoords.lng, webMap.zoom).x - centerPx.x),
                    top: WEB_TILE_CANVAS / 2 + (latLngToWorldPixel(userCoords.lat, userCoords.lng, webMap.zoom).y - centerPx.y),
                  },
                ]}
              >
                <View style={styles.webUserDot}>
                  <View style={styles.webUserInnerDot} />
                </View>
                <View style={[styles.pinLabel, styles.pinLabelUser]}>
                  <Text style={styles.pinLabelText}>You</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.fallbackMapBg}>
            {zones.map((z) => {
              const pin = projectPoint(z.geo!.lat, z.geo!.lng, region);
              return <View key={z.id} style={[styles.pin, styles.pinZone, pin]} />;
            })}
            {userCoords ? (
              <View
                style={[
                  styles.pin,
                  styles.pinUser,
                  projectPoint(userCoords.lat, userCoords.lng, region),
                ]}
              />
            ) : null}
            <Text style={styles.fallbackLegend}>
              {tileFailed ? 'Map preview (fallback)' : 'Schematic map preview'}
            </Text>
          </View>
        )}
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
    transform: [{ translateX: -12 }, { translateY: -12 }],
    zIndex: 20,
  },
  webPinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 2,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  webPinInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  webUserDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  webUserInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  pinLabel: {
    marginTop: 6,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  pinLabelUser: {
    borderColor: 'rgba(59, 130, 246, 0.6)',
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
    color: colors.link,
    fontWeight: '600',
  },
});

export default ZonesMap;
