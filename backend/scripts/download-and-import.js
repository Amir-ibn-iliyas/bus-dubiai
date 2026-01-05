/**
 * Download and Import Real RTA GTFS Data
 * 
 * This script:
 * 1. Downloads GTFS data from Dubai Pulse
 * 2. Extracts the 7z archive
 * 3. Imports data into SQLite database
 * 
 * Usage: node scripts/download-and-import.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createReadStream, createWriteStream } = require('fs');
const Database = require('better-sqlite3');
const csv = require('csv-parser');
const Seven = require('node-7z');
const sevenBin = require('7zip-bin');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit.db');
const GTFS_7Z_PATH = path.join(DATA_DIR, 'gtfs.7z');
const GTFS_EXTRACTED_DIR = path.join(DATA_DIR, 'gtfs');

// Dubai Pulse GTFS Download URL
const GTFS_DOWNLOAD_URL = 'https://www.dubaipulse.gov.ae/dataset/73765e8f-e8c4-443c-9687-288072ed9d12/resource/11515bd3-bdba-466f-ab65-f057bd123ab5/download/gtfs.7z';

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

/**
 * Download file from URL with redirect support
 */
async function downloadFile(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error('Too many redirects'));
      return;
    }
    
    console.log(`📥 Downloading from: ${url.substring(0, 60)}...`);
    
    const file = createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        file.close();
        fs.unlinkSync(destPath);
        console.log(`   ↪️ Following redirect...`);
        downloadFile(response.headers.location, destPath, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP Error: ${response.statusCode}`));
        return;
      }
      
      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes) {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const mb = (downloadedBytes / 1024 / 1024).toFixed(2);
          process.stdout.write(`\r   📦 Downloaded: ${mb} MB (${percent}%)`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('\n   ✅ Download complete!');
        resolve();
      });
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
    
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Extract 7z archive
 */
async function extract7z(archivePath, destDir) {
  return new Promise((resolve, reject) => {
    console.log(`📂 Extracting 7z archive...`);
    
    // Clean up old extraction
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true });
    }
    fs.mkdirSync(destDir, { recursive: true });
    
    const stream = Seven.extractFull(archivePath, destDir, {
      $bin: sevenBin.path7za,
      recursive: true
    });
    
    stream.on('end', () => {
      console.log('   ✅ Extraction complete!');
      resolve();
    });
    
    stream.on('error', (err) => {
      reject(err);
    });
  });
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
 * Find GTFS files (they might be in a subdirectory)
 */
function findGtfsFiles(dir) {
  const files = ['routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt'];
  
  // Check current directory
  if (fs.existsSync(path.join(dir, 'routes.txt'))) {
    return dir;
  }
  
  // Check subdirectories
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      if (fs.existsSync(path.join(itemPath, 'routes.txt'))) {
        return itemPath;
      }
    }
  }
  
  return null;
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
    
    CREATE TABLE routes (
      route_id TEXT PRIMARY KEY,
      route_short_name TEXT,
      route_long_name TEXT,
      route_type INTEGER,
      route_color TEXT
    );

    CREATE TABLE stops (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT,
      stop_lat REAL,
      stop_lon REAL,
      location_type INTEGER DEFAULT 0
    );

    CREATE TABLE trips (
      trip_id TEXT PRIMARY KEY,
      route_id TEXT,
      service_id TEXT,
      trip_headsign TEXT,
      direction_id INTEGER
    );

    CREATE TABLE stop_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id TEXT,
      stop_id TEXT,
      arrival_time TEXT,
      departure_time TEXT,
      stop_sequence INTEGER
    );

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
 * Import stop_times in batches
 */
function importStopTimes(db, stopTimes) {
  console.log(`📥 Importing ${stopTimes.length} stop times...`);
  
  const insert = db.prepare(`
    INSERT INTO stop_times (trip_id, stop_id, arrival_time, departure_time, stop_sequence)
    VALUES (?, ?, ?, ?, ?)
  `);
  
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
 * Main function
 */
async function main() {
  console.log('');
  console.log('🚀 Dubai Transit - Real GTFS Data Importer');
  console.log('=' .repeat(50));
  console.log('');
  
  try {
    // Step 1: Download GTFS file if not exists
    if (!fs.existsSync(GTFS_7Z_PATH)) {
      await downloadFile(GTFS_DOWNLOAD_URL, GTFS_7Z_PATH);
    } else {
      console.log('📦 GTFS archive already downloaded, skipping...');
    }
    
    // Step 2: Extract 7z
    await extract7z(GTFS_7Z_PATH, GTFS_EXTRACTED_DIR);
    
    // Step 3: Find GTFS files
    const gtfsDir = findGtfsFiles(GTFS_EXTRACTED_DIR);
    if (!gtfsDir) {
      throw new Error('Could not find GTFS files after extraction');
    }
    console.log(`📂 Found GTFS files in: ${gtfsDir}`);
    
    // Step 4: Parse CSV files
    console.log('\n📖 Reading GTFS files...');
    const routes = await parseCSV(path.join(gtfsDir, 'routes.txt'));
    const stops = await parseCSV(path.join(gtfsDir, 'stops.txt'));
    const trips = await parseCSV(path.join(gtfsDir, 'trips.txt'));
    const stopTimes = await parseCSV(path.join(gtfsDir, 'stop_times.txt'));
    
    console.log(`   📊 Found: ${routes.length} routes, ${stops.length} stops, ${trips.length} trips, ${stopTimes.length} stop_times`);
    
    // Step 5: Create database
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log('\n🗑️ Old database deleted');
    }
    
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    // Step 6: Create tables and import
    console.log('');
    createTables(db);
    console.log('');
    importRoutes(db, routes);
    importStops(db, stops);
    importTrips(db, trips);
    importStopTimes(db, stopTimes);
    
    // Stats
    const routeCount = db.prepare('SELECT COUNT(*) as count FROM routes').get().count;
    const busCount = db.prepare('SELECT COUNT(*) as count FROM routes WHERE route_type = 3').get().count;
    const metroCount = db.prepare('SELECT COUNT(*) as count FROM routes WHERE route_type = 1').get().count;
    const tramCount = db.prepare('SELECT COUNT(*) as count FROM routes WHERE route_type = 0').get().count;
    const stopCount = db.prepare('SELECT COUNT(*) as count FROM stops').get().count;
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 IMPORT COMPLETE!\n');
    console.log('📊 Database Statistics:');
    console.log(`   📍 Total Routes: ${routeCount}`);
    console.log(`   🚌 Bus Routes: ${busCount}`);
    console.log(`   🚇 Metro Lines: ${metroCount}`);
    console.log(`   🚋 Tram Lines: ${tramCount}`);
    console.log(`   🚏 Total Stops: ${stopCount}`);
    console.log(`\n📁 Database: ${DB_PATH}`);
    console.log('\n🚀 Start server: npm start');
    
    db.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
