import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Card } from '../src/components/Card';
import { ErrorState, Loading } from '../src/components/Status';
import { useSessions, useZones } from '../src/hooks/parkingHooks';
import { colors, spacing, typography } from '../src/theme/tokens';
import { formatDate, formatMoney, formatTime } from '../src/utils/format';

export default function History() {
  const sessionsQ = useSessions();
  const zonesQ = useZones();

  if (sessionsQ.isLoading || zonesQ.isLoading) return <Loading />;
  if (sessionsQ.isError) {
    return (
      <ErrorState
        message={(sessionsQ.error as Error).message}
        onRetry={() => sessionsQ.refetch()}
      />
    );
  }

  const sessions = sessionsQ.data ?? [];
  const zonesById = new Map((zonesQ.data ?? []).map((z) => [z.id, z]));

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={typography.h2}>No parking history yet</Text>
        <Text style={typography.bodyMuted}>Completed parking sessions will appear here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      data={sessions}
      keyExtractor={(s) => s.id}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      renderItem={({ item }) => {
        const zone = zonesById.get(item.zoneId);
        return (
          <Card>
            <Text style={typography.streetName}>{zone?.displayName ?? 'Unmapped zone'}</Text>
            <Text style={typography.bodyMuted}>
              {formatDate(item.startedAt)} · {formatTime(item.startedAt)} – {formatTime(item.expiresAt)}
            </Text>
            <Text style={[typography.body, { marginTop: spacing.sm }]}>
              {formatMoney(item.totalPaidCents, item.currency)}
            </Text>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.bg },
});
