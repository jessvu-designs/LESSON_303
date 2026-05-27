# Universal Street Parking App — `brief.md`

## Project Summary
Design and build a **mobile-first street parking app** that works across cities, regardless of the parking vendor or local payment system in use. The product should make parking feel **simple, trustworthy, and low-stress** by helping people quickly understand:

- **Where they are parked**
- **What zone/rules apply**
- **How much they are paying**
- **How much time is left**
- **How to extend time easily**

The experience should reduce confusion, minimize the risk of tickets, and create a consistent user experience even when city parking infrastructure is fragmented.

---

## Product Vision
**One app for parking anywhere.**

A universal layer that simplifies street parking by translating fragmented city systems into one clear, user-friendly mobile experience.

---

## Primary Goals

1. **Make parking setup fast**  
   A user should be able to start a session in **under 10 seconds** when location/zone detection works.

2. **Reduce user anxiety**  
   The app should always make it obvious:
   - where the user is parked
   - how long parking is active
   - when the session expires
   - what the current cost is

3. **Make extension effortless**  
   Extending parking should take **1–2 taps** and clearly show added time and updated price.

4. **Support any city system**  
   The app should be designed to support multiple integration patterns:
   - direct vendor API integrations
   - city-specific adapters
   - fallback/manual workflows where integrations do not exist

5. **Build trust through clarity**  
   Use clear language, prominent status messaging, and strong error prevention patterns.

---

## Target Users

### Primary
- Drivers parking on city streets in unfamiliar or inconsistent parking systems
- People who frequently travel between cities
- Residents who want one simpler interface instead of multiple city-specific apps

### Secondary
- Business travelers needing receipts and expense tracking
- Tourists and occasional drivers
- People with accessibility needs who benefit from a cleaner, more consistent experience

---

## Core User Problems

Users commonly struggle with:
- Not knowing whether they are parked in the correct zone
- Confusing or inconsistent parking signage
- Multiple city apps with different experiences
- Difficulty understanding rates and total cost
- Forgetting to extend parking
- Not knowing whether an area allows extension
- Anxiety about getting a parking ticket

---

## Design Principles

- **Clarity over complexity**
- **Location-first** interaction
- **Fast, low-friction actions**
- **Plain-language rules and pricing**
- **Accessibility by default**
- **Error prevention over recovery**
- **Consistent UX across cities**

---

## MVP Scope

### In Scope
1. Detect or confirm parking location
2. Identify or enter parking zone
3. Display rates and estimated total cost
4. Start parking session
5. Show active session with countdown timer
6. Extend parking session
7. Send expiration reminders
8. Save payment methods
9. Store license plate(s)
10. View receipts/history

### Out of Scope for MVP
- Image-based sign interpretation using AI/vision
- Predictive parking availability
- Enforcement forecasting
- Complex municipal back-office tooling
- In-app dispute resolution for tickets
- Dynamic reservation of spaces

---

## Key User Stories

### Parking Setup
- As a driver, I want the app to detect where I am parked so I do not have to manually find the correct zone.
- As a driver, I want to confirm my location and zone before paying so I know I am parking legally.
- As a driver, I want to see the hourly rate and my total before I start parking so I understand the cost.

### Active Session
- As a driver, I want to see a large countdown timer so I immediately know how much time remains.
- As a driver, I want the app to show my parking location and license plate so I can verify my session details.
- As a driver, I want alerts before expiration so I can avoid a ticket.

### Extend Parking
- As a driver, I want to extend with one tap so I can keep my session active quickly.
- As a driver, I want the app to tell me if extension is not allowed so I do not waste time trying.
- As a driver, I want to see the added cost before confirming an extension.

### Account / Admin
- As a driver, I want to save my payment details securely for faster checkout.
- As a driver, I want receipts for reimbursement or expense reporting.
- As a driver, I want to manage multiple vehicles or license plates.

---

## Core Features

### 1. Location Detection
- GPS-based location detection
- Optional map pin confirmation
- Manual fallback if GPS is weak
- Street/address display

### 2. Zone Identification
- Zone auto-detection based on geofence, map data, or integration
- Manual zone entry fallback
- Clear confirmation UI before payment

### 3. Pricing Transparency
- Hourly/flat rate displayed clearly
- Real-time total cost preview
- Taxes/fees displayed before confirmation where applicable
- Maximum time/rate constraints clearly explained

### 4. Active Parking Session
- Large countdown timer
- Expiration time displayed in local time
- Session summary:
  - location
  - zone
  - license plate
  - total paid
- Prominent **Extend Time** CTA

### 5. Session Extension
- One-tap extend options (e.g., +15 min, +30 min, +1 hr)
- Real-time cost update before confirmation
- Enforcement of city-specific extension constraints
- Helpful fallback state when max time is reached

### 6. Notifications and Alerts
- Push notifications
- Time-left reminders (e.g., 15 min, 5 min)
- Extension reminder
- Session ended notification

### 7. Payments
- Secure card wallet
- Apple Pay / Google Pay support
- Transaction confirmations and receipts
- Retry patterns for failed payment

### 8. History and Receipts
- Past parking sessions
- Receipt details
- Search/filter by date and city
- Export/share receipt

---

## City-Agnostic System Strategy

Because cities use different vendors and rules, the architecture should support multiple connection methods.

### Integration Modes
1. **Direct API Integration**  
   Connect to city/vendor parking systems where APIs are available.

2. **Adapter Layer / Connector Model**  
   Create a standard internal parking model and map each city/vendor to it.

3. **Fallback Manual Mode**  
   If direct integrations are not available, allow users to:
   - confirm zone manually
   - view payment instructions
   - potentially deep-link to existing vendor workflows

### Recommended Internal Standard Model
Create a normalized backend domain model for:
- city
- provider
- zone
- rate
- rule set
- session
- extension limits
- payment state
- receipt

This abstraction is critical if the product is meant to scale across multiple city systems.

---

## Functional Requirements

### Authentication
- Email/password or passwordless login
- Social sign-in optional
- Guest flow optional for early MVP exploration

### User Profile
- Name
- Default payment method
- Saved vehicles / plates
- Notification preferences
- Receipt preferences

### Parking Session Lifecycle
- Start session
- Confirm session started
- View active session
- Extend session
- End session if supported
- Session expiration / completion state

### Error Handling
- Invalid zone
- Unsupported zone/city
- Failed payment
- GPS unavailable
- Session start failure
- Extension denied
- Network interruption

### Offline/Low Connectivity Considerations
- Cache recent session details locally
- Preserve user state during payment retries
- Provide clear fallback instructions when connection is weak

---

## Non-Functional Requirements

### Performance
- Initial useful screen should load quickly on mobile
- Common actions (start parking, extend parking) should feel near-instant
- Active session data should refresh reliably without draining battery

### Accessibility
The app must be accessible by default.

Requirements:
- WCAG-aligned color contrast
- Large tap targets
- Screen-reader-friendly labels
- Clear semantic structure
- Support dynamic type / larger text
- Avoid color-only status indicators
- Clear focus states for keyboard accessibility where relevant (especially web admin/support tooling)
- Simple, plain-language messaging

### Security
- PCI-conscious payment handling through trusted providers
- Secure token-based authentication
- Encrypt sensitive data in transit and at rest
- Role-based access for any admin tools
- Audit logging for payment/session operations

### Reliability
- Graceful handling of third-party API failures
- Retry and idempotency for payment/session creation
- Session state reconciliation if vendor response is delayed

### Scalability
- Connector-based backend architecture for adding cities/vendors over time
- Ability to support many concurrent sessions and notifications

### Compliance / Legal
- Privacy policy
- Terms of use
- Payment compliance through payment processor
- Geolocation consent
- Notification permission flows

---

## UX Requirements

### UX Principles
- Keep the most important information visible at all times
- Minimize the number of decisions per screen
- Use plain language instead of parking jargon
- Build confidence through confirmation states

### Primary Screens
1. **Onboarding / permissions**
2. **Home / detect parking location**
3. **Confirm zone + pricing**
4. **Start session confirmation**
5. **Active session**
6. **Extend time**
7. **Receipts/history**
8. **Manage vehicles/payment methods**

### Most Important Screen: Active Session
Must clearly show:
- time remaining
- expiration timestamp
- current location
- zone
- license plate
- amount paid
- extend button

### UX Notes
- Use a strong bottom-sheet pattern for quick actions
- Make “Extend Time” the most prominent action during an active session
- Use reassuring success messaging, such as “You’re parked”
- Help users correct mistakes quickly (wrong zone, wrong plate, unsupported extension)

---

## Suggested Information Architecture

- Home
- Active Session
- History
- Wallet
- Vehicles
- Account / Settings
- Help / Support

---

## Recommended Tech Stack

The best starting point is a **cross-platform mobile app with a backend API and connector architecture**.

## Frontend (Mobile App)
### Recommended: **React Native with Expo + TypeScript**
Why:
- Fast cross-platform development for iOS and Android
- Strong developer experience in VS Code
- Easier prototyping and iteration with Claude
- Large ecosystem for maps, notifications, authentication, and payments
- Good balance of speed, maintainability, and production readiness

Suggested frontend stack:
- **React Native**
- **Expo**
- **TypeScript**
- **Expo Router** for navigation
- **React Query / TanStack Query** for server state
- **Zustand** for lightweight app state if needed
- **React Hook Form + Zod** for forms/validation
- **NativeWind** or **Tamagui** for styling/UI consistency
- **Mapbox** or **Google Maps SDK** for maps/location interfaces

### Why this stack is a good fit for Claude Opus in VS Code
- Clear file structure
- Great for component-by-component generation
- Strong TypeScript support
- Easier to scaffold screens, hooks, state stores, and service layers with AI assistance

---

## Backend
### Recommended: **Node.js + TypeScript with NestJS**
Why:
- Strong structure for a scalable API
- Good for integration-heavy connector architecture
- Type safety across services
- Clean module boundaries for cities/providers

Suggested backend stack:
- **Node.js**
- **TypeScript**
- **NestJS**
- **PostgreSQL**
- **Prisma ORM**
- **Redis** for caching/session/queue support
- **BullMQ** or similar for jobs/notifications/retries
- **OpenAPI/Swagger** for API documentation

Alternative if you want faster MVP velocity:
- **Supabase** for auth + database + storage + notifications support pieces
- **Edge/serverless functions** for lightweight backend logic

Recommended approach:
- If you want a **serious scalable product foundation**, use **NestJS + PostgreSQL + Prisma**.
- If you want a **rapid MVP/prototype**, use **Expo + Supabase** and add a connector service later.

---

## Payments
Recommended:
- **Stripe** for card management and payment flows
- Support:
  - Apple Pay
  - Google Pay
  - saved cards

Important note:
Actual parking payment mechanics may vary by city/provider, so payment architecture should separate:
- user wallet/payment authorization
- parking provider transaction execution
- receipt generation

---

## Notifications
Recommended:
- **Expo Notifications** for MVP
- Consider **Firebase Cloud Messaging (FCM)** / APNs strategy for scale

Use notifications for:
- session expiring
- extension reminder
- payment failure
- session ended

---

## Maps / Geolocation
Recommended:
- **Mapbox** for flexible location experiences and custom map styling
- Alternative: **Google Maps Platform**

Need support for:
- user location
- reverse geocoding
- zone overlays if available
- manual map confirmation

---

## Authentication
Recommended:
- **Supabase Auth**, **Clerk**, or **Auth0** for MVP/startup speed
- If building custom backend auth, use JWT + refresh tokens with secure storage

---

## Data Model (High-Level)

Core entities:
- User
- Vehicle
- PaymentMethod
- City
- ParkingProvider
- ParkingZone
- ParkingRule
- ParkingSession
- SessionExtension
- Notification
- Receipt

---

## Suggested Architecture Pattern

### Mobile App
- presentation layer
- feature modules
- API client layer
- local persistence for recent session state

### Backend
- auth module
- users module
- vehicles module
- payments module
- parking sessions module
- notifications module
- city/provider connector modules
- rules engine module

### Connector Pattern
Each city/provider should implement a common interface, for example:
- get zone details
- validate parking request
- create session
- extend session
- stop session
- fetch receipt/session status

This avoids hard-coding business logic per city throughout the app.

---

## Repository / Project Setup Recommendation

### Monorepo Recommended
Use a monorepo for easier coordination between app, API, and shared types.

Suggested structure:

```text
/apps
  /mobile
  /api
/packages
  /shared-types
  /ui
  /config
```

Recommended tooling:
- **pnpm** workspaces
- **Turbo** or **Nx** for monorepo orchestration
- **ESLint**
- **Prettier**
- **Husky** + **lint-staged**

---

## VS Code + Claude Opus Workflow Recommendation

Use Claude to build the app incrementally instead of asking for the entire product at once.

### Recommended build order
1. Set up monorepo
2. Scaffold Expo mobile app
3. Set up design tokens and navigation
4. Build core screens:
   - Home
   - Confirm Parking
   - Active Session
   - Extend Time
   - History
5. Create mock service layer with fake city/provider data
6. Add auth and user profile data model
7. Add payment flow
8. Add notifications
9. Replace mock service layer with real backend integration
10. Add city/provider connector architecture

### Recommended prompt style for Claude
Ask Claude to:
- work one feature at a time
- preserve file structure
- output complete file replacements when needed
- explain dependencies added
- avoid unnecessary refactors outside requested scope
- maintain TypeScript types across frontend/backend

---

## Engineering Requirements to Define Early

Before building, align on:
- supported platforms (iOS only first, or iOS + Android)
- MVP city coverage
- whether unsupported cities show fallback guidance
- integration strategy (APIs vs partnership vs links)
- payment/legal approach
- receipt/business expense requirements
- notification strategy
- data/privacy requirements

---

## Risks and Unknowns

### Biggest Product Risks
1. **City/vendor integration complexity**
2. **Parking rule inconsistency across cities**
3. **Legal/payment constraints**
4. **User trust if zone accuracy is wrong**
5. **Extension availability differing by provider**

### Recommended mitigation
- Start with a narrow pilot market or a mocked universal prototype
- Design explicit confirmation steps before payment
- Build clear unsupported/fallback states
- Separate the UX promise from provider-specific legal constraints

---

## MVP Success Criteria

The MVP is successful if users can:
- start a parking session quickly
- understand exactly where they are parked
- see time remaining and total paid at a glance
- extend parking easily
- receive useful reminders before expiration

Suggested measurable goals:
- session start in under 10 seconds
- extension in under 5 seconds
- low drop-off from confirm to payment
- low support requests related to zone confusion

---

## Deliverables to Create First

1. Product requirements doc (expanded from this brief)
2. User flows
3. Wireframes for core screens
4. Design system / UI tokens
5. Technical architecture diagram
6. Data model / schema draft
7. API contract draft
8. MVP backlog with prioritized tickets

---

## Recommended First Sprint

### Sprint 1 Goal
Create a working clickable/mobile prototype with mocked data.

### Sprint 1 tasks
- Set up monorepo
- Create Expo app with TypeScript
- Build navigation shell
- Build Home screen
- Build Confirm Parking screen
- Build Active Session screen
- Build Extend flow
- Build local mock data store
- Add notification placeholders
- Define shared TypeScript models

### Sprint 1 output
A functional prototype that demonstrates the core value proposition before integration complexity is introduced.

---

## Suggested Build Prompt for Claude Opus in VS Code

Use this as your starter prompt:

```md
I am building a mobile-first universal street parking app using a monorepo.

Tech stack:
- Expo + React Native + TypeScript for the mobile app
- Node.js + NestJS + PostgreSQL + Prisma for the backend
- pnpm workspaces
- shared TypeScript types across apps/packages

Please help me scaffold the project for an MVP.

Requirements:
- Create a clean monorepo folder structure for /apps/mobile, /apps/api, and /packages/shared-types
- Set up the Expo app with Expo Router and TypeScript
- Set up the NestJS API with basic modules for auth, users, parking-sessions, and providers
- Add shared TypeScript models for User, Vehicle, ParkingZone, ParkingSession, Receipt
- Use a simple, scalable architecture that supports city/provider connector modules later
- Keep the UI mobile-first, simple, and user-friendly
- Prioritize these screens first: Home, Confirm Parking, Active Session, Extend Time, History
- Use mocked data and services first; do not integrate real providers yet
- Explain each file you create
- Output complete file contents for each new file
- Keep naming consistent and production-minded
```

---

## Final Recommendation

If your goal is to get started quickly with Claude in VS Code, the strongest setup is:

- **Frontend:** Expo + React Native + TypeScript
- **Backend:** NestJS + TypeScript + PostgreSQL + Prisma
- **Payments:** Stripe
- **Notifications:** Expo Notifications
- **Maps:** Mapbox
- **Auth:** Supabase Auth or Clerk for MVP speed
- **Repo setup:** pnpm monorepo with shared types

This gives you:
- a realistic path to production
- fast iteration in VS Code
- a structure Claude can reliably help you build feature by feature
- flexibility to support many city systems over time
