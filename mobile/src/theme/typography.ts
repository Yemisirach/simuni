// Simuni Design System — Typography Specification
// Primary Font Family: Manrope (with system fallbacks)
// Monospace / Numerical Data: JetBrains Mono / IBM Plex Mono (for ETB figures, counters, hashes, coordinates)

import { Platform, TextStyle } from 'react-native';

// ─── Font Families ─────────────────────────────────────────────────────

export const fontFamily = {
  /** Primary Sans-Serif font family: Manrope with system fallbacks */
  sans: Platform.select({
    web: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),

  /** Monospace / Numerical Data font family: JetBrains Mono / IBM Plex Mono */
  mono: Platform.select({
    web: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),

  /** Legacy alias pointing to sans for high consistency across all screen titles */
  serif: Platform.select({
    web: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
} as const;

// ─── Font Weights ──────────────────────────────────────────────────────

export const fontWeight = {
  regular:   '400' as TextStyle['fontWeight'],
  medium:    '500' as TextStyle['fontWeight'],
  semibold:  '600' as TextStyle['fontWeight'],
  bold:      '700' as TextStyle['fontWeight'],
  extraBold: '800' as TextStyle['fontWeight'],
  heavy:     '800' as TextStyle['fontWeight'],
} as const;

// ─── Typography Scale & Hierarchy ───────────────────────────────────────

export const fontSize = {
  /** 34px (32px – 36px) — Display / Hero KPI huge financial metrics (384,520 ETB) */
  display:    34,
  /** 26px (24px – 28px) — Headline 1 (H1) screen titles ("Daily Sales & Stock") */
  h1:         26,
  /** 19px (18px – 20px) — Headline 2 (H2) section headers ("Reconciliation Equilibrium") */
  h2:         19,
  /** 16px (15px – 16px) — Headline 3 (H3) card titles & SKU names ("Topwater 0.60L") */
  h3:         16,
  /** 14px — Body (Default) primary descriptive text, table cells, form labels */
  body:       14,
  /** 13px — Body (Compact) sub-descriptions, address lines, merchant contact info */
  bodyCompact:13,
  bodySmall:  13,
  /** 11px (11px – 12px) — Caption / Overline category tags, sync statuses, ERCA pills */
  caption:    11,
  overline:   11,
  label:      11,
  /** 10px — Micro / Subtext timestamps, SHA256 hashes, formula operator labels */
  micro:      10,
} as const;

// ─── Line Heights ──────────────────────────────────────────────────────

export const lineHeight = {
  /** 1.1 – 1.15 for Display / Hero KPI */
  tight:   1.15,
  /** 1.2 for H1 */
  h1:      1.2,
  /** 1.3 for H2 */
  h2:      1.3,
  /** 1.35 for H3 */
  h3:      1.35,
  /** 1.4 – 1.5 for Body / Normal */
  normal:  1.45,
  snug:    1.35,
  relaxed: 1.55,
} as const;

// ─── Letter Spacings ───────────────────────────────────────────────────

export const letterSpacing = {
  /** -0.03em for Display / Hero KPI */
  display:   -1.0,
  /** -0.02em for H1 */
  h1:        -0.5,
  /** -0.015em for H2 */
  h2:        -0.3,
  /** -0.01em for H3 */
  h3:        -0.16,
  /** 0 for Body */
  normal:     0,
  /** +0.05em for Caption / Overline uppercase */
  overline:   0.6,
  /** +0.05em for Micro metadata */
  micro:      0.5,
  tight:     -0.5,
  wide:       0.3,
  wider:      0.5,
  widest:     1.0,
} as const;

// ─── Color & Tone Application ──────────────────────────────────────────

export const textColors = {
  /** #111827 / #1A1D20 — Dark Charcoal / Titanium Black (Titles & High-Emphasis Text) */
  primary:     '#111827',
  primaryDark: '#1A1D20',
  /** #5F6876 / #6B7280 — Muted Pewter Slate (Secondary & Body Labels) */
  secondary:   '#5F6876',
  muted:       '#6B7280',
  /** #8A94A6 — Brushed Platinum Gray (Micro & Tertiary Metadata) */
  tertiary:    '#8A94A6',
  /** #0D5CFF — Kinetic Blue (Active Accents & Indicators) */
  accentBlue:  '#0D5CFF',
  /** #C89436 / #E07A10 — Warm Champagne / Amber */
  accentAmber: '#C89436',
  champagne:   '#E07A10',
} as const;

// ─── Composite Type Styles ─────────────────────────────────────────────

export const typeStyles = {
  /** Display / Hero KPI — Huge financial metrics (384,520 ETB) */
  displayHero: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.display,
    fontWeight: fontWeight.extraBold,
    lineHeight: Math.round(fontSize.display * lineHeight.tight),
    letterSpacing: letterSpacing.display,
    color: textColors.primary,
  } as TextStyle,

  /** Legacy alias for display numbers */
  displayMono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.display * lineHeight.tight),
    letterSpacing: letterSpacing.display,
    color: textColors.primary,
  } as TextStyle,

  /** Headline 1 (H1) — Screen titles ("Daily Sales & Stock", "Orders & E-Invoicing") */
  h1: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.h1 * lineHeight.h1),
    letterSpacing: letterSpacing.h1,
    color: textColors.primary,
  } as TextStyle,
  pageTitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.h1 * lineHeight.h1),
    letterSpacing: letterSpacing.h1,
    color: textColors.primary,
  } as TextStyle,

  /** Headline 2 (H2) — Section headers ("Reconciliation Equilibrium", "Sales Channels") */
  h2: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.h2 * lineHeight.h2),
    letterSpacing: letterSpacing.h2,
    color: textColors.primary,
  } as TextStyle,
  sectionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.h2 * lineHeight.h2),
    letterSpacing: letterSpacing.h2,
    color: textColors.primary,
  } as TextStyle,

  /** Headline 3 (H3) — Card titles & SKU names ("Topwater 0.60L", "Al-Nur Mart") */
  h3: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.h3 * lineHeight.h3),
    letterSpacing: letterSpacing.h3,
    color: textColors.primary,
  } as TextStyle,
  cardTitle: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.h3 * lineHeight.h3),
    letterSpacing: letterSpacing.h3,
    color: textColors.primary,
  } as TextStyle,

  /** Body (Default) — Primary descriptive text, table cells, form labels */
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.body * lineHeight.normal),
    letterSpacing: letterSpacing.normal,
    color: textColors.secondary,
  } as TextStyle,

  /** Body (Compact) — Sub-descriptions, address lines, merchant contact info */
  bodyCompact: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodyCompact,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.bodyCompact * 1.4),
    letterSpacing: letterSpacing.normal,
    color: textColors.secondary,
  } as TextStyle,
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodyCompact,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.bodyCompact * 1.4),
    letterSpacing: letterSpacing.normal,
    color: textColors.secondary,
  } as TextStyle,

  /** Caption / Overline — Category tags, ledger sync statuses, ERCA compliance pills */
  overline: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.overline,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.overline * 1.3),
    letterSpacing: letterSpacing.overline,
    textTransform: 'uppercase',
    color: textColors.secondary,
  } as TextStyle,
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    lineHeight: Math.round(fontSize.caption * 1.3),
    letterSpacing: letterSpacing.normal,
    color: textColors.secondary,
  } as TextStyle,

  /** Micro / Subtext — Timestamps, SHA256 hashes, formula operator labels */
  micro: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    lineHeight: Math.round(fontSize.micro * 1.2),
    letterSpacing: letterSpacing.micro,
    color: textColors.tertiary,
  } as TextStyle,

  /** Data Monospace (ETB figures, counters, hashes, QR codes, OSRM coords) */
  dataMono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.h3 * lineHeight.tight),
    color: textColors.primary,
  } as TextStyle,
  dataMonoSmall: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.body * lineHeight.tight),
    color: textColors.primary,
  } as TextStyle,

  /** Primary button label */
  button: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.body * 1.2),
    letterSpacing: 0.2,
  } as TextStyle,
} as const;
