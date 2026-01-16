/**
 * Build Optimized Offline Database
 * 
 * This script reads the full GTFS data and extracts only what's needed
 * for offline journey planning, dramatically reducing database size.
 * 
 * Usage: node scripts/build-offline-db.js
 * 
 * Output: ~3-5 MB database (down from 274 MB!)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Paths
const GTFS_DIR = path.join(__dirname, '..', 'data', 'gtfs', 'GTFS_20250823');
const OFFLINE_DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit_offline.db');

// Route types
const ROUTE_TYPES = {
  METRO: 1,
  BUS: 3
};

console.log('🚀 Building Optimized Offline Database...\n');

// Delete old database if exists
if (fs.existsSync(OFFLINE_DB_PATH)) {
  fs.unlinkSync(OFFLINE_DB_PATH);
  console.log('🗑️  Old offline database deleted');
}

const db = new Database(OFFLINE_DB_PATH);
db.pragma('journal_mode = WAL');

// =====================================================
// CREATE TABLES
// =====================================================
console.log('\n📦 Creating tables...');

db.exec(`
  -- Routes table
  CREATE TABLE IF NOT EXISTS routes (
    route_id TEXT PRIMARY KEY,
    route_short_name TEXT NOT NULL,
    route_long_name TEXT,
    route_type INTEGER NOT NULL,
    route_color TEXT
  );

  -- Stops table
  CREATE TABLE IF NOT EXISTS stops (
    stop_id TEXT PRIMARY KEY,
    stop_name TEXT NOT NULL,
    stop_name_ar TEXT,
    stop_lat REAL NOT NULL,
    stop_lon REAL NOT NULL,
    location_type INTEGER DEFAULT 0
  );

  -- Route patterns (one per direction per route)
  CREATE TABLE IF NOT EXISTS route_patterns (
    pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id TEXT NOT NULL,
    direction_id INTEGER NOT NULL,
    headsign TEXT,
    first_stop_id TEXT,
    last_stop_id TEXT,
    total_stops INTEGER,
    UNIQUE(route_id, direction_id)
  );

  -- Pattern stops (ordered list of stops for each pattern)
  CREATE TABLE IF NOT EXISTS pattern_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id INTEGER NOT NULL,
    stop_id TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    UNIQUE(pattern_id, stop_sequence)
  );

  -- Transfers between stops
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_stop_id TEXT NOT NULL,
    to_stop_id TEXT NOT NULL,
    transfer_type INTEGER,
    min_transfer_time INTEGER
  );

  -- Stop routes (which routes serve each stop)
  CREATE TABLE IF NOT EXISTS stop_routes (
    stop_id TEXT NOT NULL,
    route_id TEXT NOT NULL,
    direction_id INTEGER NOT NULL,
    PRIMARY KEY (stop_id, route_id, direction_id)
  );

  -- Metro lines (for UI display)
  CREATE TABLE IF NOT EXISTS metro_lines (
    line_id TEXT PRIMARY KEY,
    line_name TEXT NOT NULL,
    line_name_ar TEXT,
    line_color TEXT NOT NULL,
    route_id TEXT NOT NULL
  );
`);

console.log('✅ Tables created');

// =====================================================
// HELPER: Parse CSV line (handles quoted fields)
// =====================================================
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// =====================================================
// HELPER: Read CSV file and return array of objects
// =====================================================
async function readCSV(filename) {
  const filepath = path.join(GTFS_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return [];
  }
  
  return new Promise((resolve, reject) => {
    const results = [];
    let headers = null;
    let lineCount = 0;
    
    const fileStream = fs.createReadStream(filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      if (!line.trim()) return;
      
      const values = parseCSVLine(line);
      
      if (!headers) {
        headers = values.map(h => h.replace(/"/g, '').trim());
      } else {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] ? values[i].replace(/"/g, '').trim() : '';
        });
        results.push(obj);
        lineCount++;
        
        // Progress indicator for large files
        if (lineCount % 100000 === 0) {
          process.stdout.write(`\r   Processing ${filename}: ${lineCount.toLocaleString()} rows...`);
        }
      }
    });
    
    rl.on('close', () => {
      if (lineCount > 100000) console.log('');
      resolve(results);
    });
    
    rl.on('error', reject);
  });
}

// =====================================================
// MAIN BUILD PROCESS
// =====================================================
async function buildOfflineDatabase() {
  try {
    // -------------------------------------------------
    // STEP 1: Import Routes
    // -------------------------------------------------
    console.log('\n📥 Importing routes...');
    const routes = await readCSV('routes.txt');
    
    const insertRoute = db.prepare(`
      INSERT OR REPLACE INTO routes (route_id, route_short_name, route_long_name, route_type, route_color)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    let busCount = 0;
    let metroCount = 0;
    
    const insertRoutes = db.transaction(() => {
      for (const route of routes) {
        insertRoute.run(
          route.route_id,
          route.route_short_name || '',
          route.route_long_name || '',
          parseInt(route.route_type) || 3,
          route.route_color || ''
        );
        
        if (parseInt(route.route_type) === ROUTE_TYPES.METRO) {
          metroCount++;
        } else {
          busCount++;
        }
      }
    });
    insertRoutes();
    
    console.log(`✅ Imported ${routes.length} routes (${busCount} buses, ${metroCount} metro)`);
    
    // -------------------------------------------------
    // STEP 2: Import Stops
    // -------------------------------------------------
    console.log('\n📥 Importing stops...');
    const stops = await readCSV('stops.txt');
    
    const insertStop = db.prepare(`
      INSERT OR REPLACE INTO stops (stop_id, stop_name, stop_lat, stop_lon, location_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertStops = db.transaction(() => {
      for (const stop of stops) {
        insertStop.run(
          stop.stop_id,
          stop.stop_name || '',
          parseFloat(stop.stop_lat) || 0,
          parseFloat(stop.stop_lon) || 0,
          parseInt(stop.location_type) || 0
        );
      }
    });
    insertStops();
    
    console.log(`✅ Imported ${stops.length} stops`);
    
    // -------------------------------------------------
    // STEP 3: Import Trips (temporary, for pattern extraction)
    // -------------------------------------------------
    console.log('\n📥 Reading trips...');
    const trips = await readCSV('trips.txt');
    console.log(`   Found ${trips.length.toLocaleString()} trips`);
    
    // Create a map: route_id + direction_id -> trip_id (just need one trip per pattern)
    const patternTrips = new Map();
    
    for (const trip of trips) {
      const key = `${trip.route_id}_${trip.direction_id || 0}`;
      
      // Store the first trip for each pattern (we only need one to get the stop sequence)
      if (!patternTrips.has(key)) {
        patternTrips.set(key, {
          trip_id: trip.trip_id,
          route_id: trip.route_id,
          direction_id: parseInt(trip.direction_id) || 0,
          headsign: trip.trip_headsign || ''
        });
      }
    }
    
    console.log(`   Found ${patternTrips.size} unique route patterns`);
    
    // -------------------------------------------------
    // STEP 4: Read Stop Times (streaming for memory efficiency)
    // -------------------------------------------------
    console.log('\n📥 Reading stop times (this may take a moment)...');
    
    // Get the trip IDs we need
    const neededTripIds = new Set();
    for (const pattern of patternTrips.values()) {
      neededTripIds.add(pattern.trip_id);
    }
    
    console.log(`   Looking for stop times for ${neededTripIds.size} representative trips...`);
    
    // Read stop_times.txt and extract only what we need
    const tripStops = new Map(); // trip_id -> [{stop_id, sequence}, ...]
    
    const stopTimesPath = path.join(GTFS_DIR, 'stop_times.txt');
    const fileStream = fs.createReadStream(stopTimesPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let headers = null;
    let processedLines = 0;
    let matchedLines = 0;
    
    await new Promise((resolve, reject) => {
      rl.on('line', (line) => {
        if (!line.trim()) return;
        
        const values = parseCSVLine(line);
        
        if (!headers) {
          headers = values.map(h => h.replace(/"/g, '').trim());
        } else {
          processedLines++;
          
          // Get trip_id from the line
          const tripIdIndex = headers.indexOf('trip_id');
          const tripId = values[tripIdIndex]?.replace(/"/g, '').trim();
          
          // Only process if this trip is one of our representative trips
          if (neededTripIds.has(tripId)) {
            const stopIdIndex = headers.indexOf('stop_id');
            const sequenceIndex = headers.indexOf('stop_sequence');
            
            const stopId = values[stopIdIndex]?.replace(/"/g, '').trim();
            const sequence = parseInt(values[sequenceIndex]?.replace(/"/g, '').trim()) || 0;
            
            if (!tripStops.has(tripId)) {
              tripStops.set(tripId, []);
            }
            tripStops.get(tripId).push({ stop_id: stopId, sequence });
            matchedLines++;
          }
          
          // Progress
          if (processedLines % 500000 === 0) {
            process.stdout.write(`\r   Processed ${(processedLines / 1000000).toFixed(1)}M rows, found ${matchedLines.toLocaleString()} needed...`);
          }
        }
      });
      
      rl.on('close', resolve);
      rl.on('error', reject);
    });
    
    console.log(`\n✅ Extracted stop sequences for ${tripStops.size} patterns`);
    
    // -------------------------------------------------
    // STEP 5: Build Route Patterns
    // -------------------------------------------------
    console.log('\n📦 Building route patterns...');
    
    const insertPattern = db.prepare(`
      INSERT INTO route_patterns (route_id, direction_id, headsign, first_stop_id, last_stop_id, total_stops)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const insertPatternStop = db.prepare(`
      INSERT INTO pattern_stops (pattern_id, stop_id, stop_sequence)
      VALUES (?, ?, ?)
    `);
    
    const insertStopRoute = db.prepare(`
      INSERT OR IGNORE INTO stop_routes (stop_id, route_id, direction_id)
      VALUES (?, ?, ?)
    `);
    
    let patternCount = 0;
    let patternStopCount = 0;
    
    const buildPatterns = db.transaction(() => {
      for (const [key, pattern] of patternTrips) {
        const stops = tripStops.get(pattern.trip_id);
        
        if (!stops || stops.length === 0) {
          continue;
        }
        
        // Sort by sequence
        stops.sort((a, b) => a.sequence - b.sequence);
        
        const firstStop = stops[0].stop_id;
        const lastStop = stops[stops.length - 1].stop_id;
        
        // Insert pattern
        const result = insertPattern.run(
          pattern.route_id,
          pattern.direction_id,
          pattern.headsign,
          firstStop,
          lastStop,
          stops.length
        );
        
        const patternId = result.lastInsertRowid;
        patternCount++;
        
        // Insert pattern stops
        for (const stop of stops) {
          insertPatternStop.run(patternId, stop.stop_id, stop.sequence);
          patternStopCount++;
          
          // Also add to stop_routes for journey planning
          insertStopRoute.run(stop.stop_id, pattern.route_id, pattern.direction_id);
        }
      }
    });
    buildPatterns();
    
    console.log(`✅ Created ${patternCount} patterns with ${patternStopCount.toLocaleString()} stop entries`);
    
    // -------------------------------------------------
    // STEP 6: Import Transfers
    // -------------------------------------------------
    console.log('\n📥 Importing transfers...');
    const transfers = await readCSV('transfers.txt');
    
    const insertTransfer = db.prepare(`
      INSERT INTO transfers (from_stop_id, to_stop_id, transfer_type, min_transfer_time)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertTransfers = db.transaction(() => {
      for (const transfer of transfers) {
        insertTransfer.run(
          transfer.from_stop_id,
          transfer.to_stop_id,
          parseInt(transfer.transfer_type) || 0,
          parseInt(transfer.min_transfer_time) || null
        );
      }
    });
    insertTransfers();
    
    console.log(`✅ Imported ${transfers.length} transfers`);
    
    // -------------------------------------------------
    // STEP 7: Create Metro Lines Table
    // -------------------------------------------------
    console.log('\n🚇 Creating metro lines...');
    
    const insertMetroLine = db.prepare(`
      INSERT OR REPLACE INTO metro_lines (line_id, line_name, line_name_ar, line_color, route_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const metroRoutes = db.prepare(`
      SELECT route_id, route_short_name, route_long_name, route_color 
      FROM routes 
      WHERE route_type = ?
    `).all(ROUTE_TYPES.METRO);
    
    const insertMetroLines = db.transaction(() => {
      for (const route of metroRoutes) {
        let lineName = route.route_short_name || route.route_long_name || route.route_id;
        let lineNameAr = '';
        
        // Clean up common metro naming patterns
        if (lineName.toLowerCase().includes('red') || lineName.includes('MRed')) {
          lineName = 'Red Line';
          lineNameAr = 'الخط الأحمر';
        } else if (lineName.toLowerCase().includes('green') || lineName.includes('MGr')) {
          lineName = 'Green Line';
          lineNameAr = 'الخط الأخضر';
        } else if (lineName.toLowerCase().includes('2020') || lineName.includes('Route 2020')) {
          lineName = 'Route 2020';
          lineNameAr = 'طريق 2020';
        }
        
        insertMetroLine.run(
          route.route_id,
          lineName,
          lineNameAr,
          route.route_color || 'E21836',
          route.route_id
        );
      }
    });
    insertMetroLines();
    
    console.log(`✅ Created ${metroRoutes.length} metro lines`);
    
    // -------------------------------------------------
    // STEP 8: Create Indexes
    // -------------------------------------------------
    console.log('\n🔧 Creating indexes...');
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_routes_short_name ON routes(route_short_name);
      CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(route_type);
      CREATE INDEX IF NOT EXISTS idx_stops_name ON stops(stop_name);
      CREATE INDEX IF NOT EXISTS idx_stops_location ON stops(stop_lat, stop_lon);
      CREATE INDEX IF NOT EXISTS idx_patterns_route ON route_patterns(route_id);
      CREATE INDEX IF NOT EXISTS idx_patterns_direction ON route_patterns(route_id, direction_id);
      CREATE INDEX IF NOT EXISTS idx_pattern_stops_pattern ON pattern_stops(pattern_id);
      CREATE INDEX IF NOT EXISTS idx_pattern_stops_stop ON pattern_stops(stop_id);
      CREATE INDEX IF NOT EXISTS idx_stop_routes_stop ON stop_routes(stop_id);
      CREATE INDEX IF NOT EXISTS idx_stop_routes_route ON stop_routes(route_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_stop_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_stop_id);
    `);
    
    console.log('✅ Indexes created');
    
    // -------------------------------------------------
    // STEP 9: Optimize database
    // -------------------------------------------------
    console.log('\n🗜️  Optimizing database...');
    db.exec('VACUUM');
    db.exec('ANALYZE');
    console.log('✅ Database optimized');
    
    // -------------------------------------------------
    // DONE!
    // -------------------------------------------------
    db.close();
    
    // Get final file size
    const stats = fs.statSync(OFFLINE_DB_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ OFFLINE DATABASE BUILD COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📁 Location: ${OFFLINE_DB_PATH}`);
    console.log(`📦 Size: ${sizeMB} MB`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Routes: ${routes.length}`);
    console.log(`   • Stops: ${stops.length}`);
    console.log(`   • Patterns: ${patternCount}`);
    console.log(`   • Pattern Stops: ${patternStopCount.toLocaleString()}`);
    console.log(`   • Transfers: ${transfers.length}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error building offline database:', error);
    process.exit(1);
  }
}

// Run the build
buildOfflineDatabase();
