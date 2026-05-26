import { Link, Stack, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorState, Loading } from '../src/components/Status';
import { ZonesMap } from '../src/components/ZonesMap';
import { useActiveSession, useCurrentLocation, useZone, useZones } from '../src/hooks/parkingHooks';
import { distanceMeters, formatDistance } from '../src/services/location';
import { colors, radii, spacing, typography } from '../src/theme/tokens';
import { formatCountdown, formatMoney } from '../src/utils/format';

export default function Home() {
  const { user, signOut } = useAuth();
  const zones = useZones();
  const locQ = useCurrentLocation();
  const activeQ = useActiveSession();
  const active = activeQ.data ?? null;
  const activeZoneQ = useZone(active?.zoneId);
  const [now, setNow] = useState(Date.now());
  const [nearbyView, setNearbyView] = useState<'list' | 'map'>('list');
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerAnimRef = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    Animated.timing(drawerAnimRef, {
      toValue: menuOpen ? 0 : Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [menuOpen, drawerAnimRef]);

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
  const activeRemainingMs = active ? new Date(active.expiresAt).getTime() - now : null;
  const activeExpired = activeRemainingMs != null && activeRemainingMs <= 0;
  const activeExpiringSoon = activeRemainingMs != null && activeRemainingMs > 0 && activeRemainingMs < 15 * 60 * 1000;
  const shouldShowExtendParking = activeExpired || activeExpiringSoon;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              hitSlop={12}
              style={styles.headerMenuTrigger}
            >
              <Text style={styles.headerMenuTriggerText}>Account</Text>
            </Pressable>
          ),
        }}
      />
      <Modal
        animationType="none"
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Animated.View style={[styles.menuCard, { transform: [{ translateX: drawerAnimRef }] }]}>
            <Pressable onPress={() => {}} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.menuScrollContent}>
                <Text style={styles.menuEmail}>Signed in as {user?.email}</Text>
                <Pressable onPress={() => { setMenuOpen(false); router.push('/wallet'); }} style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Wallet</Text>
                </Pressable>
                <Pressable onPress={() => { setMenuOpen(false); router.push('/vehicles'); }} style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Vehicles</Text>
                </Pressable>
                <Pressable onPress={() => { setMenuOpen(false); router.push('/history'); }} style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Receipts & history</Text>
                </Pressable>
                <Pressable onPress={() => { setMenuOpen(false); signOut(); }} style={styles.menuItem}>
                  <Text style={[styles.menuItemText, { color: '#fca5a5' }]}>Sign out</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={[typography.bodyMuted, { marginBottom: spacing.lg }]}>
        {locQ.data
          ? 'We use your location to find the closest zone. You can always confirm before paying.'
          : 'Enable location to auto-detect the closest zone, or pick one from the list.'}
      </Text>

      {active ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.label}>Active session</Text>
          <Text style={[typography.display, { color: shouldShowExtendParking ? colors.danger : colors.text }]}>
            {formatCountdown(new Date(active.expiresAt).getTime() - now)}
          </Text>
          {activeZoneQ.data ? (
            <>
              <Text style={typography.h2}>{activeZoneQ.data.displayName}</Text>
              {activeZoneQ.data.address ? <Text style={typography.bodyMuted}>{activeZoneQ.data.address}</Text> : null}
            </>
          ) : null}
          <Text style={typography.bodyMuted}>
            Paid {formatMoney(active.totalPaidCents, active.currency)}
          </Text>
          <Button
            label={shouldShowExtendParking ? 'Extend Parking' : 'View session'}
            variant={shouldShowExtendParking ? 'danger' : 'primary'}
            onPress={() => router.push(shouldShowExtendParking ? '/extend' : '/session')}
          />
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  headerMenuTrigger: {
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginRight: 2,
  },
  headerMenuTriggerText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '400',
    textDecorationLine: 'underline',
    paddingRight: 8,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.2)',
  },
  menuCard: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 230,
    height: '100%',
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  menuScrollContent: {
    paddingVertical: spacing.sm,
  },
  menuEmail: {
    color: colors.text,
    fontSize: 12,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  menuItem: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
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
