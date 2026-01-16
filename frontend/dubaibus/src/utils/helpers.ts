/**
 * Helper Functions
 *
 * General utility helpers
 */

import { colors } from "../constants";
import type { MetroLineColor } from "../types";

/**
 * Get metro line color by name
 */
export function getMetroLineColor(lineName: string): string {
  const name = lineName.toLowerCase();
  if (name.includes("red")) return colors.metro.red;
  if (name.includes("green")) return colors.metro.green;
  if (name.includes("2020") || name.includes("blue")) return colors.metro.blue;
  return colors.rta.orange; // default
}

/**
 * Get metro line color key
 */
export function getMetroLineColorKey(lineName: string): MetroLineColor {
  const name = lineName.toLowerCase();
  if (name.includes("red")) return "red";
  if (name.includes("green")) return "green";
  return "blue";
}

/**
 * Delay helper for loading states
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe parse integer
 */
export function safeParseInt(
  value: string | undefined,
  defaultValue = 0
): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Generate unique key for lists
 */
export function generateKey(prefix: string, id: string | number): string {
  return `${prefix}-${id}`;
}

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
