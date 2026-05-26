import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorState, Loading } from '../src/components/Status';
import {
  useCreateVehicle,
  useDeleteVehicle,
  useUpdateVehicle,
  useVehicles,
} from '../src/hooks/parkingHooks';
import { colors, radii, spacing, typography } from '../src/theme/tokens';

export default function VehiclesScreen() {
  const vehiclesQ = useVehicles();
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const remove = useDeleteVehicle();

  const [plate, setPlate] = useState('');
  const [state, setStateCode] = useState('');
  const [nickname, setNickname] = useState('');

  if (vehiclesQ.isLoading) return <Loading label="Loading vehicles…" />;
  if (vehiclesQ.isError) {
    return (
      <ErrorState
        message={(vehiclesQ.error as Error).message}
        onRetry={() => vehiclesQ.refetch()}
      />
    );
  }

  const vehicles = vehiclesQ.data ?? [];

  async function add() {
    if (!plate.trim()) {
      Alert.alert('License plate required');
      return;
    }
    try {
      await create.mutateAsync({
        licensePlate: plate,
        state: state.trim() || undefined,
        nickname: nickname.trim() || undefined,
      });
      setPlate('');
      setStateCode('');
      setNickname('');
    } catch (e) {
      Alert.alert('Could not add vehicle', (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={typography.h1}>Vehicles</Text>
      <Text style={[typography.bodyMuted, { marginBottom: spacing.md }]}>
        Add every plate you might park under. The default is used when you start a session
        without picking one.
      </Text>

      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <Card>
            <Text style={typography.body}>No vehicles yet.</Text>
            <Text style={typography.bodyMuted}>Add one below to start parking.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={typography.body}>
                  {item.nickname ?? 'Vehicle'} · {item.licensePlate}
                  {item.state ? ` (${item.state})` : ''}
                </Text>
                {item.isDefault ? (
                  <Text style={[typography.bodyMuted, { color: colors.primary }]}>Default</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.licensePlate}`}
                onPress={() =>
                  Alert.alert('Remove vehicle?', `${item.licensePlate} will be removed.`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () =>
                        remove.mutate(item.id, {
                          onError: (e) =>
                            Alert.alert('Could not remove', (e as Error).message),
                        }),
                    },
                  ])
                }
                hitSlop={12}
              >
                <Text style={{ color: colors.warning, fontWeight: '600' }}>Remove</Text>
              </Pressable>
            </View>
            {!item.isDefault ? (
              <Pressable
                onPress={() =>
                  update.mutate({ id: item.id, patch: { isDefault: true } })
                }
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  Set as default
                </Text>
              </Pressable>
            ) : null}
          </Card>
        )}
      />

      <View style={{ height: spacing.lg }} />
      <Text style={typography.label}>Add a vehicle</Text>
      <View style={styles.form}>
        <TextInput
          value={plate}
          onChangeText={setPlate}
          placeholder="License plate (e.g. AKZ-3914)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
        <TextInput
          value={state}
          onChangeText={setStateCode}
          placeholder="State (e.g. WA)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={3}
          style={styles.input}
        />
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="Nickname (e.g. My Car)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Button
          label={create.isPending ? 'Adding…' : 'Add vehicle'}
          onPress={add}
          disabled={create.isPending}
        />
      </View>

      <View style={{ height: spacing.md }} />
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  form: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
});
