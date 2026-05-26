// API-backed parking service. Talks to the NestJS backend.
import type {
  ParkingSession,
  ParkingZone,
  PaymentMethod,
  QuoteResponse,
  User,
  Vehicle,
} from '@parking/shared-types';
import { api } from './apiClient';

export interface AuthResult {
  token: string;
  user: User;
}

export const parkingApi = {
  // ----- auth -----
  login: (email: string, password: string) =>
    api.post<AuthResult>('/auth/login', { email, password }),
  register: (email: string, password: string, name?: string) =>
    api.post<AuthResult>('/auth/register', { email, password, name }),

  // ----- account -----
  me: () => api.get<User>('/users/me'),
  myVehicles: () => api.get<Vehicle[]>('/users/me/vehicles'),
  createVehicle: (input: {
    licensePlate: string;
    state?: string;
    nickname?: string;
    isDefault?: boolean;
  }) => api.post<Vehicle>('/users/me/vehicles', input),
  updateVehicle: (
    id: string,
    input: { licensePlate?: string; state?: string | null; nickname?: string | null; isDefault?: boolean },
  ) => api.patch<Vehicle>(`/users/me/vehicles/${id}`, input),
  deleteVehicle: (id: string) => api.del<void>(`/users/me/vehicles/${id}`),
  myPaymentMethods: () => api.get<PaymentMethod[]>('/users/me/payment-methods'),

  // ----- discovery -----
  listZones: () => api.get<ParkingZone[]>('/providers/zones'),
  getZone: (zoneId: string) => api.get<ParkingZone>(`/providers/zones/${zoneId}`),

  // ----- quoting -----
  quote: (zoneId: string, minutes: number) =>
    api.get<QuoteResponse>(`/sessions/quote?zoneId=${encodeURIComponent(zoneId)}&minutes=${minutes}`),

  // ----- sessions -----
  activeSession: () => api.get<ParkingSession | null>('/sessions/active'),
  listSessions: () => api.get<ParkingSession[]>('/sessions'),
  getSession: (id: string) => api.get<ParkingSession>(`/sessions/${id}`),
  startSession: (input: {
    vehicleId: string;
    zoneId: string;
    minutes: number;
    paymentMethodId: string;
  }) => api.post<ParkingSession>('/sessions', input),
  extendSession: (sessionId: string, addedMinutes: number) =>
    api.post<ParkingSession>('/sessions/extend', { sessionId, addedMinutes }),
  endSession: (sessionId: string) =>
    api.post<ParkingSession>(`/sessions/${sessionId}/end`),

  // ----- payments -----
  createSetupIntent: () =>
    api.post<{
      stripe: boolean;
      clientSecret?: string;
      ephemeralKeySecret?: string;
      customerId?: string;
    }>('/payments/setup-intent'),
  syncPaymentMethods: () => api.post<PaymentMethod[]>('/payments/sync'),
  addStubPaymentMethod: () => api.post<PaymentMethod>('/payments/payment-methods/stub'),
  deletePaymentMethod: (id: string) =>
    api.del<{ ok: true }>(`/payments/payment-methods/${id}`),

  // ----- push tokens -----
  registerDevice: (token: string, platform: 'ios' | 'android' | 'web') =>
    api.post<{ ok: true }>('/devices/register', { token, platform }),
  unregisterDevice: (token: string) =>
    api.del<void>(`/devices/${encodeURIComponent(token)}`),
};
