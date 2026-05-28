# 🅿️ Universal Street Parking App – Style Guide

Mobile-first cross-platform app (React Native + Expo). The visual system is **urban, signage-inspired, and high-contrast** — clarity, glanceability, and trust above all else.

---

## 1. Design Principles

- **Clarity over complexity** — one primary action per screen.
- **Glanceable** — the most important info (time left, location, zone) is readable in under a second.
- **Trustworthy** — strong status messaging, confirmation states, plain language.
- **Accessible by default** — WCAG-aligned contrast, large tap targets, screen-reader labels.
- **Signage-inspired** — typography and color borrow from street curbs, meters, and city signs.
- **Error prevention over recovery** — confirm before charging, warn before max time.

Avoid: decorative imagery, dense lists, color-only status, parking jargon.

---

## 2. Color Tokens

All colors live in [apps/mobile/src/theme/tokens.ts](../apps/mobile/src/theme/tokens.ts). Always import from the theme — never hardcode hex.

### Neutrals (urban surfaces)
| Token | Value | Use |
|---|---|---|
| `colors.bg` | `#1F1F1F` | App background (asphalt) |
| `colors.surface` | `#2A2A2A` | Cards, sheets |
| `colors.surfaceAlt` | `#333333` | Nested surfaces, list rows |
| `colors.border` | `#737373` | Dividers, outlines (≥3:1 contrast) |
| `colors.text` | `#E5E5E5` | Primary text (concrete) |
| `colors.textMuted` | `#BDBDBD` | Secondary text, captions |

### Action & Status
| Token | Value | Meaning |
|---|---|---|
| `colors.primary` | `#2F80ED` | Primary actions, CTAs |
| `colors.primaryText` | `#000000` | Text on primary surfaces |
| `colors.link` | `#8EC5FF` | Links, secondary actions |
| `colors.success` | `#2E7D32` | Active session, successful payment (meter green) |
| `colors.warning` / `colors.curb` | `#F4C542` | Time-running-low, attention (curb yellow) |
| `colors.danger` | `#E5533D` | Expired, errors, destructive actions |

### Semantic Rules
- **Active / paid** → `success` green
- **Expiring soon (≤15 min)** → `warning` yellow
- **Expired / failed payment** → `danger` red/orange
- **Primary CTA (Start parking, Extend)** → `primary` blue
- Never communicate status with color alone — pair with icon + text label.

---

## 3. Typography

### Font Families
Defined per-platform in `tokens.ts`:
- **Base (UI):** Inter (iOS), Roboto Condensed (Android), IBM Plex Sans → system stack (Web)
- **Serif (signage / street names):** Georgia (iOS/Web), serif (Android)

Serif is used **only** for street names and zone display names — it gives locations an editorial signage feel that contrasts with the sans UI.

### Scale
| Token | Size | Weight | Use |
|---|---|---|---|
| `typography.display` | 44 | 700 | Countdown timer, hero number |
| `typography.h1` | 28 | 700 | Screen titles |
| `typography.h2` | 20 | 700 | Section titles |
| `typography.h3` | 18 | 600 | Card titles |
| `typography.body` | 16 / 22 lh | 400 | Primary body |
| `typography.bodyMuted` | 16 / 22 lh | 400 | Secondary copy (`textMuted`) |
| `typography.label` | 12 | 700 | Small uppercase kicker, **yellow** (`warning`), 0.9 letter-spacing |
| `typography.sectionHeading` | 15 | 800 | Signage-style card kicker, white, uppercase, 1.2 letter-spacing |
| `typography.streetName` | 20 | 700 | Serif — zone street names only |

### Rules
- Reserve **display** for one element per screen (typically the countdown).
- Use **label** (yellow) and **sectionHeading** (white) together when stacking kickers in a card.
- Support **Dynamic Type** — never set hard caps on text scaling.
- Line height ≥ 1.4 for body.
- No all caps in long-form copy — only `label` and `sectionHeading`.

---

## 4. Spacing

Use the spacing scale from `tokens.ts`:

| Token | Value |
|---|---|
| `spacing.xs` | 4 |
| `spacing.sm` | 8 |
| `spacing.md` | 12 |
| `spacing.lg` | 16 |
| `spacing.xl` | 24 |
| `spacing.xxl` | 32 |

Guidelines:
- Screen edge padding: `lg` (16) default, `xl` (24) on key screens.
- Card padding: `lg`–`xl`.
- Vertical rhythm between sections: `xl` (24) or `xxl` (32).
- Inline gap (icon → label): `sm` (8).

---

## 5. Radius

| Token | Value | Use |
|---|---|---|
| `radii.sm` | 4 | Inline tags, small chips |
| `radii.md` | 8 | Inputs, small cards |
| `radii.lg` | 10 | Cards, sheets, primary surfaces |
| `radii.pill` | 999 | Buttons, status chips, time-extend chips |

---

## 6. Components

### Buttons
- **Primary:** `colors.primary` background, `colors.primaryText` (`#000`) label, `radii.pill`.
- **Secondary:** transparent fill, `colors.border` outline, `colors.text` label.
- **Destructive:** `colors.danger` background, white label.
- Minimum tap target: **44 × 44pt** (iOS HIG / WCAG 2.5.5).
- Internal padding: `spacing.md` vertical, `spacing.lg` horizontal.

### Cards / Sheets
- Background `colors.surface`, radius `radii.lg`, padding `spacing.lg`.
- Optional 1px `colors.border` outline.
- Bottom sheets are the **preferred pattern** for quick actions (extend, confirm).

### Status Chips
- Pill radius, `spacing.xs`/`spacing.sm` padding, weight 700.
- Active → `success` bg + dark text
- Expiring → `warning` bg + dark text + clock icon
- Expired → `danger` bg + white text + alert icon

### Countdown Timer (Active Session — most important UI)
- `typography.display` (44pt), centered.
- Color reflects state: `success` → `warning` (≤ 15 min) → `danger` (expired).
- Always paired with:
  - Expiration timestamp (local time)
  - Location string
  - Zone code
  - License plate
  - Amount paid
  - **Extend Time** primary CTA below

### Form Inputs
- Background `colors.surfaceAlt`, border `colors.border`, radius `radii.md`.
- Label above input (not placeholder-only).
- Inline validation with `danger` color + text message.

### Lists & Rows
- Row background `colors.surface`, divider `colors.border` (or `surfaceAlt` for softer).
- Tappable rows: min height 56pt.

---

## 7. Iconography

- Single line-weight icon set across the app (e.g. Lucide / Phosphor).
- Always pair icons with text for status meanings.
- Icon color follows text color; never use icons alone for status.

---

## 8. Motion

- Subtle, fast — typically **150–250ms**.
- Use motion to confirm actions (button press, sheet present), never decoration.
- Respect `prefers-reduced-motion` / Reduce Motion accessibility setting.
- Avoid parallax and large translation.

---

## 9. Accessibility

- **Contrast:** all text meets WCAG AA (4.5:1) on its background. Non-text UI (borders, icons) meets 3:1.
- **Tap targets:** ≥ 44pt in every dimension.
- **Screen reader:** every interactive element has an `accessibilityLabel`; status chips include their meaning in the label, not just color.
- **Dynamic Type:** layouts reflow with larger text; never truncate critical info (timer, expiration).
- **Focus states:** visible on web/admin tooling.
- **Plain language:** avoid “tariff,” “grace period jargon” — say “time left,” “added cost.”
- **Color independence:** all status communicated via color is also communicated via icon + label.

---

## 10. Voice & Microcopy

- Short, calm, second-person. Reassuring after key actions.
- Confirmation: **“You’re parked.”** / **“Time extended.”**
- Cost: lead with total (`$3.50 total`), then breakdown if needed.
- Time: `45 min left`, `Expires 4:32 PM`.
- Errors: name the problem, offer the fix. Example: *“This zone doesn’t allow extensions. Try ending your session or moving to a nearby zone.”*
- Never use “Oops,” parking codes without translation, or stack trace language.

---

## 11. Screen Patterns

| Screen | Pattern |
|---|---|
| Onboarding | Single CTA per step, permissions explained in plain language |
| Home / Detect location | Map + bottom sheet showing detected zone + Start CTA |
| Confirm zone & pricing | Card with zone, rate, total — explicit confirm button |
| Active session | `display` countdown, status chip, location card, prominent Extend |
| Extend time | Bottom sheet with chip choices (`+15`, `+30`, `+1 hr`) + total preview |
| Receipts / history | List rows with date, city, amount |
| Wallet / vehicles | Edit-friendly list rows, swipe or explicit edit |

---

## 12. Do / Don't

✅ Do
- Import all colors, spacing, radii, and typography from `theme/tokens.ts`.
- Make the countdown and Extend CTA the most prominent elements during a session.
- Use serif `streetName` only for actual street/zone names.
- Pair every status color with an icon + text label.

🚫 Don't
- Hardcode hex values, font sizes, or magic spacing numbers.
- Use color as the sole indicator of status.
- Mix serif into UI chrome or buttons.
- Add decorative shadows or gradients that hurt contrast.
- Bury Extend behind navigation during an active session.
