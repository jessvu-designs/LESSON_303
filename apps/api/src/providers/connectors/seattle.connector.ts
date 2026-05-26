import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ParkingSession, ParkingZone, QuoteResponse } from '@parking/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { sessionToDomain, zoneToDomain } from '../mappers';
import type { ParkingConnector } from '../parking-connector.interface';
import { SeattleApiClient, type UpstreamZone } from '../upstream/seattle-api.client';

const SESSION_INCLUDE = { extensions: true } as const;

/**
 * First real city connector — Seattle (stubbed). Demonstrates the integration
 * pattern: fetch zones from an upstream API, cache them locally, and translate
 * the upstream payload into the universal domain model. Session lifecycle calls
 * are forwarded to the upstream and the result is mirrored in our DB so
 * cross-provider listings and history work uniformly.
 */
@Injectable()
export class SeattleConnector implements ParkingConnector {
  readonly providerId = 'prov_seattle';
  readonly name = 'Seattle (pay-by-phone)';

  private readonly api = new SeattleApiClient();

  constructor(private readonly prisma: PrismaService) {}

  async listZones(): Promise<ParkingZone[]> {
    const upstream = await this.api.listZones();
    await this.cacheZones(upstream);
    const rows = await this.prisma.parkingZone.findMany({
      where: { providerId: this.providerId },
      orderBy: { displayName: 'asc' },
    });
    return rows.map(zoneToDomain);
  }

  async getZone(zoneId: string): Promise<ParkingZone | undefined> {
    const row = await this.prisma.parkingZone.findUnique({ where: { id: zoneId } });
    if (row && row.providerId === this.providerId) return zoneToDomain(row);
    // Cache-miss: refresh from upstream and try again.
    const upstream = await this.api.listZones();
    await this.cacheZones(upstream);
    const refreshed = await this.prisma.parkingZone.findUnique({ where: { id: zoneId } });
    return refreshed && refreshed.providerId === this.providerId
      ? zoneToDomain(refreshed)
      : undefined;
  }

  async quote(zoneId: string, minutes: number): Promise<QuoteResponse> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new BadRequestException('minutes must be > 0');
    }
    const zone = await this.getZone(zoneId);
    if (!zone) throw new NotFoundException(`Unknown Seattle zone: ${zoneId}`);
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
    if (!zone) throw new NotFoundException(`Unknown Seattle zone: ${input.zoneId}`);
    if (zone.rules.maxSessionMinutes && input.minutes > zone.rules.maxSessionMinutes) {
      throw new BadRequestException(
        `Max session for this zone is ${zone.rules.maxSessionMinutes} min`,
      );
    }

    const vehicle = await this.prisma.parkingVehicle.findUnique({
      where: { id: input.vehicleId },
    });
    const plate = vehicle?.licensePlate ?? 'UNKNOWN';

    // Talk to the upstream first. If it rejects, we never persist a session.
    const ack = await this.api.startSession({
      zoneId: input.zoneId,
      licensePlate: plate,
      minutes: input.minutes,
    });

    const quote = await this.quote(input.zoneId, input.minutes);
    const row = await this.prisma.parkingSession.create({
      data: {
        userId: input.userId,
        vehicleId: input.vehicleId,
        zoneId: input.zoneId,
        providerId: this.providerId,
        startedAt: new Date(ack.started_at),
        expiresAt: new Date(ack.expires_at),
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

    // Upstream is the source of truth for the new expiry in a real integration.
    // We pass our local sessionId as a stand-in for upstream_session_id since
    // the fixture mode doesn't persist one.
    const ack = await this.api.extendSession({
      upstreamSessionId: sessionId,
      addedMinutes,
    });
    const quote = await this.quote(existing.zoneId, addedMinutes);
    const newExpiry = this.api.live
      ? new Date(ack.expires_at)
      : new Date(existing.expiresAt.getTime() + addedMinutes * 60_000);

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
    await this.api.endSession(sessionId);
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
    return row && row.providerId === this.providerId ? sessionToDomain(row) : undefined;
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

  /** Upserts upstream zones into the local cache. */
  private async cacheZones(upstream: UpstreamZone[]): Promise<void> {
    await Promise.all(
      upstream.map((u) =>
        this.prisma.parkingZone.upsert({
          where: { id: u.zone_id },
          create: {
            id: u.zone_id,
            cityId: 'city_sea',
            providerId: this.providerId,
            code: u.code,
            displayName: u.display_name,
            address: u.address,
            latitude: u.lat,
            longitude: u.lng,
            hourlyCents: u.rate_cents_per_hour,
            currency: u.currency,
            maxSessionMinutes: u.max_minutes,
            allowsExtension: u.allows_extension,
            rulesNotes: u.rules_notes ?? null,
          },
          update: {
            code: u.code,
            displayName: u.display_name,
            address: u.address,
            latitude: u.lat,
            longitude: u.lng,
            hourlyCents: u.rate_cents_per_hour,
            currency: u.currency,
            maxSessionMinutes: u.max_minutes,
            allowsExtension: u.allows_extension,
            rulesNotes: u.rules_notes ?? null,
          },
        }),
      ),
    );
  }
}
