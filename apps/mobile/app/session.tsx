import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Loading } from '../src/components/Status';
import {
  useActiveSession,
  useEndSession,
  useVehicles,
  useZone,
} from '../src/hooks/parkingHooks';
import { colors, spacing, typography } from '../src/theme/tokens';
import { formatCountdown, formatMoney, formatTime } from '../src/utils/format';

export default function ActiveSession() {
  const sessionQ = useActiveSession();
  const session = sessionQ.data ?? null;
  const zoneQ = useZone(session?.zoneId);
  const vehiclesQ = useVehicles();
  const endSession = useEndSession();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (sessionQ.isLoading) return <Loading />;

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={typography.h2}>No active parking session.</Text>
        <Button label="Find parking zone" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const zone = zoneQ.data;
  const vehicle = vehiclesQ.data?.[0];
  const remaining = new Date(session.expiresAt).getTime() - now;
  const expiringSoon = remaining > 0 && remaining < 15 * 60 * 1000;
  const expired = remaining <= 0;
  const shouldShowExtendParking = expired || expiringSoon;
  const extendLabel = shouldShowExtendParking ? 'Extend Parking' : 'Extend time';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card
        style={{
          alignItems: 'center',
          gap: spacing.sm,
          borderTopColor: expired ? colors.danger : expiringSoon ? colors.warning : colors.success,
        }}
      >
        <Text style={typography.label}>
          {expired ? 'Session expired' : expiringSoon ? 'Expiring soon' : 'Time remaining'}
        </Text>
        <Text
          style={[
            typography.display,
            { color: shouldShowExtendParking ? colors.danger : colors.text },
          ]}
          accessibilityLabel={`Time remaining ${formatCountdown(remaining)}`}
        >
          {formatCountdown(remaining)}
        </Text>
        <Text style={typography.bodyMuted}>Parking confirmed. Ends at {formatTime(session.expiresAt)}.</Text>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text style={typography.label}>Current zone</Text>
        <Text style={typography.h2}>{zone?.displayName ?? '—'}</Text>
        {zone?.address ? <Text style={typography.bodyMuted}>{zone.address}</Text> : null}
        <Text style={typography.bodyMuted}>Zone {zone?.code ?? '—'}</Text>
        <View style={{ height: spacing.sm }} />
        <Text style={typography.label}>Vehicle</Text>
        <Text style={typography.body}>
          {vehicle ? `${vehicle.licensePlate}${vehicle.state ? ` (${vehicle.state})` : ''}` : '—'}
        </Text>
        <Text style={typography.label}>Paid</Text>
        <Text style={typography.body}>{formatMoney(session.totalPaidCents, session.currency)}</Text>
      </Card>

      <Button
        label={extendLabel}
        variant={shouldShowExtendParking ? 'danger' : 'primary'}
        onPress={() => router.push('/extend')}
        accessibilityHint="Add more minutes to this parking session"
      />
      <Button
        label={endSession.isPending ? 'Ending…' : 'End session'}
        variant="secondary"
        disabled={endSession.isPending}
        onPress={() =>
          Alert.alert('End session?', 'Your time will stop and a receipt will be saved.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'End',
              style: 'destructive',
              onPress: () =>
                endSession.mutate(session.id, {
                  onSuccess: () => router.replace('/'),
                  onError: (e) => Alert.alert('Could not end session', (e as Error).message),
                }),
            },
          ])
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
});
