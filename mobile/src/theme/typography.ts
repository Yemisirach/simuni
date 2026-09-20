// Simuni Design System — Typography
// Mixed type hierarchy: classical serif for headings (echoing Ethiopian
// inscriptions and formal documents), system sans-serif for body text,
// and monospace for data/telemetry values (ETB amounts, coordinates, speeds).

import { Platform, TextStyle } from 'react-native';

// ─── Font Families ─────────────────────────────────────────────────────

export const fontFamily = {
  /** Serif for headings & display text — gravitas and cultural warmth. */
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }),

  /** System sans-serif for body text — clean and highly legible. */
  sans: Platform.select({
    ios: '-apple-system',
    android: 'Roboto',
    default: 'System',
  }),

  /** Monospace for numerical data, telemetry, amounts, coordinates. */
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// ─── Font Weights ──────────────────────────────────────────────────────

export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium:  '500' as TextStyle['fontWeight'],
  semibold:'600' as TextStyle['fontWeight'],
  bold:    '700' as TextStyle['fontWeight'],
  heavy:   '800' as TextStyle['fontWeight'],
} as const;

// ─── Type Scale ────────────────────────────────────────────────────────
// Named tokens → consistent sizing across screens.

export const fontSize = {
  /** 32px — Hero numbers on KPI cards (e.g. "384,520 ETB") */
  display:    32,
  /** 26px — Page titles ("Manager Command & Dispatch Hub") */
  h1:         26,
  /** 22px — Section headings ("Active Route Manifests") */
  h2:         22,
  /** 18px — Card titles, customer names */
  h3:         18,
  /** 16px — Subheadings, primary body */
  h4:         16,
  /** 15px — Default body text */
  body:       15,
  /** 14px — Secondary body, navigation items */
  bodySmall:  14,
  /** 13px — Supporting text, timestamps */
  caption:    13,
  /** 12px — Labels, badge text, metadata */
  label:      12,
  /** 11px — Fine print, table headers (uppercase) */
  overline:   11,
  /** 10px — Micro text, version numbers */
  micro:      10,
} as const;

// ─── Line Heights ──────────────────────────────────────────────────────

export const lineHeight = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.6,
} as const;

// ─── Letter Spacing ────────────────────────────────────────────────────

export const letterSpacing = {
  tight:    -0.5,
  normal:   0,
  wide:     0.3,
  wider:    0.5,
  widest:   1.0,
} as const;

// ─── Composite Type Styles ─────────────────────────────────────────────
// Pre-built text styles matching the screenshot hierarchy.

export const typeStyles = {
  /** Hero KPI number — "384,520" */
  displayMono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    lineHeight: fontSize.display * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  /** Page title — "Fleet Dispatch Ops" */
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h1 * lineHeight.snug,
  } as TextStyle,

  /** Section heading — "Active Agent Operations" */
  sectionTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h2 * lineHeight.snug,
  } as TextStyle,

  /** Card title — "Al-Nur Beverage Mart" */
  cardTitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h3 * lineHeight.snug,
  } as TextStyle,

  /** Sub-heading — "ASSIGNED CONSIGNMENT" */
  subHeading: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h4,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.h4 * lineHeight.normal,
  } as TextStyle,

  /** Default body text */
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.body * lineHeight.normal,
  } as TextStyle,

  /** Small body text */
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.bodySmall * lineHeight.normal,
  } as TextStyle,

  /** Caption text — timestamps, metadata */
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.caption * lineHeight.normal,
  } as TextStyle,

  /** Uppercase overline — "COLLECTED REVENUE", "REM. DIST" */
  overline: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.overline,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.overline * lineHeight.normal,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Monospace data value — "18ms", "32 km/h", "99.2%" */
  dataMono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h3 * lineHeight.tight,
  } as TextStyle,

  /** Small mono — ETB amounts in lists */
  dataMonoSmall: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.body * lineHeight.tight,
  } as TextStyle,

  /** Badge text */
  badge: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.label * lineHeight.tight,
  } as TextStyle,

  /** Button text */
  button: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h4,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h4 * lineHeight.tight,
  } as TextStyle,

  /** Small button text */
  buttonSmall: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.bodySmall * lineHeight.tight,
  } as TextStyle,
} as const;
