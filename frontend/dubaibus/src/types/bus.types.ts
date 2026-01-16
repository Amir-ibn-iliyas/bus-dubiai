/**
 * Bus Types
 *
 * Type definitions for bus-related data
 */

// Basic bus route info (from list)
export interface BusRoute {
  route_id: string;
  bus_number: string;
  route_name: string;
  route_color: string;
}

// Single stop
export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_sequence?: number;
}

// Direction (Upward/Downward)
export interface RouteDirection {
  direction_id: number;
  direction_name: string; // "Upward" or "Downward"
  headsign: string;
  from: string;
  to: string;
  total_stops: number;
  stops: Stop[];
}

// Full bus details with directions
export interface BusDetails {
  route_id: string;
  bus_number: string;
  route_name: string;
  route_color: string;
  directions: RouteDirection[];
}

// Direction type for UI
export type DirectionType = 0 | 1;
export type DirectionName = "Upward" | "Downward";
