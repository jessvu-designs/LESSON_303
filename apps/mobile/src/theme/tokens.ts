// Minimal design tokens — clarity-first, mobile-first.
// Per brief: avoid color-only status indicators, large tap targets, plain language.
export const colors = {
  bg: '#0B1220',
  surface: '#121A2B',
  surfaceAlt: '#1B2540',
  border: '#2A3559',
  text: '#F4F6FB',
  textMuted: '#A6B0CF',
  primary: '#3B82F6',
  primaryText: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 };

export const typography = {
  display: { fontSize: 48, fontWeight: '700' as const, color: colors.text },
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  bodyMuted: { fontSize: 16, color: colors.textMuted },
  label: { fontSize: 13, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};
