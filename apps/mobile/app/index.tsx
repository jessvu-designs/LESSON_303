import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorState, Loading } from '../src/components/Status';
import { ZonesMap } from '../src/components/ZonesMap';
import { useActiveSession, useCurrentLocation, useZones } from '../src/hooks/parkingHooks';
import { distanceMeters, formatDistance } from '../src/services/location';
import { colors, radii, spacing, typography } from '../src/theme/tokens';
import { formatCountdown, formatMoney } from '../src/utils/format';

export default function Home() {
  const { user, signOut } = useAuth();
  const zones = useZones();
  const locQ = useCurrentLocation();
  const activeQ = useActiveSession();
  const active = activeQ.data ?? null;
  const [now, setNow] = useState(Date.now());
  const [nearbyView, setNearbyView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Sort by distance when we have a fix, otherwise show server order.
  const sortedZones = useMemo(() => {
    const all = zones.data ?? [];
    const me = locQ.data;
    const wrapped = all.map((z) => ({
      zone: z,
      meters: me && z.geo ? distanceMeters(me, z.geo) : Number.POSITIVE_INFINITY,
    }));
    if (me) wrapped.sort((a, b) => a.meters - b.meters);
    return wrapped;
  }, [zones.data, locQ.data]);

  if (zones.isLoading || activeQ.isLoading) return <Loading label="Finding parking near you…" />;
  if (zones.isError) {
    return (
      <ErrorState
        message={(zones.error as Error).message}
        onRetry={() => zones.refetch()}
      />
    );
  }

  const detectedEntry = sortedZones[0];
  const detected = detectedEntry?.zone;
  const detectedDistance = detectedEntry?.meters;
  const others = sortedZones.slice(1);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={typography.h1}>Where are you parking?</Text>
      <Text style={[typography.bodyMuted, { marginBottom: spacing.lg }]}>
        {locQ.data
          ? 'We use your location to find the closest zone. You can always confirm before paying.'
          : 'Enable location to auto-detect the closest zone, or pick one from the list.'}
      </Text>

      {active ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.label}>Active session</Text>
          <Text style={typography.display}>
            {formatCountdown(new Date(active.expiresAt).getTime() - now)}
          </Text>
          <Text style={typography.bodyMuted}>
            Paid {formatMoney(active.totalPaidCents, active.currency)}
          </Text>
          <Button label="View session" onPress={() => router.push('/session')} />
        </Card>
      ) : detected ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.label}>
            {locQ.data ? 'Closest zone' : 'Detected location'}
          </Text>
          <Text style={typography.h2}>{detected.displayName}</Text>
          {detected.address ? <Text style={typography.bodyMuted}>{detected.address}</Text> : null}
          <Text style={typography.bodyMuted}>
            Zone {detected.code}
            {detectedDistance && Number.isFinite(detectedDistance)
              ? ` · ${formatDistance(detectedDistance)} away`
              : ''}
          </Text>
          <Button
            label="Confirm & continue"
            onPress={() => router.push({ pathname: '/confirm', params: { zoneId: detected.id } })}
          />
        </Card>
      ) : null}

      <View style={{ height: spacing.xl }} />

      <View style={styles.nearbyHeader}>
        <Text style={typography.label}>Other zones nearby</Text>
        <View style={styles.toggle} accessibilityRole="tablist">
          {(['list', 'map'] as const).map((mode) => {
            const selected = nearbyView === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setNearbyView(mode)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${mode} view`}
                style={[styles.toggleBtn, selected && styles.toggleBtnSelected]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    selected && { color: colors.primaryText },
                  ]}
                >
                  {mode === 'list' ? 'List' : 'Map'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {nearbyView === 'map' ? (
        // Include the detected/closest zone too so the map shows the full picture.
        <View style={{ marginTop: spacing.sm }}>
          <ZonesMap
            zones={sortedZones.map((s) => s.zone)}
            userCoords={locQ.data ?? null}
            onSelectZone={(z) =>
              router.push({ pathname: '/confirm', params: { zoneId: z.id } })
            }
          />
          <Text style={[typography.bodyMuted, { marginTop: spacing.sm }]}>
            Tap a pin to confirm and start parking.
          </Text>
        </View>
      ) : (
        others.map(({ zone: z, meters }) => (
          <Card key={z.id} style={{ marginTop: spacing.sm }}>
            <Text style={typography.h2}>{z.displayName}</Text>
            <Text style={typography.bodyMuted}>
              Zone {z.code} · {formatMoney(z.rate.hourlyCents, z.rate.currency)}/hr
              {Number.isFinite(meters) ? ` · ${formatDistance(meters)}` : ''}
            </Text>
            <Link
              href={{ pathname: '/confirm', params: { zoneId: z.id } }}
              style={{ color: colors.primary, marginTop: spacing.sm }}
            >
              Park here →
            </Link>
          </Card>
        ))
      )}

      <View style={{ height: spacing.xl }} />
      <Button label="Wallet" variant="secondary" onPress={() => router.push('/wallet')} />
      <Button label="Vehicles" variant="secondary" onPress={() => router.push('/vehicles')} />
      <Button label="Receipts & history" variant="secondary" onPress={() => router.push('/history')} />
      <Text style={[typography.bodyMuted, { textAlign: 'center', marginTop: spacing.lg }]}>
        Signed in as {user?.email}
      </Text>
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  nearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  toggleBtnSelected: { backgroundColor: colors.primary },
  toggleText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
