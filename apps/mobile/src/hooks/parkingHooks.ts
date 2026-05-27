import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parkingApi } from '../services/parkingApi';
import { type Coords, getCurrentCoords, reverseGeocode } from '../services/location';
import {
  cancelSessionReminders,
  ensureNotificationPermission,
  scheduleSessionReminders,
} from '../services/notifications';
import { qk } from '../services/queryClient';

export function useCurrentLocation() {
  return useQuery({
    queryKey: ['location', 'current'],
    queryFn: getCurrentCoords,
    staleTime: 60_000,
  });
}

/**
 * Reverse-geocode a coordinate to a human-readable address. Bucketed at
 * ~11 m precision so small drag jitter doesn't spam the platform geocoder.
 */
export function useReverseGeocode(coords?: Coords | null) {
  const bucket = coords
    ? `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`
    : null;
  return useQuery({
    queryKey: ['location', 'reverse', bucket],
    queryFn: () => reverseGeocode(coords as Coords),
    enabled: !!coords,
    staleTime: 5 * 60_000,
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: qk.activeSession,
    queryFn: parkingApi.activeSession,
    // Poll while screen is open so the countdown source-of-truth stays fresh.
    refetchInterval: 30_000,
  });
}

export function useZones() {
  return useQuery({ queryKey: qk.zones, queryFn: parkingApi.listZones });
}

export function useZone(zoneId?: string) {
  return useQuery({
    queryKey: zoneId ? qk.zone(zoneId) : ['zone', 'none'],
    queryFn: () => parkingApi.getZone(zoneId as string),
    enabled: !!zoneId,
  });
}

export function useQuote(zoneId?: string, minutes?: number) {
  return useQuery({
    queryKey: zoneId && minutes ? qk.quote(zoneId, minutes) : ['quote', 'none'],
    queryFn: () => parkingApi.quote(zoneId as string, minutes as number),
    enabled: !!zoneId && !!minutes,
  });
}

export function useVehicles() {
  return useQuery({ queryKey: qk.vehicles, queryFn: parkingApi.myVehicles });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parkingApi.createVehicle,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vehicles }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      patch: { licensePlate?: string; state?: string | null; nickname?: string | null; isDefault?: boolean };
    }) => parkingApi.updateVehicle(vars.id, vars.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vehicles }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parkingApi.deleteVehicle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vehicles }),
  });
}

export function usePaymentMethods() {
  return useQuery({ queryKey: qk.paymentMethods, queryFn: parkingApi.myPaymentMethods });
}

export function useSessions() {
  return useQuery({ queryKey: qk.sessions, queryFn: parkingApi.listSessions });
}

function invalidateSessions(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.refetchQueries({ queryKey: qk.activeSession }),
    qc.refetchQueries({ queryKey: qk.sessions }),
  ]);
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parkingApi.startSession,
    onSuccess: async (session) => {
      await invalidateSessions(qc);
      if (await ensureNotificationPermission()) {
        await scheduleSessionReminders(session);
      }
    },
  });
}

export function useExtendSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionId: string; addedMinutes: number }) =>
      parkingApi.extendSession(vars.sessionId, vars.addedMinutes),
    onSuccess: async (session) => {
      await invalidateSessions(qc);
      // Reschedule against the new expiry.
      if (await ensureNotificationPermission()) {
        await scheduleSessionReminders(session);
      }
    },
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => parkingApi.endSession(sessionId),
    onSuccess: async (session) => {
      // Clear the active-session cache immediately so the home screen
      // hides the "Parking active" card without waiting for a network
      // refetch (which could race with navigation back to /).
      qc.setQueryData(qk.activeSession, null);
      await invalidateSessions(qc);
      await cancelSessionReminders(session.id);
    },
  });
}

// ----- payments -----

export function useAddStubCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parkingApi.addStubPaymentMethod,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.paymentMethods }),
  });
}

export function useSyncPaymentMethods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: parkingApi.syncPaymentMethods,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.paymentMethods }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parkingApi.deletePaymentMethod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.paymentMethods }),
  });
}
