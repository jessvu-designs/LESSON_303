# PARKER — Monorepo

A mobile-first universal street parking app, built against [BRIEF.md](BRIEF.md). One app for parking anywhere: a universal layer that translates fragmented city/vendor systems into a single, low-stress mobile experience.

> **Status legend:** ✅ implemented · 🟡 partial (demo / stub) · ⚪ planned

## Requirements Coverage

### Primary Goals ([brief](BRIEF.md#primary-goals))

| Goal                            | Status | How it's met                                                                                                                                                                |
| ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start a session in <10s         | ✅     | GPS sort + tap zone → Confirm → Start; cached quote keeps Confirm instant. See [hooks/parkingHooks.ts](apps/mobile/src/hooks/parkingHooks.ts).                              |
| Reduce anxiety (where/when/$)   | ✅     | [session.tsx](apps/mobile/app/session.tsx) shows large countdown, expiration in local time, zone, plate, paid amount, and color-coded urgency.                              |
| Effortless extension (1–2 taps) | ✅     | [extend.tsx](apps/mobile/app/extend.tsx) offers +15/+30/+60 buttons with live cost preview and a "not allowed" fallback when the max is hit.                                |
| Effortless end-of-session       | ✅     | [session.tsx](apps/mobile/app/session.tsx) in-frame confirm modal → receipt summary; cache is cleared optimistically so the home screen drops the active card immediately. |
| Support any city system         | ✅     | Connector pattern at [parking-connector.interface.ts](apps/api/src/providers/parking-connector.interface.ts) with Mock + Seattle adapters; aggregated on `/providers/zones`. |
| Build trust through clarity     | ✅     | Plain-language copy, explicit confirmation states, WCAG contrast checks via `pnpm --dir apps/mobile contrast:check`.                                                        |

### MVP Scope ([brief](BRIEF.md#mvp-scope))

**In scope — all implemented:**

| #   | Requirement                                                  | Status | Where                                                                                                       |
| --- | ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | Detect or confirm parking location                           | ✅     | [services/location.ts](apps/mobile/src/services/location.ts), draggable pin on [confirm.tsx](apps/mobile/app/confirm.tsx) |
| 2   | Identify or enter parking zone                               | ✅     | Closest-zone sort on Home + closer-zone suggestion when dragging the pin on Confirm                         |
| 3   | Display rates and estimated total cost                       | ✅     | `GET /sessions/quote` previewed live on [confirm.tsx](apps/mobile/app/confirm.tsx) and [extend.tsx](apps/mobile/app/extend.tsx) |
| 4   | Start parking session                                        | ✅     | `POST /sessions` via [parking-sessions.controller.ts](apps/api/src/parking-sessions/parking-sessions.controller.ts) |
| 5   | Show active session with countdown                           | ✅     | [session.tsx](apps/mobile/app/session.tsx) — large timer, expiration time, prominent Extend CTA              |
| 6   | Extend parking session                                       | ✅     | `POST /sessions/extend` + max-time enforcement at the connector layer                                       |
| 6b  | End parking session                                          | ✅     | `POST /sessions/:id/end` with in-app confirm modal + receipt summary at [session.tsx](apps/mobile/app/session.tsx) |
| 7   | Send expiration reminders                                    | ✅     | 15 / 5 / 0 min — local ([services/notifications.ts](apps/mobile/src/services/notifications.ts)) + server push ([reminder.scheduler.ts](apps/api/src/notifications/reminder.scheduler.ts)) |
| 8   | Save payment methods                                         | 🟡     | Stripe SetupIntents + Apple/Google Pay via PaymentSheet; falls back to a stub wallet when keys are absent   |
| 9   | Store license plate(s)                                       | ✅     | [vehicles.tsx](apps/mobile/app/vehicles.tsx) — multi-plate, default promotion, normalization                |
| 10  | View receipts / history                                      | ✅     | [history.tsx](apps/mobile/app/history.tsx) with totals                                                      |

**Explicitly out of scope (per brief):** image-based sign interpretation, predictive availability, enforcement forecasting, municipal back-office tooling, ticket dispute flow, space reservation.

### Core Features ([brief](BRIEF.md#core-features))

| Feature                         | Status | Notes                                                                                                                                              |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Location Detection           | ✅     | GPS + manual pin drag fallback; reverse-geocoded address resolved via [expo-location's platform geocoder](apps/mobile/src/services/location.ts)    |
| 2. Zone Identification          | ✅     | Geofence-like distance sort + closer-zone suggestion (>25 m) while dragging the pin                                                                |
| 3. Pricing Transparency         | ✅     | Hourly rate + live total preview; max-time guard surfaced before payment                                                                            |
| 4. Active Parking Session       | ✅     | Countdown, expiration timestamp, location, zone, plate, total paid, prominent Extend CTA                                                            |
| 5. Session Extension            | ✅     | One-tap +15/+30/+60, cost preview, max-time fallback message                                                                                        |
| 6. Notifications and Alerts     | ✅     | 15 / 5 / 0 min via dual local + server-push path; per-session idempotency flags so extensions reset reminders                                       |
| 7. Payments                     | 🟡     | Stripe SetupIntent + Apple/Google Pay via PaymentSheet; stub mode for offline demo; **no charge yet** — real connectors will execute the transaction |
| 8. History and Receipts         | ✅     | Past sessions with totals; search/filter and export remain ⚪                                                                                       |

### Functional Requirements ([brief](BRIEF.md#functional-requirements))

| Area                       | Status | Notes                                                                                                                                                |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication             | ✅     | Email + password JWT; token stored in [expo-secure-store](apps/mobile/src/services/tokenStorage.ts); `AuthGate` redirects on 401                      |
| User profile               | ✅     | Name, default payment method, saved vehicles, notification preferences (push token registration)                                                      |
| Session lifecycle          | ✅     | start → active → extend → end / expire, with status reconciliation on every fetch                                                                     |
| Error handling             | ✅     | Invalid zone, max-time exceeded, failed payment, GPS denied, network errors — surfaced with plain-language toasts/alerts                              |
| Offline / low connectivity | 🟡     | Active session cached by TanStack Query; local notifications fire offline. Full offline session-create queue is ⚪.                                   |

### Non-Functional Requirements ([brief](BRIEF.md#non-functional-requirements))

| Requirement   | Status | How it's met                                                                                                                              |
| ------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Performance   | ✅     | TanStack Query caching; lightweight Expo Router stack; quotes computed server-side and cached per zone/minutes                            |
| Accessibility | ✅     | WCAG-aligned color tokens with an automated contrast check (`pnpm --dir apps/mobile contrast:check`), large tap targets, semantic labels |
| Security      | 🟡     | JWT auth, bcrypt password hashing, Stripe handles card data, no PAN ever touches our DB. Audit logging + RBAC remain ⚪.                  |
| Reliability   | 🟡     | Idempotent reminder fan-out, graceful connector failure handling. Retry/backoff for connector calls is ⚪.                                |
| Scalability   | 🟡     | Connector-per-vendor architecture is in place. Multi-node scheduler (BullMQ) is ⚪ — see Next Sprints.                                    |
| Compliance    | ⚪     | Privacy/Terms copy + geolocation consent prompts wired; legal pages and audit logs are out of scope for the demo.                          |

### Architecture aligned with the brief

The backend uses the **adapter / connector model** the brief recommends. Each city/vendor implements [`ParkingConnector`](apps/api/src/providers/parking-connector.interface.ts) and registers a unique `providerId`; [`ProvidersService`](apps/api/src/providers/providers.service.ts) aggregates them and `ParkingSessionsService` routes by `zone.providerId` (new sessions) or `session.providerId` (existing). A normalized domain model (User, Vehicle, ParkingZone, ParkingSession, Receipt) lives in [packages/shared-types](packages/shared-types/src/index.ts) so the mobile app never sees vendor-specific shapes.

## Structure

```
apps/
  mobile/   # Expo + React Native + TypeScript + Expo Router + React Query
  api/      # NestJS + TypeScript (mock connector + provider abstraction)
packages/
  shared-types/   # Domain models used by both mobile + api
```

## Prereqs
- Node 20+
- pnpm 9+ (`npm i -g pnpm`)
- Expo Go on your phone (or an iOS/Android simulator) for the mobile app

## Install

```bash
pnpm install
pnpm --filter @parking/api prisma:generate   # generates the Prisma client
pnpm --filter @parking/api prisma:migrate    # creates the SQLite DB + tables
pnpm --filter @parking/api db:seed           # seeds demo user, zones, history
```

After pulling new schema changes, re-run `prisma:migrate` (Prisma will name the migration interactively) to apply them.

## Run

In two terminals:

```bash
pnpm api      # NestJS on http://localhost:3000
pnpm mobile   # Expo dev server — scan QR with Expo Go, or press i / a
```

### Pointing the app at the API

| Where you run the app | Default `API_BASE_URL`                |
| --------------------- | ------------------------------------- |
| iOS simulator         | `http://localhost:3000`               |
| Android emulator      | `http://10.0.2.2:3000`                |
| Physical device       | Set `EXPO_PUBLIC_API_URL` explicitly  |

For a physical device, find your dev machine's LAN IP and start Expo with:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 pnpm mobile
```

## Mobile screens

- **Login / Sign up** — email + password against `/auth/*`
- **Home** — location context first, nearby zone map/list, active parking card, account drawer
- **Confirm Parking Zone** — duration choice, transparent live pricing, max-time guard
- **Active Parking** — large countdown, location, plate, paid amount, extend/end. Ending opens an in-frame confirmation modal (with a live preview of forfeited paid time) and, on success, shows a receipt summary card.
- **Extend Parking** — 1-tap +15/+30/+60 with cost preview and "not allowed" fallback
- **History** — past sessions with totals

State and data fetching live in [apps/mobile/src/hooks/parkingHooks.ts](apps/mobile/src/hooks/parkingHooks.ts), backed by [apps/mobile/src/services/parkingApi.ts](apps/mobile/src/services/parkingApi.ts) and a tiny [apiClient](apps/mobile/src/services/apiClient.ts).

## Auth

JWT-based, with the token stored on-device in [expo-secure-store](apps/mobile/src/services/tokenStorage.ts) and attached to every request by the API client. The [AuthProvider](apps/mobile/src/auth/AuthProvider.tsx) hydrates the session on launch and clears it on a `401`. An [AuthGate](apps/mobile/app/_layout.tsx) redirects unauthenticated users to `/login`.

A demo account is seeded server-side:

- email: `demo@example.com`
- password: `demo1234`

Server config (env): `JWT_SECRET`, `JWT_EXPIRES_IN` (default `30d`). Change `JWT_SECRET` before deploying.

## Notifications

Reminders are delivered through **two complementary paths**, both at 15 min / 5 min / 0 min relative to expiry:

**Local (device that started the session)** — [notifications.ts](apps/mobile/src/services/notifications.ts) schedules `expo-notifications` time-interval triggers on session start/extend. Cancelled on session end and re-scheduled on extension. Fires offline; doesn't fire if the app is force-quit (iOS) or the device is off.

**Server push (every device the user is signed in on)** — the mobile app registers an Expo push token with the API on login ([AuthProvider.tsx](apps/mobile/src/auth/AuthProvider.tsx) calls `registerPushTokenWithServer`). The token is stored in the `DeviceToken` table. A polling [ReminderScheduler](apps/api/src/notifications/reminder.scheduler.ts) ticks every 30 s, finds `active` sessions whose `expiresAt` is inside the 16-minute window, and fans out via [ExpoPushService](apps/api/src/notifications/expo-push.service.ts) (the public `https://exp.host` Expo Push API — no FCM/APNs credentials needed for the demo). Per-session `reminder15Sent` / `reminder5Sent` / `expiredSent` boolean flags make ticks idempotent; they're reset on extension so a freshly-extended session gets a fresh 15-min ping. Dead tokens (`DeviceNotRegistered`) are pruned automatically.

Endpoints:

- `POST /devices/register` `{ token, platform }`
- `DELETE /devices/:token`

Permission is requested on the first successful start. Notifications are not available on web. To swap the public Expo Push endpoint for direct FCM/APNs later, replace [ExpoPushService](apps/api/src/notifications/expo-push.service.ts); the scheduler stays the same. For multi-node deploys, replace the in-process `setInterval` with BullMQ delayed jobs scheduled at session start.

## Location & maps

[expo-location](apps/mobile/src/services/location.ts) requests foreground location permission on demand and feeds two things:

1. **Closest-zone sort** — the Home screen reorders zones by Haversine distance from the device and shows "… m / km away" labels.
2. **Zone map preview** — the Confirm screen renders a [react-native-maps](apps/mobile/src/components/ZoneMap.tsx) view with a pin on the zone and a second pin for the user so people can visually verify they're parking in the right place before paying.

Zone coordinates live in [the Prisma schema](apps/api/prisma/schema.prisma) (`latitude` / `longitude`) and are surfaced as `zone.geo: { lat, lng }` via the [shared types](packages/shared-types/src/index.ts). On web, the map components render an OSM-tile-backed fallback with zone/user overlays when native maps are unavailable.

### Confirming the exact spot

The Confirm screen renders a **draggable blue pin** on top of the zone preview. The pin starts at the user's GPS fix (or zone center as a fallback) and the driver can drag it to fine-tune the parking spot. Two things update live as the pin moves:

1. **Reverse-geocoded address** — resolved via [expo-location's platform geocoder](apps/mobile/src/services/location.ts) (no API key required), bucketed at ~11 m precision so dragging doesn't spam the geocoder.
2. **Closer-zone suggestion** — if the dragged pin is meaningfully closer (>25 m) to a different known zone, the screen surfaces a one-tap "Switch to {Zone}" card so the driver can't accidentally pay for the wrong zone when GPS lands between two.

## API endpoints

All routes below require `Authorization: Bearer <token>` unless noted.

- `POST /auth/login`, `POST /auth/register`
- `GET  /users/me`, `/users/me/vehicles`, `/users/me/payment-methods`
- `GET  /providers`, `/providers/zones`, `/providers/zones/:id`
- `GET  /sessions` — list current user's sessions
- `GET  /sessions/active` — current active session or `null`
- `GET  /sessions/quote?zoneId=...&minutes=60`
- `POST /sessions`, `POST /sessions/extend`, `POST /sessions/:id/end`, `GET /sessions/:id`
- `POST /payments/setup-intent` — returns PaymentSheet inputs (or `{ stripe: false }` in stub mode)
- `POST /payments/sync` — reconcile saved cards from Stripe after PaymentSheet succeeds
- `POST /payments/payment-methods/stub` — dev-only, only available when Stripe is unconfigured
- `DELETE /payments/payment-methods/:id`

## Vehicles

Users can manage multiple license plates from the [Vehicles screen](apps/mobile/app/vehicles.tsx). Exactly one is marked `isDefault`; deleting the default automatically promotes the next vehicle on file. The Confirm screen renders a radio-style picker so a household with two cars can switch per session, and falls back to the default if the user doesn't pick. Plates are normalized (uppercased, whitespace stripped) on write. Deletes are blocked while a session is active for that vehicle.

Endpoints (all JWT-guarded):

- `GET /users/me/vehicles`
- `POST /users/me/vehicles` `{ licensePlate, state?, nickname?, isDefault? }`
- `PATCH /users/me/vehicles/:id` (partial; pass `isDefault: true` to promote)
- `DELETE /users/me/vehicles/:id`

## Payments

Payments use [Stripe](https://stripe.com) with **SetupIntents** (off-session card saving). The brief separates _user wallet authorization_ from _provider transaction execution_, so the API validates that a saved payment method belongs to the user on `POST /sessions` but does not charge the card — real connectors will do that.

**Stub mode (default)** — with no Stripe keys, the API stores fake cards locally and the mobile wallet exposes an "Add demo card (Visa ···· 4242)" button so the full flow works offline.

**Real Stripe mode** — set both keys and restart:

```bash
# apps/api/.env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # only needed once you wire webhooks

# apps/mobile (export before `pnpm mobile`)
export EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
export EXPO_PUBLIC_STRIPE_MERCHANT_ID="merchant.com.example.parking"
```

The mobile wallet then uses Stripe's `PaymentSheet`, which adds **Apple Pay** and **Google Pay** automatically. After PaymentSheet succeeds, the app calls `POST /payments/sync` to reconcile the saved cards into the API's database. Card data never touches our server — only the Stripe `payment_method` id is stored.

> `@stripe/stripe-react-native` is a native module. Use a [dev client](https://docs.expo.dev/develop/development-builds/introduction/) (not plain Expo Go) when running with real Stripe keys.

## Connector pattern

Every city/vendor implements [`ParkingConnector`](apps/api/src/providers/parking-connector.interface.ts). [`ProvidersService`](apps/api/src/providers/providers.service.ts) registers them and `ParkingSessionsService` routes requests to the right connector by looking up `zone.providerId` (for new sessions) or `session.providerId` (for extend/end/get). Today two connectors are registered:

- **[`MockConnector`](apps/api/src/providers/connectors/mock.connector.ts)** — `prov_mock`, Prisma-backed, owns the seeded demo zones.
- **[`SeattleConnector`](apps/api/src/providers/connectors/seattle.connector.ts)** — `prov_seattle`, talks to a (stubbed) Seattle pay-by-phone API via [`SeattleApiClient`](apps/api/src/providers/upstream/seattle-api.client.ts). When `SEATTLE_API_BASE_URL` is unset it serves an inline fixture so the demo works offline; set the env var (and optional `SEATTLE_API_TOKEN`) to point at a real upstream. Zones fetched from upstream are cached in the local DB so `ParkingSession` foreign keys stay valid.

The `GET /providers/zones` endpoint **aggregates across every registered connector**, so the mobile Home screen sees Mock + Seattle zones interleaved (and sorted by distance from the device when location is granted).

Adding a new city/vendor:

1. Implement `ParkingConnector` in `apps/api/src/providers/connectors/yourcity.connector.ts`.
2. Add it to the `providers` array in [providers.module.ts](apps/api/src/providers/providers.module.ts) and register it in [providers.service.ts](apps/api/src/providers/providers.service.ts).
3. Use a unique `providerId` and have the connector own its own zones (cache upstream into Prisma, or seed them).

## Persistence

[Prisma](apps/api/prisma/schema.prisma) backs users, vehicles, zones, sessions, and extensions. The datasource defaults to **SQLite** (`apps/api/prisma/dev.db`) for zero-setup local dev. To switch to Postgres:

1. Set `DATABASE_URL` to your Postgres connection string in `apps/api/.env`.
2. Change `provider = "sqlite"` to `provider = "postgresql"` in [schema.prisma](apps/api/prisma/schema.prisma).
3. Re-run `pnpm --filter @parking/api prisma:migrate`.

Useful commands (from repo root):

```bash
pnpm --filter @parking/api prisma:generate
pnpm --filter @parking/api prisma:migrate
pnpm --filter @parking/api db:seed
pnpm --filter @parking/api db:reset    # wipes DB + reseeds
```

## Shared types

Domain models (User, Vehicle, ParkingZone, ParkingSession, Receipt, …) live in [packages/shared-types/src/index.ts](packages/shared-types/src/index.ts) and are imported as `@parking/shared-types` from both apps.

## UI system and accessibility

The mobile UI follows an urban, signage-inspired visual system intended for outdoor readability and fast scanning under time pressure.

- Palette: asphalt/concrete base with curb yellow, meter green, alert red/orange, and system blue state colors
- Typography tokens: `display`, `h1`-`h3`, `body`/`bodyMuted`, plus two kickers — `label` (small curb-yellow tag) and `sectionHeading` (concrete-white signage-style kicker for prominent card titles)
- Information hierarchy: map-first context, practical panel cards, strong CTA emphasis
- State semantics: active/expiring/expired states use explicit text plus color cues
- Contrast safety: token-level contrast checks are automated

### WCAG 2.1 Level AA conformance

The app is designed and tested against **WCAG 2.1 Level AA**. Conformance is verified across both automated checks and component-level conventions.

| Success Criterion             | How it's met                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1.3.1 Info and Relationships  | Every `TextInput` has an `accessibilityLabel`; status uses text + color, never color alone                                              |
| 1.4.3 Contrast (Minimum)      | All text/background pairs ≥4.5:1; large urgent timer ≥3:1 — enforced by [check-contrast.cjs](apps/mobile/scripts/check-contrast.cjs)    |
| 1.4.4 Resize Text             | All text uses RN's default `allowFontScaling` so iOS Dynamic Type / Android font scale apply up to 200%                                 |
| 1.4.11 Non-text Contrast      | Input borders, button surfaces, and focus indicators all hit ≥3:1 against adjacent background (covered by the audit)                   |
| 2.4.4 Link Purpose            | Buttons/links use descriptive labels ("Sign in to PARKER", "Extend +15 min") rather than generic verbs                                  |
| 2.4.7 Focus Visible           | Pressables use platform-default ripple/press states; Pressable `({ pressed })` styles reduce opacity for visible feedback              |
| 2.5.5 / 2.5.8 Target Size     | Primary buttons ≥54×54, inputs ≥48 tall, icon-only Pressables use `hitSlop` to extend to ≥44                                            |
| 3.3.2 Labels or Instructions  | Every form field has a visible label *and* a programmatic `accessibilityLabel`                                                          |
| 4.1.2 Name, Role, Value       | Interactive elements declare `accessibilityRole` (`button`, `tab`, `tablist`) and `accessibilityState` (`selected`, `disabled`)         |

Run the contrast audit:

```bash
pnpm --dir apps/mobile contrast:check
```

The script validates 12 text and non-text contrast pairings and fails CI if any drops below its WCAG 2.1 AA threshold.

## Next sprints (from the brief)

1. Replace the Seattle stub with a real upstream (signed requests, retries, idempotency keys, webhook for out-of-band status changes)
2. Stripe webhooks (`payment_method.attached`, `payment_method.detached`) so other devices sync without a manual call
3. Swap the in-process reminder scheduler for BullMQ delayed jobs so multi-node deploys don't double-fire
4. Geofence-based provider routing on the device (auto-pick the right city/vendor as you cross zone boundaries)
