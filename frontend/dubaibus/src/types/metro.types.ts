/**
 * Metro Types
 *
 * Type definitions for metro-related data
 */

import type { RouteDirection } from "./bus.types";

// Metro line info (from list)
export interface MetroLine {
  line_id: string;
  line_name: string;
  line_name_ar: string;
  line_color: string;
  route_id: string;
  total_stations: number;
  from_station: string;
  to_station: string;
}

// Full metro line details with directions
export interface MetroDetails {
  line_id: string;
  line_name: string;
  line_name_ar: string;
  line_color: string;
  route_id: string;
  directions: RouteDirection[];
}

// Metro line color keys
export type MetroLineColor = "red" | "green" | "blue";

// Mapping metro line names to colors
export const metroLineColorMap: Record<string, MetroLineColor> = {
  "Red Line": "red",
  "Green Line": "green",
  "Route 2020": "blue",
};
