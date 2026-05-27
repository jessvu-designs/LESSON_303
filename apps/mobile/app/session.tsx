import type { ParkingSession } from '@parking/shared-types';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Loading } from '../src/components/Status';
import {
  useActiveSession,
  useEndSession,
  useVehicles,
  useZone,
} from '../src/hooks/parkingHooks';
import { colors, radii, spacing, typography } from '../src/theme/tokens';
import {
  formatCountdown,
  formatDuration,
  formatMoney,
  formatTime,
} from '../src/utils/format';

type Phase = 'active' | 'confirming' | 'ending' | 'ended';

export default function ActiveSession() {
  const sessionQ = useActiveSession();
  const session = sessionQ.data ?? null;
  const zoneQ = useZone(session?.zoneId);
  const vehiclesQ = useVehicles();
  const endSession = useEndSession();
  const [now, setNow] = useState(Date.now());
  const [phase, setPhase] = useState<Phase>('active');
  const [endError, setEndError] = useState<string | null>(null);
  // Snapshot of the session at the moment we ended it, so the receipt
  // remains visible after the active-session query returns null.
  const [endedSession, setEndedSession] = useState<ParkingSession | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (sessionQ.isLoading) return <Loading />;

  // Receipt view: shown after a successful end. We render this BEFORE the
  // "no active session" early-return so the user sees a confirmation rather
  // than being bounced straight back to the home screen.
  if (phase === 'ended' && endedSession) {
    return (
      <EndedReceipt
        session={endedSession}
        zoneName={zoneQ.data?.displayName}
        zoneCode={zoneQ.data?.code}
        onDone={() => router.replace('/')}
      />
    );
  }

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
  const isEnding = phase === 'ending' || endSession.isPending;

  const handleEnd = () => {
    setEndError(null);
    setPhase('ending');
    endSession.mutate(session.id, {
      onSuccess: (ended) => {
        setEndedSession(ended);
        setPhase('ended');
      },
      onError: (e) => {
        setEndError((e as Error).message);
        setPhase('confirming');
      },
    });
  };

  return (
    <>
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
          <Text style={typography.streetName}>{zone?.displayName ?? '—'}</Text>
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
          label="End session"
          variant="secondary"
          disabled={isEnding}
          onPress={() => {
            setEndError(null);
            setPhase('confirming');
          }}
        />
      </ScrollView>

      {(phase === 'confirming' || phase === 'ending') && (
        <EndConfirmModal
          session={session}
          zoneName={zone?.displayName}
          now={now}
          isEnding={isEnding}
          error={endError}
          onCancel={() => {
            if (isEnding) return;
            setEndError(null);
            setPhase('active');
          }}
          onConfirm={handleEnd}
        />
      )}
    </>
  );
}

function EndConfirmModal({
  session,
  zoneName,
  now,
  isEnding,
  error,
  onCancel,
  onConfirm,
}: {
  session: ParkingSession;
  zoneName?: string;
  now: number;
  isEnding: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const remainingMs = new Date(session.expiresAt).getTime() - now;
  const remainingMin = Math.max(0, Math.ceil(remainingMs / 60_000));

  return (
    <View style={styles.modalLayer} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="Dismiss"
        onPress={onCancel}
      />
      <View style={styles.modalCard} accessibilityViewIsModal accessibilityRole="alert">
        <Text style={typography.label}>End parking?</Text>
        <Text style={[typography.h2, { marginTop: spacing.xs }]}>
          Stop your session at {zoneName ?? 'this zone'}
        </Text>
        <Text style={[typography.bodyMuted, { marginTop: spacing.sm }]}>
          Your time will stop immediately and a receipt will be saved to your
          history. {remainingMin > 0
            ? `You have about ${formatDuration(remainingMin)} of paid time left — unused time is not refunded.`
            : 'Your paid time has already elapsed.'}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={[typography.body, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        <View style={{ height: spacing.lg }} />
        <Button
          label={isEnding ? 'Ending…' : 'End session now'}
          variant="danger"
          disabled={isEnding}
          onPress={onConfirm}
        />
        <View style={{ height: spacing.sm }} />
        <Button
          label="Keep parking"
          variant="secondary"
          disabled={isEnding}
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

function EndedReceipt({
  session,
  zoneName,
  zoneCode,
  onDone,
}: {
  session: ParkingSession;
  zoneName?: string;
  zoneCode?: string;
  onDone: () => void;
}) {
  const startedMs = new Date(session.startedAt).getTime();
  // Backend `end` returns the updated session, but the schema doesn't have
  // an explicit endedAt — use "now" (the moment we landed on the receipt).
  const endedMs = Date.now();
  const durationMin = Math.max(1, Math.round((endedMs - startedMs) / 60_000));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card
        style={{
          alignItems: 'center',
          gap: spacing.sm,
          borderTopColor: colors.success,
        }}
      >
        <Text style={typography.label}>Session ended</Text>
        <Text style={typography.h1}>Thanks for parking</Text>
        <Text style={typography.bodyMuted}>
          A receipt has been saved to your history.
        </Text>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text style={typography.label}>Zone</Text>
        <Text style={typography.h2}>{zoneName ?? '—'}</Text>
        {zoneCode ? <Text style={typography.bodyMuted}>Zone {zoneCode}</Text> : null}

        <View style={{ height: spacing.sm }} />
        <Text style={typography.label}>Started</Text>
        <Text style={typography.body}>{formatTime(session.startedAt)}</Text>

        <Text style={typography.label}>Ended</Text>
        <Text style={typography.body}>{formatTime(new Date(endedMs).toISOString())}</Text>

        <Text style={typography.label}>Duration parked</Text>
        <Text style={typography.body}>{formatDuration(durationMin)}</Text>

        <View style={{ height: spacing.sm }} />
        <Text style={typography.label}>Total paid</Text>
        <Text style={typography.h2}>
          {formatMoney(session.totalPaidCents, session.currency)}
        </Text>
      </Card>

      <Button
        label="View receipt history"
        variant="secondary"
        onPress={() => router.replace('/history')}
      />
      <Button label="Done" onPress={onDone} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  modalLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: spacing.lg,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.danger,
  },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'rgba(229,83,61,0.08)',
  },
});
