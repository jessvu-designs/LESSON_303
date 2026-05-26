import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Thin wrapper around the Expo Push API.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * No SDK dep — just `fetch`. The Expo service accepts batches of up to 100
 * messages per request; we chunk above that. If a token comes back as
 * `DeviceNotRegistered`, we drop it so we stop pushing to dead installs.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Send a notification to every device registered for `userId`. */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) {
      this.logger.debug(`No push tokens for user ${userId}; skipping`);
      return;
    }
    await this.sendToTokens(
      tokens.map((t) => t.token),
      payload,
    );
  }

  async sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      await this.dispatchChunk(chunk, payload);
    }
  }

  private async dispatchChunk(tokens: string[], payload: PushPayload): Promise<void> {
    const messages = tokens.map((to) => ({
      to,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    let res: Response;
    try {
      res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      this.logger.error(`Expo push request failed: ${(err as Error).message}`);
      return;
    }

    if (!res.ok) {
      this.logger.error(`Expo push HTTP ${res.status}: ${await res.text()}`);
      return;
    }

    const body = (await res.json()) as { data?: ExpoTicket[] };
    const tickets = body.data ?? [];
    const deadTokens: string[] = [];
    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(tokens[idx]);
      } else if (ticket.status === 'error') {
        this.logger.warn(`Expo push error for token ${tokens[idx]}: ${ticket.message}`);
      }
    });

    if (deadTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: deadTokens } } });
      this.logger.log(`Pruned ${deadTokens.length} dead push token(s)`);
    }
  }
}
