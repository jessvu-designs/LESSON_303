// Small map preview for a parking zone. Drops a pin at the zone location
// (and optionally the user's location). Renders nothing if react-native-maps
// isn't available in the current runtime (e.g. web).
//
// When `onUserCoordsChange` is provided the user marker becomes draggable,
// letting the driver fine-tune the exact parking spot when GPS lands
// between two zones.
import { StyleSheet, View } from 'react-native';
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
    MapView = mod.default ?? mod.MapView;
    Marker = mod.Marker;
  } catch {
    return null;
  }
  // On web, react-native-maps resolves to a shim with no real exports.
  if (typeof MapView !== 'function' || typeof Marker !== 'function') return null;

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

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
