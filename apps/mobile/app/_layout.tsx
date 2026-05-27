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

// On web, constrain the app to a responsive mobile-sized column centered on
// a dark backdrop. The column fills the available viewport and shrinks
// naturally on smaller windows, capped at mobile max width × height. On
// native, this is a passthrough.
const PHONE_MAX_WIDTH = 480;
const PHONE_MAX_HEIGHT = 900;
const BACKDROP_COLOR = '#0A0A0A';

// Inject the mobile-frame CSS at module load time (not inside a component),
// so it lands in <head> before React mounts. !important rules are required
// to beat the inline `flex: 1; height: 100%` styles react-native-web puts
// on the app root, and the default `#expo-reset` <style> shipped in the
// Expo Router single-output index.html.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'mobile-frame-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.innerHTML = `
      html, body {
        height: 100% !important;
        margin: 0 !important;
        background: ${BACKDROP_COLOR} !important;
        overflow: hidden !important;
      }
      #root {
        display: flex !important;
        width: 100vw !important;
        height: 100vh !important;
        background: ${BACKDROP_COLOR} !important;
        flex: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <OverlayHost>{children}</OverlayHost>;
  // Render an explicit centered phone-sized frame via RN-Web (which compiles
  // to CSS classes). This is more reliable than runtime document.style
  // injection because it survives bundler tree-shaking and SSR/hydration.
  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: BACKDROP_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
      }}
    >
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: PHONE_MAX_WIDTH,
          maxHeight: PHONE_MAX_HEIGHT,
          backgroundColor: colors.bg,
          overflow: 'hidden',
          // @ts-expect-error web-only style
          boxShadow: '0 10px 60px rgba(0, 0, 0, 0.7)',
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
