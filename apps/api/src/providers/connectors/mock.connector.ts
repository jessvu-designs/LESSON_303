import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ParkingSession,
  ParkingZone,
  QuoteResponse,
} from '@parking/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { sessionToDomain, zoneToDomain } from '../mappers';
import type { ParkingConnector } from '../parking-connector.interface';

const SESSION_INCLUDE = { extensions: true } as const;

/**
 * Prisma-backed mock connector — fills the role of a real city/vendor
 * integration during development. Real connectors will implement the same
 * `ParkingConnector` interface against vendor APIs.
 */
@Injectable()
export class MockConnector implements ParkingConnector {
  readonly providerId = 'prov_mock';
  readonly name = 'Mock Provider';

  constructor(private readonly prisma: PrismaService) {}

  async listZones(): Promise<ParkingZone[]> {
    const rows = await this.prisma.parkingZone.findMany({
      where: { providerId: this.providerId },
      orderBy: { displayName: 'asc' },
    });
    return rows.map(zoneToDomain);
  }

  async getZone(zoneId: string): Promise<ParkingZone | undefined> {
    const row = await this.prisma.parkingZone.findUnique({ where: { id: zoneId } });
    return row ? zoneToDomain(row) : undefined;
  }

  async quote(zoneId: string, minutes: number): Promise<QuoteResponse> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new BadRequestException('minutes must be > 0');
    }
    const zone = await this.getZone(zoneId);
    if (!zone) throw new NotFoundException(`Unknown zone: ${zoneId}`);
    const subtotal = Math.round((zone.rate.hourlyCents * minutes) / 60);
    const fees = zone.rate.flatFeeCents ?? 0;
    return {
      zoneId,
      minutes,
      subtotalCents: subtotal,
      feesCents: fees,
      totalCents: subtotal + fees,
      currency: zone.rate.currency,
    };
  }

  async startSession(input: {
    userId: string;
    vehicleId: string;
    zoneId: string;
    minutes: number;
    paymentMethodId: string;
  }): Promise<ParkingSession> {
    const zone = await this.getZone(input.zoneId);
    if (!zone) throw new NotFoundException(`Unknown zone: ${input.zoneId}`);
    if (zone.rules.maxSessionMinutes && input.minutes > zone.rules.maxSessionMinutes) {
      throw new BadRequestException(
        `Max session for this zone is ${zone.rules.maxSessionMinutes} min`,
      );
    }
    const quote = await this.quote(input.zoneId, input.minutes);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.minutes * 60_000);
    const row = await this.prisma.parkingSession.create({
      data: {
        userId: input.userId,
        vehicleId: input.vehicleId,
        zoneId: input.zoneId,
        providerId: this.providerId,
        startedAt: now,
        expiresAt,
        status: 'active',
        totalPaidCents: quote.totalCents,
        currency: quote.currency,
      },
      include: SESSION_INCLUDE,
    });
    return sessionToDomain(row);
  }

  async extendSession({
    sessionId,
    addedMinutes,
  }: {
    sessionId: string;
    addedMinutes: number;
  }): Promise<ParkingSession> {
    const existing = await this.prisma.parkingSession.findUnique({
      where: { id: sessionId },
      include: SESSION_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Session not found');
    const zone = await this.getZone(existing.zoneId);
    if (!zone?.rules.allowsExtension) {
      throw new BadRequestException('This zone does not allow extension.');
    }
    const quote = await this.quote(existing.zoneId, addedMinutes);
    const newExpiry = new Date(existing.expiresAt.getTime() + addedMinutes * 60_000);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.sessionExtension.create({
        data: { sessionId, addedMinutes, addedCostCents: quote.totalCents },
      }),
      this.prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          expiresAt: newExpiry,
          totalPaidCents: existing.totalPaidCents + quote.totalCents,
        },
        include: SESSION_INCLUDE,
      }),
    ]);
    return sessionToDomain(updated);
  }

  async endSession(sessionId: string): Promise<ParkingSession> {
    const row = await this.prisma.parkingSession
      .update({
        where: { id: sessionId },
        data: { status: 'ended' },
        include: SESSION_INCLUDE,
      })
      .catch(() => {
        throw new NotFoundException('Session not found');
      });
    return sessionToDomain(row);
  }

  async getSession(sessionId: string): Promise<ParkingSession | undefined> {
    const row = await this.prisma.parkingSession.findUnique({
      where: { id: sessionId },
      include: SESSION_INCLUDE,
    });
    return row ? sessionToDomain(row) : undefined;
  }

  async listSessionsForUser(userId: string): Promise<ParkingSession[]> {
    const rows = await this.prisma.parkingSession.findMany({
      where: { userId, providerId: this.providerId },
      include: SESSION_INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
    return rows.map(sessionToDomain);
  }

  async getActiveSessionForUser(userId: string): Promise<ParkingSession | undefined> {
    const row = await this.prisma.parkingSession.findFirst({
      where: { userId, providerId: this.providerId, status: 'active' },
      include: SESSION_INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
    return row ? sessionToDomain(row) : undefined;
  }
}
