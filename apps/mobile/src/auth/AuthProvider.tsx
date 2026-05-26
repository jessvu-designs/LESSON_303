import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@parking/shared-types';
import { configureApiClient } from '../services/apiClient';
import {
  registerPushTokenWithServer,
  unregisterPushTokenWithServer,
} from '../services/notifications';
import { parkingApi } from '../services/parkingApi';
import { tokenStorage } from '../services/tokenStorage';

interface AuthState {
  loading: boolean;
  token: string | null;
  user: User | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, token: null, user: null });
  const tokenRef = useRef<string | null>(null);
  const qc = useQueryClient();

  const signOut = useCallback(async () => {
    // Best-effort: drop this device's push token on the server before tearing
    // down the API client. If it fails (network / token already gone) we still
    // proceed with local sign-out.
    await unregisterPushTokenWithServer();
    tokenRef.current = null;
    await tokenStorage.clear();
    setState({ loading: false, token: null, user: null });
    qc.clear();
  }, [qc]);

  // Wire fetch client to current token + 401 handler (once).
  useEffect(() => {
    configureApiClient({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        void signOut();
      },
    });
  }, [signOut]);

  // Restore token on launch and hydrate the user.
  useEffect(() => {
    (async () => {
      const token = await tokenStorage.get();
      if (!token) {
        setState({ loading: false, token: null, user: null });
        return;
      }
      tokenRef.current = token;
      try {
        const user = await parkingApi.me();
        setState({ loading: false, token, user });
        // Refresh server-side push token in the background.
        void registerPushTokenWithServer();
      } catch {
        tokenRef.current = null;
        await tokenStorage.clear();
        setState({ loading: false, token: null, user: null });
      }
    })();
  }, []);

  const apply = useCallback(async (token: string, user: User) => {
    tokenRef.current = token;
    await tokenStorage.set(token);
    setState({ loading: false, token, user });
    qc.clear();
    // Don't block the login flow on push registration.
    void registerPushTokenWithServer();
  }, [qc]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await parkingApi.login(email, password);
    await apply(res.token, res.user);
  }, [apply]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await parkingApi.register(email, password, name);
    await apply(res.token, res.user);
  }, [apply]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, signOut }),
    [state, login, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
