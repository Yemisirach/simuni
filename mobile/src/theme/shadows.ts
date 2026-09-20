// Simuni Design System — Elevation / Shadows
// Platform-aware shadow definitions: iOS uses shadow* properties,
// Android uses elevation. Matches the subtle card elevation and
// modal overlays visible in the screenshots.

import { Platform, ViewStyle } from 'react-native';

type ShadowToken = ViewStyle;

function shadow(
  offsetY: number,
  blurRadius: number,
  color: string,
  opacity: number,
  elevation: number,
): ShadowToken {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius,
    },
  }) as ShadowToken;
}

export const shadows = {
  /** No shadow — flat elements */
  none: shadow(0, 0, 'transparent', 0, 0),

  /** Subtle card shadow — route cards, KPI cards, product rows */
  sm: shadow(1, 3, '#000000', 0.06, 1),

  /** Default card elevation — delivery cards, agent rows */
  md: shadow(2, 8, '#000000', 0.08, 3),

  /** Elevated — floating action buttons, selected cards */
  lg: shadow(4, 16, '#000000', 0.12, 6),

  /** High elevation — dropdowns, popovers */
  xl: shadow(8, 24, '#000000', 0.16, 9),

  /** Modal overlay shadow */
  modal: shadow(12, 40, '#000000', 0.25, 16),

  /** Branded hover glow (for map overlays, active route cards) */
  glow: shadow(4, 18, '#C4A35A', 0.15, 6),

  /** OSRM/green glow for navigation elements */
  osrmGlow: shadow(4, 18, '#0F7A5C', 0.15, 6),
} as const;
