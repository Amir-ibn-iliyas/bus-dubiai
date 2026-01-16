/**
 * Common Types
 *
 * Shared type definitions
 */

import type { ReactNode } from "react";

// Generic loading state
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Component with children
export interface WithChildren {
  children: ReactNode;
}

// Component with optional className
export interface WithClassName {
  className?: string;
}

// Press handler
export interface WithOnPress {
  onPress?: () => void;
}

// Common component props
export interface BaseComponentProps extends WithClassName, WithOnPress {
  testID?: string;
}

// Database stats
export interface DatabaseStats {
  routes: number;
  stops: number;
  patterns: number;
  metro_lines: number;
}
