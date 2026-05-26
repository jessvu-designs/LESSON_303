// Thin HTTP client for a (hypothetical) Seattle Pay-by-Phone style API.
//
// Real integrations look exactly like this: a typed wrapper that maps the
// vendor's payload shape into a known internal shape. When SEATTLE_API_BASE_URL
// is unset we serve responses from an inline fixture so the demo runs offline.
import { Logger } from '@nestjs/common';

export interface UpstreamZone {
  zone_id: string;
  code: string;
  display_name: string;
  address: string;
  lat: number;
  lng: number;
  rate_cents_per_hour: number;
  currency: string;
  max_minutes: number | null;
  allows_extension: boolean;
  rules_notes?: string;
}

export interface UpstreamSessionAck {
  upstream_session_id: string;
  status: 'active' | 'ended';
  started_at: string;
  expires_at: string;
}

/** Inline fixture — mirrors what the real upstream would return. */
const FIXTURE_ZONES: UpstreamZone[] = [
  {
    zone_id: 'zone_sea_belltown',
    code: '7401',
    display_name: 'Belltown — 2nd & Bell',
    address: '2200 2nd Ave, Seattle, WA',
    lat: 47.6149,
    lng: -122.3447,
    rate_cents_per_hour: 400,
    currency: 'USD',
    max_minutes: 180,
    allows_extension: true,
    rules_notes: 'No parking 7–9 AM weekdays (peak tow zone).',
  },
  {
    zone_id: 'zone_sea_pioneer',
    code: '7820',
    display_name: 'Pioneer Square — 1st & Yesler',
    address: '100 Yesler Way, Seattle, WA',
    lat: 47.602,
    lng: -122.3344,
    rate_cents_per_hour: 300,
    currency: 'USD',
    max_minutes: 240,
    allows_extension: true,
  },
];

export class SeattleApiClient {
  private readonly logger = new Logger('SeattleApiClient');
  private readonly baseUrl?: string;
  private readonly token?: string;

  constructor() {
    this.baseUrl = process.env.SEATTLE_API_BASE_URL?.trim() || undefined;
    this.token = process.env.SEATTLE_API_TOKEN?.trim() || undefined;
    if (!this.baseUrl) {
      this.logger.log('SEATTLE_API_BASE_URL not set — using inline fixture.');
    }
  }

  get live(): boolean {
    return !!this.baseUrl;
  }

  async listZones(): Promise<UpstreamZone[]> {
    if (!this.live) return FIXTURE_ZONES;
    return this.request<UpstreamZone[]>('GET', '/v1/zones');
  }

  async startSession(input: {
    zoneId: string;
    licensePlate: string;
    minutes: number;
  }): Promise<UpstreamSessionAck> {
    if (!this.live) {
      const now = new Date();
      return {
        upstream_session_id: `sea_${now.getTime()}`,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: new Date(now.getTime() + input.minutes * 60_000).toISOString(),
      };
    }
    return this.request<UpstreamSessionAck>('POST', '/v1/sessions', {
      zone_id: input.zoneId,
      plate: input.licensePlate,
      minutes: input.minutes,
    });
  }

  async extendSession(input: {
    upstreamSessionId: string;
    addedMinutes: number;
  }): Promise<UpstreamSessionAck> {
    if (!this.live) {
      const now = new Date();
      return {
        upstream_session_id: input.upstreamSessionId,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: new Date(now.getTime() + input.addedMinutes * 60_000).toISOString(),
      };
    }
    return this.request<UpstreamSessionAck>(
      'POST',
      `/v1/sessions/${encodeURIComponent(input.upstreamSessionId)}/extend`,
      { minutes: input.addedMinutes },
    );
  }

  async endSession(upstreamSessionId: string): Promise<UpstreamSessionAck> {
    if (!this.live) {
      return {
        upstream_session_id: upstreamSessionId,
        status: 'ended',
        started_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      };
    }
    return this.request<UpstreamSessionAck>(
      'POST',
      `/v1/sessions/${encodeURIComponent(upstreamSessionId)}/end`,
    );
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Seattle upstream ${method} ${path} failed (${res.status}): ${text}`);
    }
    return (await res.json()) as T;
  }
}
