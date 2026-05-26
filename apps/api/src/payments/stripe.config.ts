// Stripe runtime configuration.
// When STRIPE_SECRET_KEY is unset, the app runs in a "stub" payments mode that
// records fake cards in the DB so the demo works end-to-end without keys.

export interface StripeConfig {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
  apiVersion: string;
}

export function loadStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  return {
    enabled: !!secretKey,
    secretKey: secretKey || undefined,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
    apiVersion: process.env.STRIPE_API_VERSION?.trim() || '2024-06-20',
  };
}
