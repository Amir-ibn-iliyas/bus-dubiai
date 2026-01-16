/**
 * Optimized Offline Database Schema
 * Designed for small app size (~3-5 MB instead of 274 MB)
 * 
 * This schema uses route patterns instead of individual trips
 * Perfect for offline journey planning without real-time schedules
 */

const Database = require('better-sqlite3');
const path = require('path');

const OFFLINE_DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit_offline.db');

let db = null;

/**
 * Route Types in GTFS
 */
const ROUTE_TYPES = {
  TRAM: 0,
  METRO: 1,
  RAIL: 2,
  BUS: 3,
  FERRY: 4
};

/**
 * Get readonly database connection
 */
function getDb() {
  if (!db) {
    db = new Database(OFFLINE_DB_PATH, { readonly: true });
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Initialize offline database with optimized tables
 */
function initializeOfflineDb() {
  const writeDb = new Database(OFFLINE_DB_PATH);
  
  writeDb.exec(`
    -- =====================================================
    -- ROUTES TABLE
    -- All bus and metro routes (compact)
    -- =====================================================
    CREATE TABLE IF NOT EXISTS routes (
      route_id TEXT PRIMARY KEY,
      route_short_name TEXT NOT NULL,    -- "8", "X28", "MRed"
      route_long_name TEXT,               -- "Al Barsha to Deira"
      route_type INTEGER NOT NULL,        -- 1=Metro, 3=Bus
      route_color TEXT                    -- "E21836" (hex)
    );

    -- =====================================================
    -- STOPS TABLE  
    -- All bus stops and metro stations
    -- =====================================================
    CREATE TABLE IF NOT EXISTS stops (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT NOT NULL,
      stop_name_ar TEXT,                  -- Arabic name (optional)
      stop_lat REAL NOT NULL,
      stop_lon REAL NOT NULL,
      location_type INTEGER DEFAULT 0     -- 0=stop, 1=station
    );

    -- =====================================================
    -- ROUTE PATTERNS TABLE
    -- Each route has 2 patterns: Upward (0) and Downward (1)
    -- =====================================================
    CREATE TABLE IF NOT EXISTS route_patterns (
      pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id TEXT NOT NULL,
      direction_id INTEGER NOT NULL,      -- 0=Upward, 1=Downward
      headsign TEXT,                      -- "To UAE Exchange"
      first_stop_id TEXT,                 -- Starting stop
      last_stop_id TEXT,                  -- Ending stop
      total_stops INTEGER,
      FOREIGN KEY (route_id) REFERENCES routes(route_id),
      UNIQUE(route_id, direction_id)
    );

    -- =====================================================
    -- PATTERN STOPS TABLE
    -- Which stops belong to each pattern, in order
    -- =====================================================
    CREATE TABLE IF NOT EXISTS pattern_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_id INTEGER NOT NULL,
      stop_id TEXT NOT NULL,
      stop_sequence INTEGER NOT NULL,
      FOREIGN KEY (pattern_id) REFERENCES route_patterns(pattern_id),
      FOREIGN KEY (stop_id) REFERENCES stops(stop_id),
      UNIQUE(pattern_id, stop_sequence)
    );

    -- =====================================================
    -- TRANSFERS TABLE
    -- Where passengers can transfer between routes
    -- =====================================================
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_stop_id TEXT NOT NULL,
      to_stop_id TEXT NOT NULL,
      transfer_type INTEGER,              -- 0=recommended, 2=timed, 3=not possible
      min_transfer_time INTEGER,          -- seconds
      FOREIGN KEY (from_stop_id) REFERENCES stops(stop_id),
      FOREIGN KEY (to_stop_id) REFERENCES stops(stop_id)
    );

    -- =====================================================
    -- STOP ROUTES TABLE (Denormalized for fast lookup)
    -- Which routes serve each stop
    -- =====================================================
    CREATE TABLE IF NOT EXISTS stop_routes (
      stop_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      direction_id INTEGER NOT NULL,
      PRIMARY KEY (stop_id, route_id, direction_id),
      FOREIGN KEY (stop_id) REFERENCES stops(stop_id),
      FOREIGN KEY (route_id) REFERENCES routes(route_id)
    );

    -- =====================================================
    -- METRO LINES TABLE (Special table for metro display)
    -- =====================================================
    CREATE TABLE IF NOT EXISTS metro_lines (
      line_id TEXT PRIMARY KEY,
      line_name TEXT NOT NULL,            -- "Red Line"
      line_name_ar TEXT,                  -- Arabic name
      line_color TEXT NOT NULL,           -- "E21836"
      route_id TEXT NOT NULL,             -- Links to routes table
      FOREIGN KEY (route_id) REFERENCES routes(route_id)
    );

    -- =====================================================
    -- INDEXES for fast queries
    -- =====================================================
    
    -- Route lookups
    CREATE INDEX IF NOT EXISTS idx_routes_short_name ON routes(route_short_name);
    CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(route_type);
    
    -- Stop lookups
    CREATE INDEX IF NOT EXISTS idx_stops_name ON stops(stop_name);
    CREATE INDEX IF NOT EXISTS idx_stops_location ON stops(stop_lat, stop_lon);
    
    -- Pattern lookups
    CREATE INDEX IF NOT EXISTS idx_patterns_route ON route_patterns(route_id);
    CREATE INDEX IF NOT EXISTS idx_patterns_direction ON route_patterns(route_id, direction_id);
    
    -- Pattern stops lookups
    CREATE INDEX IF NOT EXISTS idx_pattern_stops_pattern ON pattern_stops(pattern_id);
    CREATE INDEX IF NOT EXISTS idx_pattern_stops_stop ON pattern_stops(stop_id);
    CREATE INDEX IF NOT EXISTS idx_pattern_stops_sequence ON pattern_stops(pattern_id, stop_sequence);
    
    -- Stop routes lookups (for journey planning)
    CREATE INDEX IF NOT EXISTS idx_stop_routes_stop ON stop_routes(stop_id);
    CREATE INDEX IF NOT EXISTS idx_stop_routes_route ON stop_routes(route_id);
    
    -- Transfer lookups
    CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_stop_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_stop_id);
  `);

  console.log('✅ Offline database tables created successfully');
  writeDb.close();
}

module.exports = {
  getDb,
  initializeOfflineDb,
  ROUTE_TYPES,
  OFFLINE_DB_PATH
};
