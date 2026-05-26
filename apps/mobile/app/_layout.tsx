import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { Loading } from '../src/components/Status';
import { STRIPE_ENABLED, STRIPE_MERCHANT_ID, STRIPE_PUBLISHABLE_KEY } from '../src/config';
import { queryClient } from '../src/services/queryClient';
import { colors } from '../src/theme/tokens';

// Optional Stripe wrapper. If the native module isn't linked (e.g. plain
// Expo Go), this component renders children unchanged.
function MaybeStripeProvider({ children }: { children: React.ReactElement | React.ReactElement[] }) {
  if (!STRIPE_ENABLED) return <>{children}</>;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StripeProvider } = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');
    return (
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier={STRIPE_MERCHANT_ID}
      >
        {children}
      </StripeProvider>
    );
  } catch {
    return <>{children}</>;
  }
}

function AuthGate({ children }: { children: React.ReactElement | React.ReactElement[] }) {
  const { loading, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login';

  useEffect(() => {
    if (loading) return;
    if (!token && !onLogin) router.replace('/login');
    else if (token && onLogin) router.replace('/');
  }, [loading, token, onLogin, router]);

  if (loading) return <Loading />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MaybeStripeProvider>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <AuthGate>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bg },
                  headerTintColor: colors.text,
                  headerTitleStyle: { fontWeight: '600' },
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen
                  name="index"
                  options={{
                    headerTitle: () => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="car-outline" size={18} color={colors.text} />
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 17 }}>PARKER</Text>
                      </View>
                    ),
                  }}
                />
                <Stack.Screen name="confirm" options={{ title: 'Confirm Parking' }} />
                <Stack.Screen name="session" options={{ title: 'Active Session' }} />
                <Stack.Screen name="extend" options={{ title: 'Extend Time', presentation: 'modal' }} />
                <Stack.Screen name="history" options={{ title: 'History' }} />
                <Stack.Screen name="wallet" options={{ title: 'Wallet' }} />
                <Stack.Screen name="vehicles" options={{ title: 'Vehicles' }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
              </Stack>
            </AuthGate>
          </SafeAreaProvider>
        </MaybeStripeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
