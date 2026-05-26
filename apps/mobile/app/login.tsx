import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { useAuth } from '../src/auth/AuthProvider';
import { colors, radii, spacing, typography } from '../src/theme/tokens';

type Mode = 'signin' | 'signup';

// RN's Alert.alert is a no-op on web. Fall back to window.alert so the user
// can actually see login / network errors in a browser.
function notify(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo1234');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'signin') await login(email.trim(), password);
      else await register(email.trim(), password, name.trim() || undefined);
    } catch (e) {
      notify(
        mode === 'signin' ? 'Could not sign in' : 'Could not create account',
        (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={typography.h1}>PARKER</Text>
        <Text style={[typography.bodyMuted, { marginBottom: spacing.lg }]}>
          {mode === 'signin' ? 'Sign in to manage active parking and zone payments.' : 'Create an account to start parking with PARKER.'}
        </Text>

        <Card style={{ gap: spacing.md }}>
          {mode === 'signup' ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.label}>Name (optional)</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          ) : null}

          <View style={{ gap: spacing.xs }}>
            <Text style={typography.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={typography.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="password"
              style={styles.input}
            />
          </View>

          <Button
            label={busy ? 'Please wait…' : mode === 'signin' ? 'Sign in to PARKER' : 'Create PARKER account'}
            onPress={submit}
            disabled={busy || !email || !password}
          />
          <Button
            label={mode === 'signin' ? 'Create account' : 'I already have an account'}
            variant="secondary"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          />
        </Card>

        {mode === 'signin' ? (
          <Text style={[typography.bodyMuted, { marginTop: spacing.lg, textAlign: 'center' }]}>
            Demo account: demo@example.com / demo1234
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    fontSize: 16,
  },
});
