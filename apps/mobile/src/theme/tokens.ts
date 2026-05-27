import { Platform } from 'react-native';

// Urban parking visual system: high contrast, signage-inspired colors,
// practical spacing, and typography tuned for quick glance readability.
export const colors = {
  bg: '#1F1F1F', // asphalt
  surface: '#2A2A2A',
  surfaceAlt: '#333333',
  border: '#737373', // ≥3:1 contrast vs bg/surface for WCAG 2.1 SC 1.4.11 non-text contrast
  text: '#E5E5E5', // concrete
  textMuted: '#BDBDBD',
  primary: '#2F80ED', // system blue
  primaryText: '#000000',
  link: '#8EC5FF',
  success: '#2E7D32', // meter green
  warning: '#F4C542', // curb yellow
  danger: '#E5533D', // alert red/orange
  curb: '#F4C542',
  asphalt: '#1F1F1F',
  concrete: '#E5E5E5',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = { sm: 4, md: 8, lg: 10, pill: 999 };

const fontFamilyBase = Platform.select({
  ios: 'Inter',
  android: 'Roboto Condensed',
  default: 'IBM Plex Sans',
});

export const typography = {
  display: {
    fontFamily: fontFamilyBase,
    fontSize: 44,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.2,
  },
  h1: {
    fontFamily: fontFamilyBase,
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.2,
  },
  h2: {
    fontFamily: fontFamilyBase,
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: 0.1,
  },
  h3: {
    fontFamily: fontFamilyBase,
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontFamily: fontFamilyBase,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  bodyMuted: {
    fontFamily: fontFamilyBase,
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },
  label: {
    fontFamily: fontFamilyBase,
    fontSize: 12,
    color: colors.warning,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.9,
    fontWeight: '700' as const,
  },
};
