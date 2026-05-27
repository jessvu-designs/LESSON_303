import { Stack, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  // Drawer is 230px wide; animate by that distance so it slides relative to
  // the phone frame (not the browser window). Modal is intentionally avoided
  // because on web it portals outside the MobileFrame.
  const DRAWER_WIDTH = 230;
  const drawerAnimRef = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    Animated.timing(drawerAnimRef, {
      toValue: menuOpen ? 0 : DRAWER_WIDTH,
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hide the navigation header on home so we can render an inline header
          inside the same view tree as the overlay. This lets the drawer
          extend over the header and fill the full phone height. */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.inlineHeader}>
        <View style={styles.inlineHeaderTitle}>
          <MaterialCommunityIcons name="car-outline" size={19} color={colors.text} />
          <Text style={styles.inlineHeaderTitleText}>PARKER</Text>
        </View>
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          hitSlop={12}
          style={styles.headerMenuTrigger}
        >
          <Text style={styles.headerMenuTriggerText}>Account</Text>
        </Pressable>
      </View>

      {menuOpen ? (
        <View style={styles.menuOverlay} pointerEvents="box-none">
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
          <Animated.View style={[styles.menuCard, { transform: [{ translateX: drawerAnimRef }] }]}>
            <View style={styles.menuContent}>
              <View style={styles.menuTop}>
                <Text style={styles.menuSectionTitle}>Account</Text>
                <View style={styles.menuSectionDivider} />
                <Pressable onPress={() => { setMenuOpen(false); router.push('/wallet'); }} style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Wallet</Text>
                </Pressable>
                <Pressable onPress={() => { setMenuOpen(false); router.push('/vehicles'); }} style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Vehicles</Text>
                </Pressable>
                <Pressable onPress={() => { setMenuOpen(false); router.push('/history'); }} style={styles.menuItem}>
                  <Text style={styles.menuItemText}>Receipts & history</Text>
                </Pressable>
              </View>
              <View style={styles.menuFooter}>
                <View style={styles.menuDivider} />
                <Pressable onPress={() => { setMenuOpen(false); signOut(); }} style={styles.menuItem}>
                  <Text style={[styles.menuItemText, styles.signOutText]}>Sign out</Text>
                </Pressable>
                <Text style={styles.menuEmail}>Signed in as {user?.email}</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={[typography.bodyMuted, { marginBottom: spacing.lg }]}>
        {locQ.data
          ? 'Live location enabled. Review your zone, confirm, and start parking quickly.'
          : 'Location off. Select a zone manually from the map or list.'}
      </Text>

      {active ? (
        <Card style={styles.activeCard}>
          <Text style={typography.label}>Parking active</Text>
          <View style={styles.activeTopRow}>
            <Text style={[typography.display, { color: shouldShowExtendParking ? colors.danger : colors.text }]}>
              {formatCountdown(new Date(active.expiresAt).getTime() - now)}
            </Text>
            <View style={styles.activeTopRight}>
              {activeZoneQ.data ? (
                <Text style={styles.activeZoneCode}>Zone {activeZoneQ.data.code}</Text>
              ) : null}
              <Text style={styles.activePaid}>Paid {formatMoney(active.totalPaidCents, active.currency)}</Text>
            </View>
          </View>
          {activeZoneQ.data ? (
            <>
              <Text style={typography.h2}>{activeZoneQ.data.displayName}</Text>
              {activeZoneQ.data.address ? <Text style={[typography.body, { fontSize: 18 }]}>{activeZoneQ.data.address}</Text> : null}
            </>
          ) : null}
          <Button
            label={shouldShowExtendParking ? 'Extend Parking' : 'View session'}
            variant={shouldShowExtendParking ? 'danger' : 'primary'}
            onPress={() => router.push(shouldShowExtendParking ? '/extend' : '/session')}
          />
          {shouldShowExtendParking ? (
            <Button
              label="View session"
              variant="secondary"
              onPress={() => router.push('/session')}
            />
          ) : null}
          <Text style={[typography.bodyMuted, { textAlign: 'center', fontWeight: '400' }]}>Parking confirmed. Ends at {new Date(active.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</Text>
        </Card>
      ) : detected ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.label}>{locQ.data ? 'Closest parking zone' : 'Selected parking zone'}</Text>
          <Text style={typography.h2}>{detected.displayName}</Text>
          {detected.address ? <Text style={typography.bodyMuted}>{detected.address}</Text> : null}
          <Text style={typography.bodyMuted}>
            Zone {detected.code} - Downtown Core
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
        <Text style={typography.label}>Map and nearby zones</Text>
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
        <Card style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          <Text style={typography.label}>Live zone map</Text>
          <ZonesMap
            zones={sortedZones.map((s) => s.zone)}
            userCoords={locQ.data ?? null}
            onSelectZone={(z) =>
              router.push({ pathname: '/confirm', params: { zoneId: z.id } })
            }
            height={390}
          />
          <Text style={typography.bodyMuted}>
            Tap a zone marker to confirm parking.
          </Text>
        </Card>
      ) : (
        others.map(({ zone: z, meters }) => (
          <Pressable
            key={z.id}
            onPress={() => router.push({ pathname: '/confirm', params: { zoneId: z.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Park at ${z.displayName}, zone ${z.code}, ${formatMoney(z.rate.hourlyCents, z.rate.currency)} per hour`}
            style={({ pressed }) => ({ marginTop: spacing.sm, opacity: pressed ? 0.85 : 1 })}
          >
            <Card>
              <Text style={typography.h2}>{z.displayName}</Text>
              <Text style={typography.bodyMuted}>
                Zone {z.code} · {formatMoney(z.rate.hourlyCents, z.rate.currency)}/hr · 2HR limit enforced
                {Number.isFinite(meters) ? ` · ${formatDistance(meters)}` : ''}
              </Text>
              <Text style={{ color: colors.link, marginTop: spacing.sm, alignSelf: 'flex-end', fontWeight: '600' }}>
                Park here →
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  headerMenuTrigger: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
  },
  headerMenuTriggerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 56,
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inlineHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineHeaderTitleText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.8,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
  menuContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  menuTop: {
    gap: 2,
  },
  menuSectionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  menuSectionDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginHorizontal: 8,
    marginBottom: spacing.sm,
  },
  menuFooter: {
    paddingBottom: spacing.sm,
  },
  menuDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginHorizontal: 8,
    marginBottom: spacing.sm,
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
  signOutText: {
    color: '#fca5a5',
  },
  nearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  toggleBtnSelected: { backgroundColor: colors.primary, borderWidth: 1, borderColor: '#7FB0F2' },
  toggleText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  activeCard: {
    gap: spacing.sm,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeTopRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  activeZoneCode: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  activePaid: {
    color: colors.concrete,
    fontSize: 15,
    fontWeight: '700',
  },
});
