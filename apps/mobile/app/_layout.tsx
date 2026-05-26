import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { Loading } from '../src/components/Status';
import { OverlayHost } from '../src/components/OverlayHost';
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

// On web desktop, constrain the app to a phone-sized window (iPhone 14/15
// logical resolution: 390 x 844) centered on a dark backdrop so it always
// looks like the mobile app. On native, this is a passthrough.
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const PHONE_RADIUS = 44;
const BACKDROP_COLOR = '#0A0A0A';

function MobileFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <OverlayHost>{children}</OverlayHost>;
  // Inject global CSS once so html/body fill the viewport with the backdrop.
  if (typeof document !== 'undefined' && !document.getElementById('mobile-frame-style')) {
    const style = document.createElement('style');
    style.id = 'mobile-frame-style';
    style.innerHTML = `
      html, body, #root { height: 100%; margin: 0; background: ${BACKDROP_COLOR}; }
      body { overflow: hidden; }
    `;
    document.head.appendChild(style);
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BACKDROP_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: '100%',
          height: '100%',
          maxWidth: PHONE_WIDTH,
          maxHeight: PHONE_HEIGHT,
          backgroundColor: colors.bg,
          overflow: 'hidden',
          borderRadius: PHONE_RADIUS,
          ...(Platform.OS === 'web'
            ? ({ boxShadow: '0 10px 60px rgba(0,0,0,0.7)' } as object)
            : {}),
        }}
      >
        <OverlayHost>{children}</OverlayHost>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MaybeStripeProvider>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <MobileFrame>
              <AuthGate>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bg },
                  headerTintColor: colors.text,
                  headerTitleStyle: {
                    fontWeight: '700',
                  },
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen
                  name="index"
                  options={{
                    headerTitle: () => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="car-outline" size={19} color={colors.text} />
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, letterSpacing: 0.8 }}>PARKER</Text>
                      </View>
                    ),
                  }}
                />
                <Stack.Screen name="confirm" options={{ title: 'Confirm Parking Zone' }} />
                <Stack.Screen name="session" options={{ title: 'Active Parking' }} />
                <Stack.Screen name="extend" options={{ title: 'Extend Parking', presentation: 'modal' }} />
                <Stack.Screen name="history" options={{ title: 'History' }} />
                <Stack.Screen name="wallet" options={{ title: 'Payment Methods' }} />
                <Stack.Screen name="vehicles" options={{ title: 'Registered Vehicles' }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
              </Stack>
            </AuthGate>
            </MobileFrame>
          </SafeAreaProvider>
        </MaybeStripeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
