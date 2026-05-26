import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentMethod as DomainPaymentMethod } from '@parking/shared-types';
import type { PaymentMethod as DbPaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

const KNOWN_BRANDS = new Set([
  'visa',
  'mastercard',
  'amex',
  'discover',
  'apple_pay',
  'google_pay',
]);

function toDomain(row: DbPaymentMethod): DomainPaymentMethod {
  const brand = (KNOWN_BRANDS.has(row.brand) ? row.brand : 'other') as DomainPaymentMethod['brand'];
  return {
    id: row.id,
    userId: row.userId,
    brand,
    last4: row.last4 ?? undefined,
    expMonth: row.expMonth ?? undefined,
    expYear: row.expYear ?? undefined,
  };
}

export interface SetupIntentResponse {
  /** True when real Stripe is configured. */
  stripe: boolean;
  /** Present when stripe=true; pass to PaymentSheet on the client. */
  clientSecret?: string;
  ephemeralKeySecret?: string;
  customerId?: string;
  publishableKeyHint?: string; // not the key itself — UI gets it from env
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async listForUser(userId: string): Promise<DomainPaymentMethod[]> {
    const rows = await this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDomain);
  }

  /** Ensures the payment method exists and belongs to the user. */
  async assertOwned(userId: string, paymentMethodId: string): Promise<void> {
    const pm = await this.prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
    if (!pm) throw new NotFoundException('Payment method not found');
    if (pm.userId !== userId) throw new ForbiddenException('Payment method does not belong to user');
  }

  /** Get-or-create Stripe Customer for the user. Stores id on User row. */
  private async ensureStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.client.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  /**
   * Prepares Stripe PaymentSheet inputs (SetupIntent + ephemeral key).
   * Falls back to a stub response when Stripe is not configured.
   */
  async createSetupIntent(userId: string): Promise<SetupIntentResponse> {
    if (!this.stripe.enabled) return { stripe: false };

    const customerId = await this.ensureStripeCustomer(userId);
    const [setupIntent, ephemeralKey] = await Promise.all([
      this.stripe.client.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      }),
      this.stripe.client.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: this.stripe.config.apiVersion },
      ),
    ]);

    return {
      stripe: true,
      clientSecret: setupIntent.client_secret ?? undefined,
      ephemeralKeySecret: ephemeralKey.secret ?? undefined,
      customerId,
    };
  }

  /**
   * Pulls the user's saved payment methods from Stripe and reconciles them into
   * the DB (idempotent). Call this after PaymentSheet finishes.
   */
  async syncFromStripe(userId: string): Promise<DomainPaymentMethod[]> {
    if (!this.stripe.enabled) return this.listForUser(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return this.listForUser(userId);

    const result = await this.stripe.client.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
      limit: 50,
    });

    const seen = new Set<string>();
    for (const pm of result.data) {
      seen.add(pm.id);
      const card = pm.card;
      await this.prisma.paymentMethod.upsert({
        where: { stripePaymentMethodId: pm.id },
        create: {
          userId,
          stripePaymentMethodId: pm.id,
          brand: card?.brand ?? 'other',
          last4: card?.last4 ?? null,
          expMonth: card?.exp_month ?? null,
          expYear: card?.exp_year ?? null,
        },
        update: {
          brand: card?.brand ?? 'other',
          last4: card?.last4 ?? null,
          expMonth: card?.exp_month ?? null,
          expYear: card?.exp_year ?? null,
        },
      });
    }

    // Drop locally-cached cards that no longer exist in Stripe.
    await this.prisma.paymentMethod.deleteMany({
      where: {
        userId,
        stripePaymentMethodId: { not: null },
        ...(seen.size > 0 ? { stripePaymentMethodId: { notIn: Array.from(seen) } } : {}),
      },
    });

    return this.listForUser(userId);
  }

  /** Dev-only: add a fake card directly to the DB when Stripe is not configured. */
  async addStubCard(userId: string): Promise<DomainPaymentMethod> {
    if (this.stripe.enabled) {
      throw new BadRequestException('Stripe is configured — use PaymentSheet to add real cards.');
    }
    const row = await this.prisma.paymentMethod.create({
      data: {
        userId,
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
        isDefault: true,
      },
    });
    return toDomain(row);
  }

  async remove(userId: string, paymentMethodId: string): Promise<void> {
    const pm = await this.prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
    if (!pm) throw new NotFoundException('Payment method not found');
    if (pm.userId !== userId) throw new ForbiddenException();

    if (this.stripe.enabled && pm.stripePaymentMethodId) {
      try {
        await this.stripe.client.paymentMethods.detach(pm.stripePaymentMethodId);
      } catch {
        // Already detached or missing in Stripe — fall through to local delete.
      }
    }
    await this.prisma.paymentMethod.delete({ where: { id: paymentMethodId } });
  }
}
