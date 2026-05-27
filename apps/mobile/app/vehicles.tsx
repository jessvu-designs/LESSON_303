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
      Alert.alert('Enter a license plate');
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
      <Text style={typography.h1}>Registered vehicles</Text>
      <Text style={[typography.bodyMuted, { marginBottom: spacing.md }]}>
        Add each plate you may park under. The default vehicle is used when you start a session
        without picking one.
      </Text>

      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <Card>
            <Text style={typography.body}>No vehicles registered.</Text>
            <Text style={typography.bodyMuted}>Register one below to start parking.</Text>
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
                  <Text style={[typography.bodyMuted, { color: colors.link }]}>Default</Text>
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
                <Text style={{ color: colors.link, fontWeight: '600' }}>
                  Set as parking default
                </Text>
              </Pressable>
            ) : null}
          </Card>
        )}
      />

      <View style={{ height: spacing.lg }} />
      <Text style={typography.label}>Register vehicle</Text>
      <View style={styles.form}>
        <TextInput
          value={plate}
          onChangeText={setPlate}
          placeholder="License plate (e.g. AKZ-3914)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="License plate"
        />
        <TextInput
          value={state}
          onChangeText={setStateCode}
          placeholder="State (e.g. WA)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={3}
          style={styles.input}
          accessibilityLabel="State"
        />
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="Nickname (e.g. My Car)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="Vehicle nickname"
        />
        <Button
          label={create.isPending ? 'Adding…' : 'Add vehicle'}
          onPress={add}
          disabled={create.isPending}
        />
      </View>

      <View style={{ height: spacing.md }} />
      <Button label="Return" variant="secondary" onPress={() => router.back()} />
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
