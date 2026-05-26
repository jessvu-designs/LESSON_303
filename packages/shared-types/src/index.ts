// Universal Parking — shared domain models.
// Used by both the mobile app and the API to keep contracts consistent.

export type ID = string;
export type ISODateString = string;

export interface User {
  id: ID;
  email: string;
  name?: string;
  defaultPaymentMethodId?: ID;
  defaultVehicleId?: ID;
}

export interface Vehicle {
  id: ID;
  userId: ID;
  licensePlate: string;
  state?: string;     // e.g. "WA"
  nickname?: string;  // e.g. "My Car"
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: ID;
  userId: ID;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'apple_pay' | 'google_pay' | 'other';
  last4?: string;
  expMonth?: number;
  expYear?: number;
}

export interface City {
  id: ID;
  name: string;
  state?: string;
  country: string;
  providerIds: ID[];
}

export interface ParkingProvider {
  id: ID;
  name: string;
  /** Integration mode used to talk to this provider. */
  mode: 'direct_api' | 'adapter' | 'manual_fallback';
}

export interface ParkingZone {
  id: ID;
  cityId: ID;
  providerId: ID;
  code: string;       // e.g. "1234"
  displayName: string;
  address?: string;
  geo?: { lat: number; lng: number };
  rules: ParkingRule;
  rate: ParkingRate;
}

export interface ParkingRate {
  /** Cost per hour in the smallest currency unit (e.g. cents). */
  hourlyCents: number;
  currency: 'USD' | 'EUR' | 'GBP' | string;
  /** Optional flat session fee. */
  flatFeeCents?: number;
}

export interface ParkingRule {
  /** Max minutes a single session can run. */
  maxSessionMinutes?: number;
  /** Whether the user can extend a running session. */
  allowsExtension: boolean;
  /** Operating hours (24h), e.g. "08:00"–"20:00". */
  enforcedHours?: { start: string; end: string };
  /** Days of week enforced (0 = Sun .. 6 = Sat). */
  enforcedDays?: number[];
  /** Free, human-readable notes (e.g. "Street cleaning Tue 9–11"). */
  notes?: string;
}

export type SessionStatus =
  | 'pending'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'ended'
  | 'failed';

export interface ParkingSession {
  id: ID;
  userId: ID;
  vehicleId: ID;
  zoneId: ID;
  providerId: ID;
  startedAt: ISODateString;
  expiresAt: ISODateString;
  status: SessionStatus;
  totalPaidCents: number;
  currency: string;
  extensions: SessionExtension[];
  receiptId?: ID;
}

export interface SessionExtension {
  id: ID;
  sessionId: ID;
  addedMinutes: number;
  addedCostCents: number;
  createdAt: ISODateString;
}

export interface Receipt {
  id: ID;
  sessionId: ID;
  userId: ID;
  issuedAt: ISODateString;
  totalCents: number;
  currency: string;
  lineItems: Array<{ label: string; amountCents: number }>;
}

// ---------- API contracts ----------

export interface StartSessionRequest {
  vehicleId: ID;
  zoneId: ID;
  minutes: number;
  paymentMethodId: ID;
}

export interface ExtendSessionRequest {
  sessionId: ID;
  addedMinutes: number;
}

export interface QuoteRequest {
  zoneId: ID;
  minutes: number;
}

export interface QuoteResponse {
  zoneId: ID;
  minutes: number;
  subtotalCents: number;
  feesCents: number;
  totalCents: number;
  currency: string;
}
