/**
 * Database Optimization Script
 * Adds better indexes for faster A-to-B route search
 * 
 * Usage: node scripts/optimize-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit.db');

console.log('🔧 Optimizing Database for Speed...\n');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('cache_size = -64000'); // 64MB cache

console.log('📊 Creating optimized indexes...\n');

const indexes = [
  // Composite index for route search
  'CREATE INDEX IF NOT EXISTS idx_stop_times_trip_stop ON stop_times(trip_id, stop_id)',
  'CREATE INDEX IF NOT EXISTS idx_stop_times_stop_trip ON stop_times(stop_id, trip_id)',
  'CREATE INDEX IF NOT EXISTS idx_stop_times_stop_seq ON stop_times(stop_id, stop_sequence)',
  
  // Trips optimization
  'CREATE INDEX IF NOT EXISTS idx_trips_route_direction ON trips(route_id, direction_id)',
  
  // Stops name search
  'CREATE INDEX IF NOT EXISTS idx_stops_name_lower ON stops(stop_name COLLATE NOCASE)',
];

indexes.forEach((sql, i) => {
  try {
    db.exec(sql);
    console.log(`✅ Index ${i + 1}/${indexes.length} created`);
  } catch (err) {
    console.log(`⚠️ Index ${i + 1}: ${err.message}`);
  }
});

// Analyze tables for query planner
console.log('\n📈 Analyzing tables for better query planning...');
db.exec('ANALYZE');

// Vacuum to reclaim space and optimize
console.log('🧹 Vacuuming database...');
db.exec('VACUUM');

console.log('\n✅ Optimization complete!');
console.log('🚀 Restart server: npm start\n');

db.close();
