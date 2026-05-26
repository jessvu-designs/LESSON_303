import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type Stripe from 'stripe';
import { loadStripeConfig, type StripeConfig } from './stripe.config';

/**
 * Thin wrapper around the Stripe SDK. Exposes `client` for real calls and
 * `enabled` so callers can fall back to a stub flow when no key is configured.
 */
@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  readonly config: StripeConfig = loadStripeConfig();
  private _client?: Stripe;

  async onModuleInit() {
    if (!this.config.enabled) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — running in stub payments mode (fake cards in DB).',
      );
      return;
    }
    // Lazy-load the SDK so dev installs without it still boot.
    const StripeCtor = (await import('stripe')).default;
    this._client = new StripeCtor(this.config.secretKey as string, {
      apiVersion: this.config.apiVersion as Stripe.LatestApiVersion,
    });
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  get client(): Stripe {
    if (!this._client) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }
    return this._client;
  }
}
