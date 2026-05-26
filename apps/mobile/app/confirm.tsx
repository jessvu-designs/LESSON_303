import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Dropdown } from '../src/components/Dropdown';
import { ErrorState, Loading } from '../src/components/Status';
import { ZoneMap } from '../src/components/ZoneMap';
import {
  useCurrentLocation,
  usePaymentMethods,
  useQuote,
  useReverseGeocode,
  useStartSession,
  useVehicles,
  useZone,
  useZones,
} from '../src/hooks/parkingHooks';
import { type Coords, distanceMeters, formatDistance } from '../src/services/location';
import { colors, radii, spacing, typography } from '../src/theme/tokens';
import { formatDuration, formatMoney } from '../src/utils/format';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

const HOURS = Array.from({ length: 5 }, (_, i) => i); // 0-4 hours
const MINUTES = [0, 15, 30, 45]; // 0, 15, 30, 45 minutes

export default function ConfirmParking() {
  const { zoneId } = useLocalSearchParams<{ zoneId: string }>();
  const [hours, setHours] = useState(1);
  const [mins, setMins] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const minutes = hours * 60 + mins;

  const zoneQ = useZone(zoneId);
  const zonesQ = useZones();
  const vehiclesQ = useVehicles();
  const pmsQ = usePaymentMethods();
  const quoteQ = useQuote(zoneId, minutes);
  const locQ = useCurrentLocation();
  const start = useStartSession();

  // Draggable parking-spot pin. Defaults to the device's location, then to
  // the zone center if location isn't granted. Drives both the displayed
  // distance and the reverse-geocoded address shown under the map.
  const [pinCoords, setPinCoords] = useState<Coords | null>(null);
  useEffect(() => {
    if (pinCoords) return;
    if (locQ.data) setPinCoords(locQ.data);
  }, [locQ.data, pinCoords]);
  const addressQ = useReverseGeocode(pinCoords);
  const zone = zoneQ.data;
  const vehicles = vehiclesQ.data ?? [];
  const defaultVehicle = vehicles.find((v) => v.isDefault) ?? vehicles[0] ?? null;
  const vehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? defaultVehicle;
  const pm = pmsQ.data?.[0];

  const effectivePin: Coords | null = pinCoords ?? locQ.data ?? null;
  const distance =
    effectivePin && zone.geo ? distanceMeters(effectivePin, zone.geo) : null;

  const closerZone = useMemo(() => {
    if (!effectivePin || !zone.geo || !zonesQ.data) return null;
    const here = distanceMeters(effectivePin, zone.geo);
    let best: { zone: typeof zone; meters: number } | null = null;
    for (const z of zonesQ.data) {
      if (z.id === zone.id || !z.geo) continue;
      const m = distanceMeters(effectivePin, z.geo);
      if (m < here - 25 && (!best || m < best.meters)) {
        best = { zone: z, meters: m };
      }
    }
    return best;
  }, [effectivePin, zone, zonesQ.data]);

  if (zoneQ.isLoading || vehiclesQ.isLoading || pmsQ.isLoading) {
    return <Loading />;
  }
  if (zoneQ.isError) {
    return (
      <ErrorState
        message={(zoneQ.error as Error).message}
        onRetry={() => zoneQ.refetch()}
      />
    );
  }

  if (!zone) {
    return (
      <View style={styles.container}>
        <Text style={typography.h2}>Zone not found.</Text>
      </View>
    );
  }

  const overMax =
    zone.rules.maxSessionMinutes !== undefined && minutes > zone.rules.maxSessionMinutes;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ gap: spacing.xs }}>
        <Text style={typography.label}>Location</Text>
        <Text style={typography.h2}>{zone.displayName}</Text>
        {zone.address ? <Text style={typography.bodyMuted}>{zone.address}</Text> : null}
        <Text style={typography.bodyMuted}>
          Zone {zone.code}
          {distance != null ? ` · ${formatDistance(distance)} away` : ''}
        </Text>
      </Card>

      <ZoneMap
        zone={zone}
        userCoords={effectivePin}
        onUserCoordsChange={setPinCoords}
        userMarkerSubtitle={addressQ.data ?? undefined}
      />
      {effectivePin ? (
        <View style={{ gap: 2 }}>
          <Text style={typography.bodyMuted}>
            Drag the blue pin on the map to fine-tune your exact spot.
          </Text>
          {addressQ.data ? (
            <Text style={typography.body}>Your spot: {addressQ.data}</Text>
          ) : null}
        </View>
      ) : null}
      {closerZone ? (
        <Card style={{ gap: spacing.xs, borderColor: colors.primary, borderWidth: 1 }}>
          <Text style={typography.label}>Closer zone detected</Text>
          <Text style={typography.body}>
            Your pin is {formatDistance(closerZone.meters)} from
            {' '}{closerZone.zone.displayName} (Zone {closerZone.zone.code}).
          </Text>
          <Button
            label={`Switch to ${closerZone.zone.displayName}`}
            variant="secondary"
            onPress={() =>
              router.replace({
                pathname: '/confirm',
                params: { zoneId: closerZone.zone.id },
              })
            }
          />
        </Card>
      ) : null}

      {vehicles.length === 0 ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.label}>Vehicle</Text>
          <Text style={typography.body}>No vehicles on file yet.</Text>
          <Button label="Add a vehicle" onPress={() => router.push('/vehicles')} />
        </Card>
      ) : (
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={typography.label}>Vehicle</Text>
            <Pressable
              onPress={() => router.push('/vehicles')}
              hitSlop={12}
              accessibilityRole="link"
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Manage</Text>
            </Pressable>
          </View>
          {vehicles.map((v) => {
            const selected = v.id === vehicle?.id;
            return (
              <Pressable
                key={v.id}
                onPress={() => setSelectedVehicleId(v.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.vehicleRow, selected && styles.vehicleRowSelected]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>
                    {v.nickname ?? 'Vehicle'} · {v.licensePlate}
                    {v.state ? ` (${v.state})` : ''}
                  </Text>
                  {v.isDefault ? (
                    <Text style={typography.bodyMuted}>Default</Text>
                  ) : null}
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]} />
              </Pressable>
            );
          })}
        </Card>
      )}

      <Card style={{ gap: spacing.md }}>
        <Text style={typography.label}>How long?</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Dropdown
              label="Hours"
              value={hours}
              options={HOURS}
              onChange={setHours}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Dropdown
              label="Minutes"
              value={mins}
              options={MINUTES}
              onChange={setMins}
              suffix=" min"
            />
          </View>
        </View>
        {zone.rules.maxSessionMinutes ? (
          <Text style={typography.bodyMuted}>
            Max allowed: {formatDuration(zone.rules.maxSessionMinutes)}
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.xs }}>
        <Text style={typography.label}>Total</Text>
        <Text style={typography.h1}>
          {quoteQ.data
            ? formatMoney(quoteQ.data.totalCents, quoteQ.data.currency)
            : '—'}
        </Text>
        <Text style={typography.bodyMuted}>
          {formatMoney(zone.rate.hourlyCents, zone.rate.currency)}/hr · {formatDuration(minutes)}
        </Text>
      </Card>

      {pm ? (
        <Card style={{ gap: spacing.xs }}>
          <Text style={typography.label}>Payment</Text>
          <Text style={typography.body}>
            {pm.brand.toUpperCase()} ···· {pm.last4 ?? '----'}
          </Text>
        </Card>
      ) : (
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.label}>Payment</Text>
          <Text style={typography.body}>Add a card to start parking.</Text>
          <Button label="Open wallet" onPress={() => router.push('/wallet')} />
        </Card>
      )}

      {overMax ? (
        <Text style={{ color: colors.warning }}>
          This zone allows a maximum of {formatDuration(zone.rules.maxSessionMinutes!)}.
        </Text>
      ) : null}

      <Button
        label={
          start.isPending
            ? 'Starting…'
            : !pm
            ? 'Add a card to continue'
            : overMax
            ? 'Reduce time to continue'
            : 'Start parking'
        }
        disabled={overMax || start.isPending || !pm}
        onPress={() => {
          if (!pm) {
            router.push('/wallet');
            return;
          }
          start.mutate(
            {
              vehicleId: vehicle?.id ?? '', // server falls back to default if missing
              zoneId: zone.id,
              minutes,
              paymentMethodId: pm.id,
            },
            {
              onSuccess: () => router.replace('/session'),
              onError: (e) => Alert.alert('Could not start session', (e as Error).message),
            },
          );
        }}
      />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  choice: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  vehicleRowSelected: { borderColor: colors.primary, borderWidth: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginLeft: spacing.sm,
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
});
