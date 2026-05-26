import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorState, Loading } from '../src/components/Status';
import { STRIPE_ENABLED, STRIPE_MERCHANT_ID } from '../src/config';
import {
  useAddStubCard,
  useDeletePaymentMethod,
  usePaymentMethods,
  useSyncPaymentMethods,
} from '../src/hooks/parkingHooks';
import { parkingApi } from '../src/services/parkingApi';
import { colors, spacing, typography } from '../src/theme/tokens';

// Lazy require so the app still runs in environments where the native
// Stripe SDK isn't linked (e.g. plain Expo Go without a dev client).
function useStripePaymentSheet() {
  if (!STRIPE_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');
  } catch {
    return null;
  }
}

export default function WalletScreen() {
  const pmsQ = usePaymentMethods();
  const sync = useSyncPaymentMethods();
  const addStub = useAddStubCard();
  const remove = useDeletePaymentMethod();
  const stripeSdk = useStripePaymentSheet();
  const [busy, setBusy] = useState(false);

  if (pmsQ.isLoading) return <Loading label="Loading payment methods…" />;
  if (pmsQ.isError) {
    return <ErrorState message={(pmsQ.error as Error).message} onRetry={() => pmsQ.refetch()} />;
  }

  const methods = pmsQ.data ?? [];
  const canUseRealStripe = STRIPE_ENABLED && !!stripeSdk;

  async function addRealCard() {
    if (!stripeSdk) return;
    setBusy(true);
    try {
      const intent = await parkingApi.createSetupIntent();
      if (!intent.stripe || !intent.clientSecret) {
        Alert.alert('Stripe not configured', 'The API is in stub mode.');
        return;
      }
      const init = await stripeSdk.initPaymentSheet({
        merchantDisplayName: 'PARKER',
        customerId: intent.customerId,
        customerEphemeralKeySecret: intent.ephemeralKeySecret,
        setupIntentClientSecret: intent.clientSecret,
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: true },
        allowsDelayedPaymentMethods: false,
      });
      if (init.error) throw new Error(init.error.message);

      const presented = await stripeSdk.presentPaymentSheet();
      if (presented.error) {
        if (presented.error.code !== 'Canceled') {
          Alert.alert('Could not save card', presented.error.message);
        }
        return;
      }
      await sync.mutateAsync();
    } catch (e) {
      Alert.alert('Could not save card', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addDemoCard() {
    try {
      await addStub.mutateAsync();
    } catch (e) {
      Alert.alert('Could not add demo card', (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={typography.h1}>Payment methods</Text>
      <Text style={[typography.bodyMuted, { marginBottom: spacing.md }]}>
        Saved cards are used to authorize parking. Charges never exceed the quoted total.
      </Text>

      <FlatList
        data={methods}
        keyExtractor={(m) => m.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <Card>
            <Text style={typography.body}>No payment methods on file.</Text>
            <Text style={typography.bodyMuted}>Add a card below to start parking.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={typography.body}>
                {item.brand.toUpperCase()} ···· {item.last4 ?? '----'}
              </Text>
              {item.expMonth && item.expYear ? (
                <Text style={typography.bodyMuted}>
                  Expires {String(item.expMonth).padStart(2, '0')}/{item.expYear}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove card ending in ${item.last4 ?? 'unknown'}`}
              onPress={() =>
                Alert.alert('Remove card?', 'You can add it again later.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => remove.mutate(item.id),
                  },
                ])
              }
              hitSlop={12}
            >
              <Text style={{ color: colors.warning, fontWeight: '600' }}>Remove</Text>
            </Pressable>
          </Card>
        )}
      />

      <View style={{ height: spacing.lg }} />

      {canUseRealStripe ? (
        <Button
          label={busy ? 'Opening…' : 'Add card / Apple Pay / Google Pay'}
          onPress={addRealCard}
          disabled={busy}
        />
      ) : (
        <>
          <Button
            label={addStub.isPending ? 'Adding…' : 'Add demo card (Visa ···· 4242)'}
            onPress={addDemoCard}
            disabled={addStub.isPending}
          />
          <Text style={[typography.bodyMuted, { marginTop: spacing.sm, textAlign: 'center' }]}>
            Stripe is not configured. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY
            to enable real cards and Apple/Google Pay.
          </Text>
        </>
      )}

      <View style={{ height: spacing.md }} />
      <Button label="Return" variant="secondary" onPress={() => router.back()} />

      {STRIPE_MERCHANT_ID ? null : null /* referenced for tree-shaking */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
});
