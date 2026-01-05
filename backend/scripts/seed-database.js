/**
 * GTFS Data Seeder Script
 * Downloads RTA GTFS data and populates SQLite database
 * 
 * Usage: node scripts/seed-database.js
 * 
 * Note: For now, we'll use sample data. 
 * When you have real GTFS data, replace the sample data section.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit.db');

// Ensure db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Delete old database if exists
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('🗑️  Old database deleted');
}

const db = new Database(DB_PATH);

console.log('🚀 Starting Dubai Transit Database Seeder...\n');

// Create tables
db.exec(`
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

console.log('✅ Tables created\n');

// ============================================
// SAMPLE DATA (Replace with real GTFS later)
// ============================================

// Route Types: 1 = Metro, 3 = Bus
const sampleRoutes = [
  // Metro Lines
  { route_id: 'MRed', route_short_name: 'Red Line', route_long_name: 'Dubai Metro Red Line', route_type: 1, route_color: 'E21836' },
  { route_id: 'MGreen', route_short_name: 'Green Line', route_long_name: 'Dubai Metro Green Line', route_type: 1, route_color: '4CAF50' },
  
  // Popular Bus Routes
  { route_id: 'B_X28', route_short_name: 'X28', route_long_name: 'Gold Souq to Jebel Ali', route_type: 3, route_color: 'FF5722' },
  { route_id: 'B_8', route_short_name: '8', route_long_name: 'Al Ghubaiba to Rashidiya', route_type: 3, route_color: 'FF5722' },
  { route_id: 'B_F11', route_short_name: 'F11', route_long_name: 'Dubai Marina to Mall of Emirates', route_type: 3, route_color: 'FF5722' },
  { route_id: 'B_C01', route_short_name: 'C01', route_long_name: 'Deira City Centre Circular', route_type: 3, route_color: 'FF5722' },
  { route_id: 'B_27', route_short_name: '27', route_long_name: 'Al Quoz to Satwa', route_type: 3, route_color: 'FF5722' },
  { route_id: 'B_E100', route_short_name: 'E100', route_long_name: 'Dubai to Abu Dhabi Express', route_type: 3, route_color: '9C27B0' },
  { route_id: 'B_E101', route_short_name: 'E101', route_long_name: 'Ibn Battuta to Abu Dhabi', route_type: 3, route_color: '9C27B0' },
];

// Sample Stops (Mix of Metro Stations and Bus Stops)
const sampleStops = [
  // Metro Stations - Red Line
  { stop_id: 'M_RAS', stop_name: 'Rashidiya Metro Station', stop_lat: 25.2356, stop_lon: 55.3891, location_type: 1 },
  { stop_id: 'M_AIR1', stop_name: 'Airport Terminal 1 Metro', stop_lat: 25.2528, stop_lon: 55.3646, location_type: 1 },
  { stop_id: 'M_AIR3', stop_name: 'Airport Terminal 3 Metro', stop_lat: 25.2469, stop_lon: 55.3528, location_type: 1 },
  { stop_id: 'M_DCC', stop_name: 'Deira City Centre Metro', stop_lat: 25.2535, stop_lon: 55.3313, location_type: 1 },
  { stop_id: 'M_UNI', stop_name: 'Union Metro Station', stop_lat: 25.2667, stop_lon: 55.3183, location_type: 1 },
  { stop_id: 'M_BKM', stop_name: 'BurJuman Metro Station', stop_lat: 25.2552, stop_lon: 55.3030, location_type: 1 },
  { stop_id: 'M_WAT', stop_name: 'ADCB Metro (World Trade Centre)', stop_lat: 25.2278, stop_lon: 55.2867, location_type: 1 },
  { stop_id: 'M_FIN', stop_name: 'Financial Centre Metro', stop_lat: 25.2117, stop_lon: 55.2753, location_type: 1 },
  { stop_id: 'M_BUR', stop_name: 'Burj Khalifa Metro Station', stop_lat: 25.2003, stop_lon: 55.2694, location_type: 1 },
  { stop_id: 'M_MOE', stop_name: 'Mall of Emirates Metro', stop_lat: 25.1199, stop_lon: 55.2001, location_type: 1 },
  { stop_id: 'M_MAR', stop_name: 'Dubai Marina Metro', stop_lat: 25.0884, stop_lon: 55.1468, location_type: 1 },
  { stop_id: 'M_IBN', stop_name: 'Ibn Battuta Metro', stop_lat: 25.0456, stop_lon: 55.1181, location_type: 1 },
  { stop_id: 'M_JEB', stop_name: 'Jebel Ali Metro', stop_lat: 25.0345, stop_lon: 55.0954, location_type: 1 },
  { stop_id: 'M_UAE', stop_name: 'UAE Exchange Metro', stop_lat: 25.0274, stop_lon: 55.0861, location_type: 1 },
  
  // Metro Stations - Green Line
  { stop_id: 'M_ETI', stop_name: 'Etisalat Metro Station', stop_lat: 25.2659, stop_lon: 55.3085, location_type: 1 },
  { stop_id: 'M_GLD', stop_name: 'Al Fahidi Metro (Gold Souq)', stop_lat: 25.2571, stop_lon: 55.2953, location_type: 1 },
  { stop_id: 'M_RIG', stop_name: 'Al Rigga Metro Station', stop_lat: 25.2684, stop_lon: 55.3152, location_type: 1 },
  { stop_id: 'M_ABU', stop_name: 'Abu Hail Metro Station', stop_lat: 25.2754, stop_lon: 55.3478, location_type: 1 },
  { stop_id: 'M_QIY', stop_name: 'Al Qiyadah Metro Station', stop_lat: 25.2814, stop_lon: 55.3576, location_type: 1 },
  { stop_id: 'M_CRK', stop_name: 'Creek Metro Station', stop_lat: 25.2889, stop_lon: 55.3654, location_type: 1 },
  
  // Bus Stops
  { stop_id: 'B_GHU', stop_name: 'Al Ghubaiba Bus Station', stop_lat: 25.2621, stop_lon: 55.2867, location_type: 0 },
  { stop_id: 'B_GSOUQ', stop_name: 'Gold Souq Bus Station', stop_lat: 25.2695, stop_lon: 55.2950, location_type: 0 },
  { stop_id: 'B_DEIRA', stop_name: 'Deira Fish Market', stop_lat: 25.2754, stop_lon: 55.3001, location_type: 0 },
  { stop_id: 'B_SAT', stop_name: 'Satwa Bus Stop', stop_lat: 25.2267, stop_lon: 55.2644, location_type: 0 },
  { stop_id: 'B_QUO', stop_name: 'Al Quoz Bus Station', stop_lat: 25.1451, stop_lon: 55.2312, location_type: 0 },
  { stop_id: 'B_JLT', stop_name: 'JLT Metro Bus Stop', stop_lat: 25.0771, stop_lon: 55.1456, location_type: 0 },
  { stop_id: 'B_ABU', stop_name: 'Abu Dhabi Central Bus Station', stop_lat: 24.4875, stop_lon: 54.3773, location_type: 0 },
];

// Sample Trips (Each route has 2 directions)
const sampleTrips = [
  // Red Line Metro
  { trip_id: 'MRed_0_1', route_id: 'MRed', service_id: 'WEEKDAY', trip_headsign: 'Towards UAE Exchange', direction_id: 0 },
  { trip_id: 'MRed_1_1', route_id: 'MRed', service_id: 'WEEKDAY', trip_headsign: 'Towards Rashidiya', direction_id: 1 },
  
  // Green Line Metro
  { trip_id: 'MGreen_0_1', route_id: 'MGreen', service_id: 'WEEKDAY', trip_headsign: 'Towards Creek', direction_id: 0 },
  { trip_id: 'MGreen_1_1', route_id: 'MGreen', service_id: 'WEEKDAY', trip_headsign: 'Towards Etisalat', direction_id: 1 },
  
  // Bus X28
  { trip_id: 'X28_0_1', route_id: 'B_X28', service_id: 'WEEKDAY', trip_headsign: 'Towards Jebel Ali', direction_id: 0 },
  { trip_id: 'X28_1_1', route_id: 'B_X28', service_id: 'WEEKDAY', trip_headsign: 'Towards Gold Souq', direction_id: 1 },
  
  // Bus 8
  { trip_id: 'B8_0_1', route_id: 'B_8', service_id: 'WEEKDAY', trip_headsign: 'Towards Rashidiya', direction_id: 0 },
  { trip_id: 'B8_1_1', route_id: 'B_8', service_id: 'WEEKDAY', trip_headsign: 'Towards Al Ghubaiba', direction_id: 1 },
  
  // Bus F11
  { trip_id: 'F11_0_1', route_id: 'B_F11', service_id: 'WEEKDAY', trip_headsign: 'Towards Mall of Emirates', direction_id: 0 },
  { trip_id: 'F11_1_1', route_id: 'B_F11', service_id: 'WEEKDAY', trip_headsign: 'Towards Dubai Marina', direction_id: 1 },
  
  // Bus E100 (Express to Abu Dhabi)
  { trip_id: 'E100_0_1', route_id: 'B_E100', service_id: 'WEEKDAY', trip_headsign: 'Towards Abu Dhabi', direction_id: 0 },
  { trip_id: 'E100_1_1', route_id: 'B_E100', service_id: 'WEEKDAY', trip_headsign: 'Towards Dubai', direction_id: 1 },
];

// Sample Stop Times (Connecting trips to stops in sequence)
const sampleStopTimes = [
  // Red Line Metro - Direction 0 (Rashidiya to UAE Exchange)
  { trip_id: 'MRed_0_1', stop_id: 'M_RAS', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'MRed_0_1', stop_id: 'M_AIR1', arrival_time: '06:05:00', stop_sequence: 2 },
  { trip_id: 'MRed_0_1', stop_id: 'M_AIR3', arrival_time: '06:08:00', stop_sequence: 3 },
  { trip_id: 'MRed_0_1', stop_id: 'M_DCC', arrival_time: '06:15:00', stop_sequence: 4 },
  { trip_id: 'MRed_0_1', stop_id: 'M_UNI', arrival_time: '06:20:00', stop_sequence: 5 },
  { trip_id: 'MRed_0_1', stop_id: 'M_BKM', arrival_time: '06:25:00', stop_sequence: 6 },
  { trip_id: 'MRed_0_1', stop_id: 'M_WAT', arrival_time: '06:32:00', stop_sequence: 7 },
  { trip_id: 'MRed_0_1', stop_id: 'M_FIN', arrival_time: '06:36:00', stop_sequence: 8 },
  { trip_id: 'MRed_0_1', stop_id: 'M_BUR', arrival_time: '06:40:00', stop_sequence: 9 },
  { trip_id: 'MRed_0_1', stop_id: 'M_MOE', arrival_time: '06:55:00', stop_sequence: 10 },
  { trip_id: 'MRed_0_1', stop_id: 'M_MAR', arrival_time: '07:05:00', stop_sequence: 11 },
  { trip_id: 'MRed_0_1', stop_id: 'M_IBN', arrival_time: '07:15:00', stop_sequence: 12 },
  { trip_id: 'MRed_0_1', stop_id: 'M_JEB', arrival_time: '07:20:00', stop_sequence: 13 },
  { trip_id: 'MRed_0_1', stop_id: 'M_UAE', arrival_time: '07:25:00', stop_sequence: 14 },
  
  // Red Line Metro - Direction 1 (UAE Exchange to Rashidiya)
  { trip_id: 'MRed_1_1', stop_id: 'M_UAE', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'MRed_1_1', stop_id: 'M_JEB', arrival_time: '06:05:00', stop_sequence: 2 },
  { trip_id: 'MRed_1_1', stop_id: 'M_IBN', arrival_time: '06:10:00', stop_sequence: 3 },
  { trip_id: 'MRed_1_1', stop_id: 'M_MAR', arrival_time: '06:20:00', stop_sequence: 4 },
  { trip_id: 'MRed_1_1', stop_id: 'M_MOE', arrival_time: '06:30:00', stop_sequence: 5 },
  { trip_id: 'MRed_1_1', stop_id: 'M_BUR', arrival_time: '06:45:00', stop_sequence: 6 },
  { trip_id: 'MRed_1_1', stop_id: 'M_FIN', arrival_time: '06:49:00', stop_sequence: 7 },
  { trip_id: 'MRed_1_1', stop_id: 'M_WAT', arrival_time: '06:53:00', stop_sequence: 8 },
  { trip_id: 'MRed_1_1', stop_id: 'M_BKM', arrival_time: '07:00:00', stop_sequence: 9 },
  { trip_id: 'MRed_1_1', stop_id: 'M_UNI', arrival_time: '07:05:00', stop_sequence: 10 },
  { trip_id: 'MRed_1_1', stop_id: 'M_DCC', arrival_time: '07:10:00', stop_sequence: 11 },
  { trip_id: 'MRed_1_1', stop_id: 'M_AIR3', arrival_time: '07:17:00', stop_sequence: 12 },
  { trip_id: 'MRed_1_1', stop_id: 'M_AIR1', arrival_time: '07:20:00', stop_sequence: 13 },
  { trip_id: 'MRed_1_1', stop_id: 'M_RAS', arrival_time: '07:25:00', stop_sequence: 14 },
  
  // Green Line Metro - Direction 0 (Etisalat to Creek)
  { trip_id: 'MGreen_0_1', stop_id: 'M_ETI', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'MGreen_0_1', stop_id: 'M_UNI', arrival_time: '06:05:00', stop_sequence: 2 },
  { trip_id: 'MGreen_0_1', stop_id: 'M_RIG', arrival_time: '06:08:00', stop_sequence: 3 },
  { trip_id: 'MGreen_0_1', stop_id: 'M_BKM', arrival_time: '06:12:00', stop_sequence: 4 },
  { trip_id: 'MGreen_0_1', stop_id: 'M_GLD', arrival_time: '06:16:00', stop_sequence: 5 },
  { trip_id: 'MGreen_0_1', stop_id: 'M_ABU', arrival_time: '06:22:00', stop_sequence: 6 },
  { trip_id: 'MGreen_0_1', stop_id: 'M_QIY', arrival_time: '06:26:00', stop_sequence: 7 },
  { trip_id: 'MGreen_0_1', stop_id: 'M_CRK', arrival_time: '06:30:00', stop_sequence: 8 },
  
  // Bus X28 - Direction 0 (Gold Souq to Jebel Ali)
  { trip_id: 'X28_0_1', stop_id: 'B_GSOUQ', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'X28_0_1', stop_id: 'M_GLD', arrival_time: '06:05:00', stop_sequence: 2 },
  { trip_id: 'X28_0_1', stop_id: 'M_BKM', arrival_time: '06:12:00', stop_sequence: 3 },
  { trip_id: 'X28_0_1', stop_id: 'M_WAT', arrival_time: '06:22:00', stop_sequence: 4 },
  { trip_id: 'X28_0_1', stop_id: 'M_BUR', arrival_time: '06:30:00', stop_sequence: 5 },
  { trip_id: 'X28_0_1', stop_id: 'M_MOE', arrival_time: '06:45:00', stop_sequence: 6 },
  { trip_id: 'X28_0_1', stop_id: 'B_JLT', arrival_time: '06:55:00', stop_sequence: 7 },
  { trip_id: 'X28_0_1', stop_id: 'M_IBN', arrival_time: '07:05:00', stop_sequence: 8 },
  { trip_id: 'X28_0_1', stop_id: 'M_JEB', arrival_time: '07:15:00', stop_sequence: 9 },
  
  // Bus X28 - Direction 1 (Jebel Ali to Gold Souq)
  { trip_id: 'X28_1_1', stop_id: 'M_JEB', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'X28_1_1', stop_id: 'M_IBN', arrival_time: '06:10:00', stop_sequence: 2 },
  { trip_id: 'X28_1_1', stop_id: 'B_JLT', arrival_time: '06:20:00', stop_sequence: 3 },
  { trip_id: 'X28_1_1', stop_id: 'M_MOE', arrival_time: '06:30:00', stop_sequence: 4 },
  { trip_id: 'X28_1_1', stop_id: 'M_BUR', arrival_time: '06:45:00', stop_sequence: 5 },
  { trip_id: 'X28_1_1', stop_id: 'M_WAT', arrival_time: '06:53:00', stop_sequence: 6 },
  { trip_id: 'X28_1_1', stop_id: 'M_BKM', arrival_time: '07:03:00', stop_sequence: 7 },
  { trip_id: 'X28_1_1', stop_id: 'M_GLD', arrival_time: '07:10:00', stop_sequence: 8 },
  { trip_id: 'X28_1_1', stop_id: 'B_GSOUQ', arrival_time: '07:15:00', stop_sequence: 9 },
  
  // Bus 8 - Direction 0 (Al Ghubaiba to Rashidiya)
  { trip_id: 'B8_0_1', stop_id: 'B_GHU', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'B8_0_1', stop_id: 'M_BKM', arrival_time: '06:10:00', stop_sequence: 2 },
  { trip_id: 'B8_0_1', stop_id: 'M_UNI', arrival_time: '06:18:00', stop_sequence: 3 },
  { trip_id: 'B8_0_1', stop_id: 'M_DCC', arrival_time: '06:28:00', stop_sequence: 4 },
  { trip_id: 'B8_0_1', stop_id: 'M_AIR3', arrival_time: '06:40:00', stop_sequence: 5 },
  { trip_id: 'B8_0_1', stop_id: 'M_RAS', arrival_time: '06:50:00', stop_sequence: 6 },
  
  // Bus F11 - Direction 0 (Marina to MOE)
  { trip_id: 'F11_0_1', stop_id: 'M_MAR', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'F11_0_1', stop_id: 'B_JLT', arrival_time: '06:08:00', stop_sequence: 2 },
  { trip_id: 'F11_0_1', stop_id: 'M_MOE', arrival_time: '06:25:00', stop_sequence: 3 },
  
  // Bus E100 - Dubai to Abu Dhabi
  { trip_id: 'E100_0_1', stop_id: 'B_GHU', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'E100_0_1', stop_id: 'M_IBN', arrival_time: '06:40:00', stop_sequence: 2 },
  { trip_id: 'E100_0_1', stop_id: 'B_ABU', arrival_time: '08:00:00', stop_sequence: 3 },
  
  { trip_id: 'E100_1_1', stop_id: 'B_ABU', arrival_time: '06:00:00', stop_sequence: 1 },
  { trip_id: 'E100_1_1', stop_id: 'M_IBN', arrival_time: '07:20:00', stop_sequence: 2 },
  { trip_id: 'E100_1_1', stop_id: 'B_GHU', arrival_time: '08:00:00', stop_sequence: 3 },
];

// Insert data using transactions for speed
console.log('📥 Inserting routes...');
const insertRoute = db.prepare('INSERT INTO routes VALUES (?, ?, ?, ?, ?)');
const insertRoutes = db.transaction((routes) => {
  for (const r of routes) {
    insertRoute.run(r.route_id, r.route_short_name, r.route_long_name, r.route_type, r.route_color);
  }
});
insertRoutes(sampleRoutes);
console.log(`   ✅ ${sampleRoutes.length} routes inserted`);

console.log('📥 Inserting stops...');
const insertStop = db.prepare('INSERT INTO stops VALUES (?, ?, ?, ?, ?)');
const insertStops = db.transaction((stops) => {
  for (const s of stops) {
    insertStop.run(s.stop_id, s.stop_name, s.stop_lat, s.stop_lon, s.location_type);
  }
});
insertStops(sampleStops);
console.log(`   ✅ ${sampleStops.length} stops inserted`);

console.log('📥 Inserting trips...');
const insertTrip = db.prepare('INSERT INTO trips VALUES (?, ?, ?, ?, ?)');
const insertTrips = db.transaction((trips) => {
  for (const t of trips) {
    insertTrip.run(t.trip_id, t.route_id, t.service_id, t.trip_headsign, t.direction_id);
  }
});
insertTrips(sampleTrips);
console.log(`   ✅ ${sampleTrips.length} trips inserted`);

console.log('📥 Inserting stop times...');
const insertStopTime = db.prepare('INSERT INTO stop_times (trip_id, stop_id, arrival_time, departure_time, stop_sequence) VALUES (?, ?, ?, ?, ?)');
const insertStopTimes = db.transaction((stopTimes) => {
  for (const st of stopTimes) {
    insertStopTime.run(st.trip_id, st.stop_id, st.arrival_time, st.arrival_time, st.stop_sequence);
  }
});
insertStopTimes(sampleStopTimes);
console.log(`   ✅ ${sampleStopTimes.length} stop times inserted`);

db.close();

console.log('\n🎉 Database seeded successfully!');
console.log(`📁 Database location: ${DB_PATH}`);
console.log('\n🚀 Start server with: npm start');
