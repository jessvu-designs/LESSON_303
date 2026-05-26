import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpoPushService } from './expo-push.service';

/**
 * Polls active parking sessions and fires push reminders at 15 min / 5 min
 * before expiry, and once at expiry. Each session row carries `reminder15Sent`
 * / `reminder5Sent` / `expiredSent` boolean flags so re-runs are idempotent.
 *
 * Production swap: replace the setInterval poll with BullMQ delayed jobs
 * scheduled at session start. For demo/single-node this is simpler and the
 * query is cheap thanks to the `[status, expiresAt]` index.
 */

const POLL_MS = 30_000;

@Injectable()
export class ReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: ExpoPushService,
  ) {}

  onModuleInit(): void {
    // Skip in test envs that set DISABLE_SCHEDULERS=1.
    if (process.env.DISABLE_SCHEDULERS === '1') return;
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.error(`Reminder tick failed: ${(err as Error).message}`),
      );
    }, POLL_MS);
    // Run once on boot so a freshly-started API catches up on overdue reminders.
    this.tick().catch((err) =>
      this.logger.error(`Initial reminder tick failed: ${(err as Error).message}`),
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Public for tests / manual triggering. */
  async tick(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 16 * 60_000);

    const candidates = await this.prisma.parkingSession.findMany({
      where: {
        status: 'active',
        expiresAt: { lte: windowEnd },
        OR: [
          { reminder15Sent: false },
          { reminder5Sent: false },
          { expiredSent: false },
        ],
      },
      include: { zone: { select: { displayName: true, code: true } } },
    });

    for (const session of candidates) {
      const msUntil = session.expiresAt.getTime() - now.getTime();
      const minutesLeft = Math.round(msUntil / 60_000);
      const zoneLabel = session.zone.displayName || `Zone ${session.zone.code}`;

      if (msUntil <= 0 && !session.expiredSent) {
        await this.fire(session.id, session.userId, 'expiredSent', {
          title: 'Parking session expired',
          body: `Your session at ${zoneLabel} just ended.`,
          data: { sessionId: session.id, kind: 'expired' },
        });
      } else if (msUntil > 0 && msUntil <= 5 * 60_000 && !session.reminder5Sent) {
        await this.fire(session.id, session.userId, 'reminder5Sent', {
          title: '5 minutes left',
          body: `Your parking at ${zoneLabel} expires in ${minutesLeft} min.`,
          data: { sessionId: session.id, kind: 'reminder_5' },
        });
      } else if (msUntil > 0 && msUntil <= 15 * 60_000 && !session.reminder15Sent) {
        await this.fire(session.id, session.userId, 'reminder15Sent', {
          title: '15 minutes left',
          body: `Your parking at ${zoneLabel} expires in ${minutesLeft} min.`,
          data: { sessionId: session.id, kind: 'reminder_15' },
        });
      }
    }
  }

  private async fire(
    sessionId: string,
    userId: string,
    flag: 'reminder15Sent' | 'reminder5Sent' | 'expiredSent',
    payload: { title: string; body: string; data: Record<string, unknown> },
  ): Promise<void> {
    // Mark first so a slow push call can't double-fire on the next tick.
    await this.prisma.parkingSession.update({
      where: { id: sessionId },
      data: { [flag]: true },
    });
    await this.push.sendToUser(userId, payload);
  }
}
