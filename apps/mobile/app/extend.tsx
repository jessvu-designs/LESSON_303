import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Loading } from '../src/components/Status';
import {
  useActiveSession,
  useExtendSession,
  useQuote,
  useZone,
} from '../src/hooks/parkingHooks';
import { colors, radii, spacing, typography } from '../src/theme/tokens';
import { formatDuration, formatMoney, formatTime } from '../src/utils/format';

const CHOICES = [15, 30, 60];

export default function Extend() {
  const sessionQ = useActiveSession();
  const session = sessionQ.data ?? null;
  const zoneQ = useZone(session?.zoneId);
  const [added, setAdded] = useState(15);
  const quoteQ = useQuote(session?.zoneId, added);
  const extend = useExtendSession();

  if (sessionQ.isLoading) return <Loading />;

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={typography.h2}>No active session.</Text>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const zone = zoneQ.data;
  if (zone && !zone.rules.allowsExtension) {
    return (
      <View style={styles.container}>
        <Card>
          <Text style={typography.h2}>Extension not allowed here</Text>
          <Text style={[typography.bodyMuted, { marginTop: spacing.sm }]}>
            This zone does not allow extending an active session. You'll need to start a new session
            after this one ends.
          </Text>
        </Card>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const newExpiry = new Date(new Date(session.expiresAt).getTime() + added * 60_000);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ gap: spacing.md }}>
        <Text style={typography.label}>Add time</Text>
        <View style={styles.choices}>
          {CHOICES.map((m) => {
            const selected = m === added;
            return (
              <Pressable
                key={m}
                onPress={() => setAdded(m)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.choice, selected && styles.choiceSelected]}
              >
                <Text style={[styles.choiceText, selected && { color: colors.primaryText }]}>
                  +{formatDuration(m)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: spacing.xs }}>
        <Text style={typography.label}>New end time</Text>
        <Text style={typography.h1}>{formatTime(newExpiry.toISOString())}</Text>
        <Text style={typography.label}>Added cost</Text>
        <Text style={typography.h2}>
          {quoteQ.data ? formatMoney(quoteQ.data.totalCents, quoteQ.data.currency) : '—'}
        </Text>
      </Card>

      <Button
        label={extend.isPending ? 'Extending…' : `Extend by ${formatDuration(added)}`}
        disabled={extend.isPending}
        onPress={() =>
          extend.mutate(
            { sessionId: session.id, addedMinutes: added },
            {
              onSuccess: () => router.replace('/session'),
              onError: (e) => Alert.alert('Could not extend', (e as Error).message),
            },
          )
        }
      />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
