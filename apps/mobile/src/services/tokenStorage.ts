import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'parking_auth_token';

// SecureStore is unavailable on web; fall back to an in-memory copy.
let memToken: string | null = null;

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return memToken;
    return SecureStore.getItemAsync(KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      memToken = token;
      return;
    }
    await SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      memToken = null;
      return;
    }
    await SecureStore.deleteItemAsync(KEY);
  },
};
