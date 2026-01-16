/**
 * Color Constants - RTA Dubai Theme
 *
 * Usage: import { colors } from '@/constants';
 * Example: style={{ color: colors.rta.orange }}
 */

export const colors = {
  // RTA Brand Colors
  rta: {
    orange: "#F7941D",
    orangeLight: "#FFAD4D",
    orangeDark: "#D97B0D",
    blue: "#003366",
    blueLight: "#004C99",
    blueDark: "#002244",
  },

  // Metro Line Colors
  metro: {
    red: "#E21836",
    redLight: "#FF4D6A",
    green: "#4CAF50",
    greenLight: "#81C784",
    blue: "#006AA7", // Route 2020
    blueLight: "#339DD1",
  },

  // Background Colors
  background: {
    primary: "#F5F5F5",
    secondary: "#FFFFFF",
    card: "#FFFFFF",
    dark: "#1A2332",
  },

  // Text Colors
  text: {
    primary: "#1A2332",
    secondary: "#666666",
    muted: "#999999",
    light: "#FFFFFF",
  },

  // Border Colors
  border: {
    light: "#E0E0E0",
    medium: "#CCCCCC",
    dark: "#999999",
  },

  // Status Colors
  status: {
    success: "#4CAF50",
    warning: "#FFC107",
    error: "#F44336",
    info: "#2196F3",
  },
} as const;

// Type for colors
export type Colors = typeof colors;
