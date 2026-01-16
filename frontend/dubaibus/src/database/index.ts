/**
 * Database module exports
 *
 * Usage: import { getAllBuses, searchBuses } from '@/database';
 */

// Database initialization
export { initDatabase, getDatabase, getDatabaseStats } from "./db";

// Bus functions
export { getAllBuses, searchBuses, getBusDetails } from "./db";

// Metro functions
export { getAllMetroLines, getMetroDetails } from "./db";

// Search functions
export { searchStops, getRoutesAtStop } from "./db";

// Route finding
export { findDirectRoutes, findTransferRoutes, type FoundRoute } from "./db";

// Note: Types are exported from @/types, not here
// This avoids type conflicts
