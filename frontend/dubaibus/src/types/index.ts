/**
 * Types Index
 *
 * Single import point for all types
 * Usage: import { BusRoute, MetroLine, Stop } from '@/types';
 */

// Bus types
export type {
  BusRoute,
  Stop,
  RouteDirection,
  BusDetails,
  DirectionType,
  DirectionName,
} from "./bus.types";

// Metro types
export type { MetroLine, MetroDetails, MetroLineColor } from "./metro.types";
export { metroLineColorMap } from "./metro.types";

// Journey types
export type {
  SearchStop,
  RouteLeg,
  DirectRouteResult,
  TransferRouteResult,
  JourneyResult,
  JourneySearchState,
} from "./journey.types";

// Common types
export type {
  LoadingState,
  WithChildren,
  WithClassName,
  WithOnPress,
  BaseComponentProps,
  DatabaseStats,
} from "./common.types";
