/**
 * Real GTFS Data Importer for Dubai RTA
 * 
 * This script downloads the official RTA GTFS data and imports it into SQLite.
 * 
 * GTFS Files we need:
 * - routes.txt     -> Bus/Metro lines
 * - stops.txt      -> All stops/stations  
 * - trips.txt      -> Individual journeys
 * - stop_times.txt -> Schedule for each trip
 * 
 * Usage: node scripts/import-gtfs.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const Database = require('better-sqlite3');
const csv = require('csv-parser');
const unzipper = require('unzipper');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit.db');
const GTFS_ZIP_PATH = path.join(DATA_DIR, 'gtfs.zip');
const GTFS_EXTRACTED_DIR = path.join(DATA_DIR, 'gtfs');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

/**
 * Download file from URL
 */
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading from: ${url}`);
    
    const file = createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`   ↪️ Redirecting to: ${response.headers.location}`);
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes) {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r   📦 Progress: ${percent}%`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('\n   ✅ Download complete!');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Extract ZIP file
 */
async function extractZip(zipPath, destDir) {
  console.log(`📂 Extracting to: ${destDir}`);
  
  // Clean up old extraction
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });
  
  await pipeline(
    createReadStream(zipPath),
    unzipper.Extract({ path: destDir })
  );
  
  console.log('   ✅ Extraction complete!');
}

/**
 * Parse CSV file and return array of objects
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️ File not found: ${path.basename(filePath)}`);
      resolve([]);
      return;
    }
    
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Create database tables
 */
function createTables(db) {
  console.log('🗃️ Creating database tables...');
  
  db.exec(`
    DROP TABLE IF EXISTS stop_times;
    DROP TABLE IF EXISTS trips;
    DROP TABLE IF EXISTS stops;
    DROP TABLE IF EXISTS routes;
    
    -- Routes table (Bus and Metro lines)
    CREATE TABLE routes (
      route_id TEXT PRIMARY KEY,
      route_short_name TEXT,
      route_long_name TEXT,
      route_type INTEGER,
      route_color TEXT
    );

    -- Stops table (Bus stops and Metro stations)
    CREATE TABLE stops (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT,
      stop_lat REAL,
      stop_lon REAL,
      location_type INTEGER DEFAULT 0
    );

    -- Trips table (Individual journeys on a route)
    CREATE TABLE trips (
      trip_id TEXT PRIMARY KEY,
      route_id TEXT,
      service_id TEXT,
      trip_headsign TEXT,
      direction_id INTEGER
    );

    -- Stop times table (When each trip stops at each stop)
    CREATE TABLE stop_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id TEXT,
      stop_id TEXT,
      arrival_time TEXT,
      departure_time TEXT,
      stop_sequence INTEGER
    );

    -- Create indexes for fast queries
    CREATE INDEX idx_routes_short_name ON routes(route_short_name);
    CREATE INDEX idx_routes_type ON routes(route_type);
    CREATE INDEX idx_stops_name ON stops(stop_name);
    CREATE INDEX idx_trips_route ON trips(route_id);
    CREATE INDEX idx_trips_direction ON trips(direction_id);
    CREATE INDEX idx_stop_times_trip ON stop_times(trip_id);
    CREATE INDEX idx_stop_times_stop ON stop_times(stop_id);
    CREATE INDEX idx_stop_times_sequence ON stop_times(stop_sequence);
  `);
  
  console.log('   ✅ Tables created!');
}

/**
 * Import routes
 */
function importRoutes(db, routes) {
  console.log(`📥 Importing ${routes.length} routes...`);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO routes (route_id, route_short_name, route_long_name, route_type, route_color)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction((items) => {
    for (const r of items) {
      insert.run(
        r.route_id,
        r.route_short_name || '',
        r.route_long_name || '',
        parseInt(r.route_type) || 3,
        r.route_color || ''
      );
    }
  });
  
  transaction(routes);
  console.log(`   ✅ Routes imported!`);
}

/**
 * Import stops
 */
function importStops(db, stops) {
  console.log(`📥 Importing ${stops.length} stops...`);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO stops (stop_id, stop_name, stop_lat, stop_lon, location_type)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction((items) => {
    for (const s of items) {
      insert.run(
        s.stop_id,
        s.stop_name || '',
        parseFloat(s.stop_lat) || 0,
        parseFloat(s.stop_lon) || 0,
        parseInt(s.location_type) || 0
      );
    }
  });
  
  transaction(stops);
  console.log(`   ✅ Stops imported!`);
}

/**
 * Import trips
 */
function importTrips(db, trips) {
  console.log(`📥 Importing ${trips.length} trips...`);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO trips (trip_id, route_id, service_id, trip_headsign, direction_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction((items) => {
    for (const t of items) {
      insert.run(
        t.trip_id,
        t.route_id || '',
        t.service_id || '',
        t.trip_headsign || '',
        parseInt(t.direction_id) || 0
      );
    }
  });
  
  transaction(trips);
  console.log(`   ✅ Trips imported!`);
}

/**
 * Import stop_times (This is usually the largest file)
 */
function importStopTimes(db, stopTimes) {
  console.log(`📥 Importing ${stopTimes.length} stop times (this may take a while)...`);
  
  const insert = db.prepare(`
    INSERT INTO stop_times (trip_id, stop_id, arrival_time, departure_time, stop_sequence)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // Process in batches of 10000 for large files
  const batchSize = 10000;
  const totalBatches = Math.ceil(stopTimes.length / batchSize);
  
  const transaction = db.transaction((items) => {
    for (const st of items) {
      insert.run(
        st.trip_id,
        st.stop_id,
        st.arrival_time || '',
        st.departure_time || '',
        parseInt(st.stop_sequence) || 0
      );
    }
  });
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, stopTimes.length);
    const batch = stopTimes.slice(start, end);
    transaction(batch);
    process.stdout.write(`\r   📦 Progress: ${i + 1}/${totalBatches} batches`);
  }
  
  console.log('\n   ✅ Stop times imported!');
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Dubai Transit GTFS Importer\n');
  console.log('=' .repeat(50));
  
  // Check if we need to download
  const gtfsFilesExist = fs.existsSync(path.join(GTFS_EXTRACTED_DIR, 'routes.txt'));
  
  if (!gtfsFilesExist) {
    console.log('\n📋 GTFS files not found locally.');
    console.log('\n⚠️  MANUAL DOWNLOAD REQUIRED:');
    console.log('   1. Go to: https://www.dubaipulse.gov.ae/data/rta_gtfs-open/rta_gtfs-csv');
    console.log('   2. Download the GTFS ZIP file');
    console.log(`   3. Extract it to: ${GTFS_EXTRACTED_DIR}`);
    console.log('   4. Run this script again\n');
    
    // Create a placeholder directory
    if (!fs.existsSync(GTFS_EXTRACTED_DIR)) {
      fs.mkdirSync(GTFS_EXTRACTED_DIR, { recursive: true });
    }
    
    console.log('   OR place these files in the gtfs folder:');
    console.log('   - routes.txt');
    console.log('   - stops.txt');
    console.log('   - trips.txt');
    console.log('   - stop_times.txt\n');
    
    return;
  }
  
  console.log('\n📂 Found GTFS files, starting import...\n');
  
  // Parse CSV files
  console.log('📖 Reading GTFS files...');
  const routes = await parseCSV(path.join(GTFS_EXTRACTED_DIR, 'routes.txt'));
  const stops = await parseCSV(path.join(GTFS_EXTRACTED_DIR, 'stops.txt'));
  const trips = await parseCSV(path.join(GTFS_EXTRACTED_DIR, 'trips.txt'));
  const stopTimes = await parseCSV(path.join(GTFS_EXTRACTED_DIR, 'stop_times.txt'));
  
  console.log(`   📊 Found: ${routes.length} routes, ${stops.length} stops, ${trips.length} trips, ${stopTimes.length} stop_times\n`);
  
  // Delete old database
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️ Old database deleted');
  }
  
  // Create new database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Create tables and import data
  createTables(db);
  
  console.log('');
  importRoutes(db, routes);
  importStops(db, stops);
  importTrips(db, trips);
  importStopTimes(db, stopTimes);
  
  // Get stats
  const routeCount = db.prepare('SELECT COUNT(*) as count FROM routes').get().count;
  const busCount = db.prepare('SELECT COUNT(*) as count FROM routes WHERE route_type = 3').get().count;
  const metroCount = db.prepare('SELECT COUNT(*) as count FROM routes WHERE route_type = 1').get().count;
  const stopCount = db.prepare('SELECT COUNT(*) as count FROM stops').get().count;
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 IMPORT COMPLETE!\n');
  console.log('📊 Database Statistics:');
  console.log(`   📍 Total Routes: ${routeCount}`);
  console.log(`   🚌 Bus Routes: ${busCount}`);
  console.log(`   🚇 Metro Lines: ${metroCount}`);
  console.log(`   🚏 Total Stops: ${stopCount}`);
  console.log(`\n📁 Database: ${DB_PATH}`);
  console.log('\n🚀 Start server: npm start');
  
  db.close();
}

main().catch(console.error);
