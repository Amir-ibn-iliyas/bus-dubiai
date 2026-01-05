const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit.db');

let db = null;

/**
 * Initialize database connection
 */
function getDb() {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Initialize database with tables (called by seed script)
 */
function initializeDb() {
  const writeDb = new Database(DB_PATH);
  
  // Create tables for routes, stops, trips, stop_times
  writeDb.exec(`
    -- Routes table (Bus and Metro lines)
    CREATE TABLE IF NOT EXISTS routes (
      route_id TEXT PRIMARY KEY,
      route_short_name TEXT,
      route_long_name TEXT,
      route_type INTEGER,
      route_color TEXT
    );

    -- Stops table (Bus stops and Metro stations)
    CREATE TABLE IF NOT EXISTS stops (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT,
      stop_lat REAL,
      stop_lon REAL,
      location_type INTEGER
    );

    -- Trips table (Individual journeys on a route)
    CREATE TABLE IF NOT EXISTS trips (
      trip_id TEXT PRIMARY KEY,
      route_id TEXT,
      service_id TEXT,
      trip_headsign TEXT,
      direction_id INTEGER,
      FOREIGN KEY (route_id) REFERENCES routes(route_id)
    );

    -- Stop times table (When each trip stops at each stop)
    CREATE TABLE IF NOT EXISTS stop_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id TEXT,
      stop_id TEXT,
      arrival_time TEXT,
      departure_time TEXT,
      stop_sequence INTEGER,
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
      FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
    );

    -- Create indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_routes_short_name ON routes(route_short_name);
    CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(route_type);
    CREATE INDEX IF NOT EXISTS idx_stops_name ON stops(stop_name);
    CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(route_id);
    CREATE INDEX IF NOT EXISTS idx_trips_direction ON trips(direction_id);
    CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON stop_times(trip_id);
    CREATE INDEX IF NOT EXISTS idx_stop_times_stop ON stop_times(stop_id);
    CREATE INDEX IF NOT EXISTS idx_stop_times_sequence ON stop_times(stop_sequence);
  `);

  console.log('✅ Database tables created successfully');
  writeDb.close();
}

/**
 * Route Types in GTFS:
 * 0 = Tram/Light Rail
 * 1 = Metro/Subway
 * 2 = Rail
 * 3 = Bus
 * 4 = Ferry
 */
const ROUTE_TYPES = {
  TRAM: 0,
  METRO: 1,
  RAIL: 2,
  BUS: 3,
  FERRY: 4
};

module.exports = {
  getDb,
  initializeDb,
  ROUTE_TYPES,
  DB_PATH
};
