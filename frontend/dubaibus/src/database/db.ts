/**
 * Dubai Transit Offline Database Service
 *
 * This module handles all database operations for the offline app.
 * The database is bundled with the app and works without internet.
 */

import * as SQLite from "expo-sqlite";
import { File, Directory, Paths } from "expo-file-system";
import { Asset } from "expo-asset";

// Database name
const DATABASE_NAME = "dubai_transit_offline.db";

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database
 * Copies the bundled database to the app's document directory if needed
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  // Create SQLite directory in document folder
  const sqliteDir = new Directory(Paths.document, "SQLite");
  const dbFile = new File(sqliteDir, DATABASE_NAME);

  // Check if database already exists and has content
  if (dbFile.exists && dbFile.size && dbFile.size > 0) {
    try {
      // Try to open existing database
      db = await SQLite.openDatabaseAsync(DATABASE_NAME);

      // Verify database has tables
      const result = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='routes'"
      );

      if (result && result.count > 0) {
        console.log("✅ Database opened successfully");
        return db;
      }
    } catch (e) {
      console.log("📦 Database needs to be recopied...");
    }
  }

  // Create SQLite directory if it doesn't exist
  if (!sqliteDir.exists) {
    await sqliteDir.create();
  }

  // Load the bundled database asset
  const asset = Asset.fromModule(
    require("../../assets/database/dubai_transit_offline.db")
  );
  await asset.downloadAsync();

  if (asset.localUri) {
    // Copy asset to SQLite directory
    const assetFile = new File(asset.localUri);
    await assetFile.copy(dbFile);
    console.log("✅ Database copied successfully");
  }

  // Open the database
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  console.log("✅ Database opened");

  return db;
}

/**
 * Get the database instance (must call initDatabase first)
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// ==========================================
// BUS QUERIES
// ==========================================

export interface BusRoute {
  route_id: string;
  bus_number: string;
  route_name: string;
  route_color: string;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_sequence?: number;
}

export interface RouteDirection {
  direction_id: number;
  direction_name: string;
  headsign: string;
  from: string;
  to: string;
  total_stops: number;
  stops: Stop[];
}

export interface BusDetails {
  route_id: string;
  bus_number: string;
  route_name: string;
  route_color: string;
  directions: RouteDirection[];
}

/**
 * Get all bus routes
 */
export async function getAllBuses(): Promise<BusRoute[]> {
  const database = getDatabase();
  const result = await database.getAllAsync<BusRoute>(`
    SELECT 
      route_id, 
      route_short_name as bus_number, 
      route_long_name as route_name, 
      route_color
    FROM routes 
    WHERE route_type = 3
    ORDER BY 
      CASE 
        WHEN route_short_name GLOB '[0-9]*' THEN CAST(route_short_name AS INTEGER)
        ELSE 999999
      END,
      route_short_name
  `);
  return result;
}

/**
 * Search buses by number
 */
export async function searchBuses(query: string): Promise<BusRoute[]> {
  const database = getDatabase();
  const result = await database.getAllAsync<BusRoute>(
    `
    SELECT 
      route_id, 
      route_short_name as bus_number, 
      route_long_name as route_name, 
      route_color
    FROM routes 
    WHERE route_type = 3 AND (
      route_short_name LIKE ? OR 
      route_short_name = ? OR
      route_long_name LIKE ?
    )
    ORDER BY 
      CASE 
        WHEN route_short_name = ? THEN 1
        WHEN route_short_name LIKE ? THEN 2
        ELSE 3
      END,
      route_short_name
    LIMIT 20
  `,
    [`%${query}%`, query, `%${query}%`, query, `${query}%`]
  );
  return result;
}

/**
 * Get bus details with all stops (up and down directions)
 */
export async function getBusDetails(
  busNumber: string
): Promise<BusDetails | null> {
  const database = getDatabase();

  // Get route info
  const route = await database.getFirstAsync<BusRoute>(
    `
    SELECT route_id, route_short_name as bus_number, route_long_name as route_name, route_color
    FROM routes 
    WHERE (route_short_name = ? OR route_id = ?) AND route_type = 3
  `,
    [busNumber, busNumber]
  );

  if (!route) {
    return null;
  }

  // Get patterns (directions)
  const patterns = await database.getAllAsync<{
    pattern_id: number;
    direction_id: number;
    headsign: string;
    total_stops: number;
  }>(
    `
    SELECT pattern_id, direction_id, headsign, total_stops
    FROM route_patterns 
    WHERE route_id = ?
    ORDER BY direction_id
  `,
    [route.route_id]
  );

  // Get stops for each direction
  const directions: RouteDirection[] = [];

  for (const pattern of patterns) {
    const stops = await database.getAllAsync<Stop>(
      `
      SELECT 
        ps.stop_sequence,
        s.stop_id,
        s.stop_name,
        s.stop_lat,
        s.stop_lon
      FROM pattern_stops ps
      JOIN stops s ON ps.stop_id = s.stop_id
      WHERE ps.pattern_id = ?
      ORDER BY ps.stop_sequence
    `,
      [pattern.pattern_id]
    );

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    directions.push({
      direction_id: pattern.direction_id,
      direction_name: pattern.direction_id === 0 ? "Upward" : "Downward",
      headsign:
        pattern.headsign || (lastStop ? `To ${lastStop.stop_name}` : ""),
      from: firstStop?.stop_name || "",
      to: lastStop?.stop_name || "",
      total_stops: stops.length,
      stops,
    });
  }

  return {
    ...route,
    directions,
  };
}

// ==========================================
// METRO QUERIES
// ==========================================

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

export interface MetroDetails {
  line_id: string;
  line_name: string;
  line_name_ar: string;
  line_color: string;
  route_id: string;
  directions: RouteDirection[];
}

/**
 * Get all metro lines
 */
export async function getAllMetroLines(): Promise<MetroLine[]> {
  const database = getDatabase();

  const lines = await database.getAllAsync<{
    line_id: string;
    line_name: string;
    line_name_ar: string;
    line_color: string;
    route_id: string;
  }>(`
    SELECT line_id, line_name, line_name_ar, line_color, route_id
    FROM metro_lines
    ORDER BY line_name
  `);

  // Get terminal stations for each line
  const result: MetroLine[] = [];

  for (const line of lines) {
    const pattern = await database.getFirstAsync<{
      first_stop_id: string;
      last_stop_id: string;
      total_stops: number;
    }>(
      `
      SELECT first_stop_id, last_stop_id, total_stops
      FROM route_patterns
      WHERE route_id = ? AND direction_id = 0
    `,
      [line.route_id]
    );

    let from_station = "";
    let to_station = "";
    let total_stations = 0;

    if (pattern) {
      const firstStop = await database.getFirstAsync<{ stop_name: string }>(
        "SELECT stop_name FROM stops WHERE stop_id = ?",
        [pattern.first_stop_id]
      );
      const lastStop = await database.getFirstAsync<{ stop_name: string }>(
        "SELECT stop_name FROM stops WHERE stop_id = ?",
        [pattern.last_stop_id]
      );
      from_station = firstStop?.stop_name || "";
      to_station = lastStop?.stop_name || "";
      total_stations = pattern.total_stops;
    }

    result.push({
      ...line,
      total_stations,
      from_station,
      to_station,
    });
  }

  return result;
}

/**
 * Get metro line details with all stations
 */
export async function getMetroDetails(
  lineId: string
): Promise<MetroDetails | null> {
  const database = getDatabase();

  // Get line info
  const line = await database.getFirstAsync<{
    line_id: string;
    line_name: string;
    line_name_ar: string;
    line_color: string;
    route_id: string;
  }>(
    `
    SELECT line_id, line_name, line_name_ar, line_color, route_id
    FROM metro_lines
    WHERE line_id = ? OR route_id = ? OR LOWER(line_name) LIKE LOWER(?)
  `,
    [lineId, lineId, `%${lineId}%`]
  );

  if (!line) {
    return null;
  }

  // Get patterns (directions)
  const patterns = await database.getAllAsync<{
    pattern_id: number;
    direction_id: number;
    headsign: string;
    total_stops: number;
  }>(
    `
    SELECT pattern_id, direction_id, headsign, total_stops
    FROM route_patterns 
    WHERE route_id = ?
    ORDER BY direction_id
  `,
    [line.route_id]
  );

  // Get stations for each direction
  const directions: RouteDirection[] = [];

  for (const pattern of patterns) {
    const stations = await database.getAllAsync<Stop>(
      `
      SELECT 
        ps.stop_sequence,
        s.stop_id,
        s.stop_name,
        s.stop_lat,
        s.stop_lon
      FROM pattern_stops ps
      JOIN stops s ON ps.stop_id = s.stop_id
      WHERE ps.pattern_id = ?
      ORDER BY ps.stop_sequence
    `,
      [pattern.pattern_id]
    );

    const firstStation = stations[0];
    const lastStation = stations[stations.length - 1];

    directions.push({
      direction_id: pattern.direction_id,
      direction_name: pattern.direction_id === 0 ? "Upward" : "Downward",
      headsign:
        pattern.headsign || (lastStation ? `To ${lastStation.stop_name}` : ""),
      from: firstStation?.stop_name || "",
      to: lastStation?.stop_name || "",
      total_stops: stations.length,
      stops: stations,
    });
  }

  return {
    ...line,
    directions,
  };
}

// ==========================================
// SEARCH / JOURNEY PLANNER QUERIES
// ==========================================

/**
 * Search stops by name
 */
export async function searchStops(query: string): Promise<Stop[]> {
  const database = getDatabase();

  const words = query.trim().toLowerCase().split(/\s+/);
  const fuzzyPattern = "%" + words.join("%") + "%";

  const result = await database.getAllAsync<Stop & { location_type: number }>(
    `
    SELECT stop_id, stop_name, stop_lat, stop_lon, location_type
    FROM stops 
    WHERE LOWER(stop_name) LIKE ?
    ORDER BY LENGTH(stop_name)
    LIMIT 20
  `,
    [fuzzyPattern]
  );

  return result;
}

/**
 * Get all routes serving a specific stop
 */
export async function getRoutesAtStop(stopId: string): Promise<{
  stop: Stop;
  routes: Array<{
    route_id: string;
    route_name: string;
    transport_type: string;
    color: string;
    headsign: string;
  }>;
}> {
  const database = getDatabase();

  const stop = await database.getFirstAsync<Stop>(
    "SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?",
    [stopId]
  );

  if (!stop) {
    throw new Error("Stop not found");
  }

  const routes = await database.getAllAsync<{
    route_id: string;
    route_short_name: string;
    route_type: number;
    route_color: string;
    headsign: string;
  }>(
    `
    SELECT DISTINCT 
      r.route_id,
      r.route_short_name,
      r.route_type,
      r.route_color,
      rp.headsign
    FROM stop_routes sr
    JOIN routes r ON sr.route_id = r.route_id
    LEFT JOIN route_patterns rp ON r.route_id = rp.route_id AND sr.direction_id = rp.direction_id
    WHERE sr.stop_id = ?
    ORDER BY r.route_type, r.route_short_name
  `,
    [stopId]
  );

  return {
    stop,
    routes: routes.map((r) => ({
      route_id: r.route_id,
      route_name: r.route_short_name,
      transport_type: r.route_type === 1 ? "Metro" : "Bus",
      color: r.route_color,
      headsign: r.headsign || "",
    })),
  };
}

// ==========================================
// ROUTE FINDING
// ==========================================

export interface FoundRoute {
  type: "direct" | "transfer";
  route_id: string;
  route_name: string;
  transport_type: "Bus" | "Metro";
  color: string;
  from_stop: string;
  to_stop: string;
  stops_between: number;
  direction: string;
}

/**
 * Find direct routes between two stops
 */
export async function findDirectRoutes(
  fromStopId: string,
  toStopId: string
): Promise<FoundRoute[]> {
  const database = getDatabase();

  // Find routes that pass through both stops
  const routes = await database.getAllAsync<{
    route_id: string;
    route_short_name: string;
    route_type: number;
    route_color: string;
    pattern_id: number;
    direction_id: number;
    headsign: string;
    from_seq: number;
    to_seq: number;
  }>(
    `
    SELECT DISTINCT
      r.route_id,
      r.route_short_name,
      r.route_type,
      r.route_color,
      ps1.pattern_id,
      rp.direction_id,
      rp.headsign,
      ps1.stop_sequence as from_seq,
      ps2.stop_sequence as to_seq
    FROM pattern_stops ps1
    JOIN pattern_stops ps2 ON ps1.pattern_id = ps2.pattern_id
    JOIN route_patterns rp ON ps1.pattern_id = rp.pattern_id
    JOIN routes r ON rp.route_id = r.route_id
    WHERE ps1.stop_id = ?
      AND ps2.stop_id = ?
      AND ps1.stop_sequence < ps2.stop_sequence
    ORDER BY (ps2.stop_sequence - ps1.stop_sequence) ASC
    LIMIT 10
  `,
    [fromStopId, toStopId]
  );

  // Get stop names
  const fromStop = await database.getFirstAsync<{ stop_name: string }>(
    "SELECT stop_name FROM stops WHERE stop_id = ?",
    [fromStopId]
  );
  const toStop = await database.getFirstAsync<{ stop_name: string }>(
    "SELECT stop_name FROM stops WHERE stop_id = ?",
    [toStopId]
  );

  return routes.map((r) => ({
    type: "direct" as const,
    route_id: r.route_id,
    route_name: r.route_short_name,
    transport_type: (r.route_type === 1 ? "Metro" : "Bus") as "Bus" | "Metro",
    color: r.route_color,
    from_stop: fromStop?.stop_name || "",
    to_stop: toStop?.stop_name || "",
    stops_between: r.to_seq - r.from_seq,
    direction: r.headsign || (r.direction_id === 0 ? "Upward" : "Downward"),
  }));
}

/**
 * Find routes with a single transfer between two stops
 */
export async function findTransferRoutes(
  fromStopId: string,
  toStopId: string
): Promise<FoundRoute[]> {
  const database = getDatabase();

  // This query finds a transfer stop 'X' such that:
  // 1. Route A goes from 'fromStop' to 'X'
  // 2. Route B goes from 'X' to 'toStop'
  // 3. The transfer happens at the same stop ID
  const routes = await database.getAllAsync<{
    r1_id: string;
    r1_name: string;
    r1_type: number;
    r1_color: string;
    r1_headsign: string;
    transfer_stop_id: string;
    transfer_stop_name: string;
    r2_id: string;
    r2_name: string;
    r2_type: number;
    r2_color: string;
    r2_headsign: string;
  }>(
    `
    SELECT DISTINCT
      r1.route_id as r1_id, r1.route_short_name as r1_name, r1.route_type as r1_type, r1.route_color as r1_color, rp1.headsign as r1_headsign,
      s_trans.stop_id as transfer_stop_id, s_trans.stop_name as transfer_stop_name,
      r2.route_id as r2_id, r2.route_short_name as r2_name, r2.route_type as r2_type, r2.route_color as r2_color, rp2.headsign as r2_headsign
    FROM pattern_stops ps1_start
    JOIN pattern_stops ps1_trans ON ps1_start.pattern_id = ps1_trans.pattern_id
    JOIN route_patterns rp1 ON ps1_start.pattern_id = rp1.pattern_id
    JOIN routes r1 ON rp1.route_id = r1.route_id
    
    JOIN pattern_stops ps2_trans ON ps1_trans.stop_id = ps2_trans.stop_id
    JOIN pattern_stops ps2_end ON ps2_trans.pattern_id = ps2_end.pattern_id
    JOIN route_patterns rp2 ON ps2_trans.pattern_id = rp2.pattern_id
    JOIN routes r2 ON rp2.route_id = r2.route_id
    
    JOIN stops s_trans ON ps1_trans.stop_id = s_trans.stop_id
    
    WHERE ps1_start.stop_id = ?
      AND ps2_end.stop_id = ?
      AND ps1_start.stop_sequence < ps1_trans.stop_sequence
      AND ps2_trans.stop_sequence < ps2_end.stop_sequence
      AND r1.route_id != r2.route_id
    LIMIT 5
    `,
    [fromStopId, toStopId]
  );

  return routes.map(
    (r) =>
      ({
        type: "transfer" as const,
        route_id: r.r1_id,
        route_name: `${r.r1_name} ➔ ${r.r2_name}`,
        transport_type: (r.r1_type === 1 ? "Metro" : "Bus") as "Bus" | "Metro",
        color: r.r1_color,
        from_stop: "", // Not used in this simplified summary
        to_stop: "",
        stops_between: 0,
        direction: `Transfer at ${r.transfer_stop_name}`,
        // Adding extra fields for UI display of transfers
        transfer_at: r.transfer_stop_name,
        leg2_name: r.r2_name,
        leg2_color: r.r2_color,
      } as any)
  );
}

// ==========================================
// DATABASE INFO
// ==========================================

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  routes: number;
  stops: number;
  patterns: number;
  metro_lines: number;
}> {
  const database = getDatabase();

  const routes = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM routes"
  );
  const stops = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM stops"
  );
  const patterns = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM route_patterns"
  );
  const metro_lines = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM metro_lines"
  );

  return {
    routes: routes?.count || 0,
    stops: stops?.count || 0,
    patterns: patterns?.count || 0,
    metro_lines: metro_lines?.count || 0,
  };
}
