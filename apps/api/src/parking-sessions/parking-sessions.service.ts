import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ExtendSessionRequest,
  ParkingSession,
  QuoteResponse,
  StartSessionRequest,
} from '@parking/shared-types';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';

@Injectable()
export class ParkingSessionsService {
  constructor(
    private readonly providers: ProvidersService,
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  private async connectorForZone(zoneId: string) {
    // Ask every connector — the first one that knows this zone owns it.
    for (const c of this.providers.all()) {
      const zone = await c.getZone(zoneId);
      if (zone) return this.providers.get(zone.providerId);
    }
    throw new BadRequestException(`Unknown zone: ${zoneId}`);
  }

  private async connectorForSession(sessionId: string) {
    const row = await this.prisma.parkingSession.findUnique({ where: { id: sessionId } });
    if (!row) throw new BadRequestException(`Unknown session: ${sessionId}`);
    return this.providers.get(row.providerId);
  }

  async quote(zoneId: string, minutes: number): Promise<QuoteResponse> {
    const c = await this.connectorForZone(zoneId);
    return c.quote(zoneId, minutes);
  }

  async start(userId: string, req: StartSessionRequest): Promise<ParkingSession> {
    // Authorize payment up front. We don't actually charge for the demo —
    // the brief separates user wallet authorization from provider transaction
    // execution — but the payment method must exist and belong to the user.
    if (!req.paymentMethodId) {
      throw new BadRequestException('paymentMethodId is required');
    }
    await this.payments.assertOwned(userId, req.paymentMethodId);

    // Ensure the vehicle belongs to this user. Resolution order:
    //   1. explicit req.vehicleId (must be owned)
    //   2. user's default vehicle
    //   3. first vehicle on file
    //   4. auto-create an UNKNOWN placeholder so first-time users can park
    let vehicleId = req.vehicleId;
    let vehicle = vehicleId
      ? await this.prisma.parkingVehicle.findUnique({ where: { id: vehicleId } })
      : null;
    if (vehicleId && (!vehicle || vehicle.userId !== userId)) {
      throw new BadRequestException('Vehicle not found');
    }
    if (!vehicle) {
      vehicle =
        (await this.prisma.parkingVehicle.findFirst({
          where: { userId, isDefault: true },
        })) ??
        (await this.prisma.parkingVehicle.findFirst({
          where: { userId },
          orderBy: { id: 'asc' },
        }));
    }
    if (!vehicle) {
      vehicle = await this.prisma.parkingVehicle.create({
        data: { userId, licensePlate: 'UNKNOWN', nickname: 'My Car', isDefault: true },
      });
    }
    vehicleId = vehicle.id;

    const c = await this.connectorForZone(req.zoneId);
    return c.startSession({ ...req, vehicleId, userId });
  }

  async extend(req: ExtendSessionRequest): Promise<ParkingSession> {
    const c = await this.connectorForSession(req.sessionId);
    const result = await c.extendSession(req);
    // Reset reminder flags so the user gets fresh 15/5-min pings on the new expiry.
    await this.prisma.parkingSession.update({
      where: { id: req.sessionId },
      data: { reminder15Sent: false, reminder5Sent: false, expiredSent: false },
    });
    return result;
  }

  async end(sessionId: string): Promise<ParkingSession> {
    const c = await this.connectorForSession(sessionId);
    return c.endSession(sessionId);
  }

  async get(sessionId: string): Promise<ParkingSession | undefined> {
    for (const c of this.providers.all()) {
      const s = await c.getSession(sessionId);
      if (s) return s;
    }
    return undefined;
  }

  async listForUser(userId: string): Promise<ParkingSession[]> {
    const all = await Promise.all(
      this.providers.all().map((c) => c.listSessionsForUser(userId)),
    );
    return all.flat().sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  }

  async getActiveForUser(userId: string): Promise<ParkingSession | undefined> {
    for (const c of this.providers.all()) {
      const s = await c.getActiveSessionForUser(userId);
      if (!s) continue;
      // Lazily expire stale sessions so a fresh sign-in never surfaces an
      // active session whose timer has already run out (the reminder
      // scheduler may not have ticked yet, or may be stopped in dev).
      if (new Date(s.expiresAt).getTime() <= Date.now()) {
        await this.prisma.parkingSession.update({
          where: { id: s.id },
          data: { status: 'expired' },
        }).catch(() => undefined);
        continue;
      }
      return s;
    }
    return undefined;
  }
}
