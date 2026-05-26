import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[typography.bodyMuted, { marginTop: spacing.sm }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={[typography.h2, { color: colors.danger, textAlign: 'center' }]}>
        Something went wrong
      </Text>
      <Text style={[typography.bodyMuted, { marginTop: spacing.sm, textAlign: 'center' }]}>
        {message}
      </Text>
      {onRetry ? (
        <Button label="Try again" onPress={onRetry} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
});
