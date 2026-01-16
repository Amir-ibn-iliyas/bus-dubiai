/**
 * Journey Types
 *
 * Type definitions for journey planner
 */

import type { Stop } from "./bus.types";

// Search result stop
export interface SearchStop extends Stop {
  type?: "Stop" | "Station";
}

// Route leg (one segment of journey)
export interface RouteLeg {
  route_id: string;
  route_name: string;
  transport_type: "Bus" | "Metro";
  color: string;
  from: string;
  to: string;
}

// Direct route result
export interface DirectRouteResult {
  type: "direct";
  route_id: string;
  route_name: string;
  transport_type: "Bus" | "Metro";
  color: string;
  headsign: string;
  from_stop: string;
  to_stop: string;
  stops_count: number;
  stops: Stop[];
}

// Transfer route result
export interface TransferRouteResult {
  type: "transfer";
  legs: 2;
  leg1: RouteLeg;
  transfer_at: {
    stop_id: string;
    stop_name: string;
  };
  leg2: RouteLeg;
}

// Combined journey result
export type JourneyResult = DirectRouteResult | TransferRouteResult;

// Journey search state
export interface JourneySearchState {
  fromStop: SearchStop | null;
  toStop: SearchStop | null;
  results: JourneyResult[];
  isLoading: boolean;
  error: string | null;
}
