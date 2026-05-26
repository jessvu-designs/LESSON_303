import { Platform } from 'react-native';

/**
 * API base URL.
 * Override via EXPO_PUBLIC_API_URL (e.g. http://192.168.1.10:3000) when testing
 * on a physical device — `localhost` from the phone points at the phone, not your dev box.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, '');
  // Android emulator maps host loopback to 10.0.2.2.
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE_URL = resolveBaseUrl();

/**
 * Stripe configuration.
 * - EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_... (required for real cards / Apple Pay / Google Pay)
 * - EXPO_PUBLIC_STRIPE_MERCHANT_ID: Apple Pay merchant id (e.g. merchant.com.yourorg.parking)
 * When the publishable key is missing, the wallet screen falls back to a
 * "demo card" flow that uses the API stub endpoint.
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const STRIPE_MERCHANT_ID =
  process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID ?? 'merchant.com.example.parking';
export const STRIPE_ENABLED = STRIPE_PUBLISHABLE_KEY.length > 0;
