/**
 * Text Formatters
 *
 * Utility functions for text formatting
 */

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format stop name (remove common suffixes for display)
 */
export function formatStopName(name: string): string {
  return name
    .replace(/ Bus Station$/i, "")
    .replace(/ Metro Station$/i, "")
    .replace(/ Station$/i, "")
    .trim();
}

/**
 * Format bus number for display
 */
export function formatBusNumber(number: string): string {
  return number.toUpperCase();
}

/**
 * Get direction label
 */
export function getDirectionLabel(directionId: number): string {
  return directionId === 0 ? "Upward" : "Downward";
}

/**
 * Get direction icon (arrow)
 */
export function getDirectionIcon(directionId: number): string {
  return directionId === 0 ? "↑" : "↓";
}
