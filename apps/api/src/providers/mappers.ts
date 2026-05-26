// Helpers to translate Prisma row shapes to the @parking/shared-types models.
import type { ParkingSession, ParkingZone, SessionExtension } from '@parking/shared-types';

type ZoneRow = {
  id: string;
  cityId: string;
  providerId: string;
  code: string;
  displayName: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hourlyCents: number;
  currency: string;
  flatFeeCents: number | null;
  maxSessionMinutes: number | null;
  allowsExtension: boolean;
  rulesNotes: string | null;
};

export function zoneToDomain(row: ZoneRow): ParkingZone {
  return {
    id: row.id,
    cityId: row.cityId,
    providerId: row.providerId,
    code: row.code,
    displayName: row.displayName,
    address: row.address ?? undefined,
    geo:
      row.latitude != null && row.longitude != null
        ? { lat: row.latitude, lng: row.longitude }
        : undefined,
    rate: {
      hourlyCents: row.hourlyCents,
      currency: row.currency,
      flatFeeCents: row.flatFeeCents ?? undefined,
    },
    rules: {
      maxSessionMinutes: row.maxSessionMinutes ?? undefined,
      allowsExtension: row.allowsExtension,
      notes: row.rulesNotes ?? undefined,
    },
  };
}

type ExtRow = {
  id: string;
  sessionId: string;
  addedMinutes: number;
  addedCostCents: number;
  createdAt: Date;
};

type SessionRow = {
  id: string;
  userId: string;
  vehicleId: string;
  zoneId: string;
  providerId: string;
  startedAt: Date;
  expiresAt: Date;
  status: string;
  totalPaidCents: number;
  currency: string;
  extensions: ExtRow[];
};

export function sessionToDomain(row: SessionRow): ParkingSession {
  const extensions: SessionExtension[] = row.extensions.map((e) => ({
    id: e.id,
    sessionId: e.sessionId,
    addedMinutes: e.addedMinutes,
    addedCostCents: e.addedCostCents,
    createdAt: e.createdAt.toISOString(),
  }));
  return {
    id: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId,
    zoneId: row.zoneId,
    providerId: row.providerId,
    startedAt: row.startedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status: row.status as ParkingSession['status'],
    totalPaidCents: row.totalPaidCents,
    currency: row.currency,
    extensions,
  };
}
