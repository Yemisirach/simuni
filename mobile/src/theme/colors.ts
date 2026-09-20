// Simuni Design System — Color Tokens
// Warm neutral palette inspired by Ethiopian heritage & the Santim coin's silver patina.
// Two modes: a simplified "driver" palette for field agents under sunlight,
// and a richer "dispatcher" palette for managers indoors.

// ─── Core Brand ────────────────────────────────────────────────────────
export const brand = {
  black: '#1A1A1A',        // Primary UI anchor — warm charcoal
  darkGray: '#2D2D2D',     // Headers, top nav background
  gold: '#C4A35A',         // Heritage gold accent (coin-inspired)
  goldLight: '#D4B978',    // Gold hover / pressed
  goldMuted: '#E8D5A8',    // Gold tint for backgrounds
  cream: '#FAF8F2',        // Warm off-white surface
} as const;

// ─── Neutral Scale (Warm Grays) ────────────────────────────────────────
export const neutral = {
  900: '#1A1A1A',
  800: '#2D2D2D',
  700: '#4A4A4A',
  600: '#6B6B6B',
  500: '#8C8C8C',
  400: '#B3B3B3',
  300: '#D4D4D4',
  200: '#E5E5E3',
  150: '#EBEBEB',
  100: '#F5F5F3',
  50:  '#FAFAF8',
  0:   '#FFFFFF',
} as const;

// ─── Semantic / Status Colors ──────────────────────────────────────────
export const semantic = {
  success:      '#1F9D55',
  successLight: '#E4F6E9',
  successDark:  '#177A3E',

  warning:      '#E5A100',
  warningLight: '#FFF3DC',
  warningDark:  '#9A6B00',

  danger:       '#D64545',
  dangerLight:  '#FDECEC',
  dangerDark:   '#B23A3A',

  info:         '#3B82F6',
  infoLight:    '#EFF6FF',
  infoDark:     '#1E40AF',
} as const;

// ─── Third-Party Brand Colors ──────────────────────────────────────────
export const partners = {
  telebirr:      '#5E2A8C',
  telebirrDark:  '#4A2170',
  osrm:          '#0F7A5C',   // Keep the original green for OSRM/map contexts
  osrmDark:      '#0B5C45',
} as const;

// ─── Badge / Status Chip Palettes ──────────────────────────────────────
export const badges = {
  green:  { bg: '#E4F6E9', text: '#177A3E' },   // ON TRACK, COMPLETED, Delivered
  amber:  { bg: '#FFF3DC', text: '#9A6B00' },   // IN TRANSIT, APPROACHING, Pending
  gray:   { bg: '#EEF1F0', text: '#6B7772' },   // PLANNED, OFFLINE, Buffered
  red:    { bg: '#FDECEC', text: '#B23A3A' },   // CANCELLED, UNPAID, Error
  gold:   { bg: '#FDF6E3', text: '#8B6914' },   // PRIORITY, VIP
  purple: { bg: '#F3ECFA', text: '#5E2A8C' },   // telebirr verified
} as const;

// ─── Legacy-Compatible Flat Export ─────────────────────────────────────
// Drop-in replacement for the old `colors` object so existing screens
// continue to compile while we migrate them one by one.
export const colors = {
  // Brand primaries (shifted from green → warm dark + gold)
  primary:      brand.black,
  primaryDark:  brand.darkGray,
  accent:       brand.gold,
  accentLight:  brand.goldMuted,

  // Surfaces
  background:   neutral[100],
  surface:      neutral[0],
  surfaceAlt:   neutral[50],

  // Typography
  text:         neutral[900],
  textSecondary:neutral[700],
  textMuted:    neutral[600],
  textInverse:  neutral[0],

  // Borders & Dividers
  border:       neutral[200],
  borderLight:  neutral[150],
  divider:      neutral[200],

  // Semantic
  danger:       semantic.danger,
  success:      semantic.success,
  warning:      semantic.warning,
  info:         semantic.info,

  // Partners
  telebirr:     partners.telebirr,
  osrm:         partners.osrm,
  osrmDark:     partners.osrmDark,
} as const;

// ─── Spacing (4px base unit, 12-step scale) ────────────────────────────
export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
} as const;

// ─── Border Radius ─────────────────────────────────────────────────────
export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
} as const;
