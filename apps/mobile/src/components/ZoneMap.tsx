// Small map preview for a parking zone. Drops a pin at the zone location
// (and optionally the user's location). Renders nothing if react-native-maps
// isn't available in the current runtime (e.g. web).
import { StyleSheet, View } from 'react-native';
import type { ParkingZone } from '@parking/shared-types';
import { colors, radii } from '../theme/tokens';

interface Props {
  zone: ParkingZone;
  userCoords?: { lat: number; lng: number } | null;
  height?: number;
}

export function ZoneMap({ zone, userCoords, height = 180 }: Props) {
  if (!zone.geo) return null;

  let MapView: any;
  let Marker: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-maps');
    MapView = mod.default;
    Marker = mod.Marker;
  } catch {
    return null;
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        initialRegion={{
          latitude: zone.geo.lat,
          longitude: zone.geo.lng,
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
            title="You"
            pinColor="blue"
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
