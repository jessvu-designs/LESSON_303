// Common interface every city/provider connector must implement.
// This is the abstraction that lets us scale across fragmented city systems.
import type {
  ParkingSession,
  ParkingZone,
  QuoteResponse,
} from '@parking/shared-types';

export interface ParkingConnector {
  readonly providerId: string;
  readonly name: string;

  listZones(): Promise<ParkingZone[]>;
  getZone(zoneId: string): Promise<ParkingZone | undefined>;
  quote(zoneId: string, minutes: number): Promise<QuoteResponse>;

  startSession(input: {
    userId: string;
    vehicleId: string;
    zoneId: string;
    minutes: number;
    paymentMethodId: string;
  }): Promise<ParkingSession>;

  extendSession(input: { sessionId: string; addedMinutes: number }): Promise<ParkingSession>;
  endSession(sessionId: string): Promise<ParkingSession>;
  getSession(sessionId: string): Promise<ParkingSession | undefined>;

  /** List all sessions for a user across this connector. */
  listSessionsForUser(userId: string): Promise<ParkingSession[]>;
  /** Return the user's currently active session, if any. */
  getActiveSessionForUser(userId: string): Promise<ParkingSession | undefined>;
}
