/**
 * Spacing Constants
 *
 * Usage: import { spacing } from '@/constants';
 * Example: style={{ padding: spacing.md }}
 */

export const spacing = {
  // Base spacing units
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,

  // Screen padding
  screen: {
    horizontal: 20,
    vertical: 16,
  },

  // Card padding
  card: {
    horizontal: 16,
    vertical: 16,
  },

  // Safe area (status bar, home indicator)
  safeArea: {
    top: 44,
    bottom: 34,
  },
} as const;

// Border radius
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
  card: 16,
  button: 12,
  input: 10,
} as const;

// Type exports
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
