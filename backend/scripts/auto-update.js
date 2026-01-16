/**
 * Smart GTFS Update Script
 * 
 * This script checks if new GTFS data is available and updates only if needed.
 * Now also builds the optimized offline database for mobile apps!
 * 
 * Usage: node scripts/auto-update.js
 * 
 * Cron Example (Linux/Mac): 
 *   0 3 * * 0 cd /path/to/backend && node scripts/auto-update.js
 * 
 * Windows Task Scheduler:
 *   Run weekly on Sunday at 3:00 AM
 * 
 * What this script does:
 *   1. Check Dubai Pulse for new GTFS data
 *   2. Download if new data available
 *   3. Import to full database
 *   4. Build optimized offline database (1.34 MB)
 *   5. Generate app-version.json for mobile app update checks
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_DIR = path.join(__dirname, '..', 'db');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');
const APP_VERSION_FILE = path.join(DATA_DIR, 'app-version.json'); // For mobile app
const GTFS_7Z_PATH = path.join(DATA_DIR, 'gtfs.7z');
const OFFLINE_DB_PATH = path.join(DB_DIR, 'dubai_transit_offline.db');

// Dubai Pulse GTFS URL
const GTFS_URL = 'https://www.dubaipulse.gov.ae/dataset/73765e8f-e8c4-443c-9687-288072ed9d12/resource/11515bd3-bdba-466f-ab65-f057bd123ab5/download/gtfs.7z';

/**
 * Get file hash (MD5)
 */
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Load version info
 */
function loadVersion() {
  if (!fs.existsSync(VERSION_FILE)) {
    return { lastUpdate: null, hash: null, version: 0 };
  }
  return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
}

/**
 * Save version info
 */
function saveVersion(data) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2));
}

/**
 * Save app version info (for mobile app update checks)
 */
function saveAppVersion(data) {
  fs.writeFileSync(APP_VERSION_FILE, JSON.stringify(data, null, 2));
  console.log(`\n📱 App version file saved: ${APP_VERSION_FILE}`);
}

/**
 * Check remote file size (HEAD request)
 */
async function getRemoteFileInfo(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 Dubai-Transit-API'
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        getRemoteFileInfo(res.headers.location).then(resolve).catch(reject);
        return;
      }
      
      resolve({
        size: parseInt(res.headers['content-length'], 10) || 0,
        lastModified: res.headers['last-modified'] || null,
        etag: res.headers['etag'] || null
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

/**
 * Build offline database
 */
function buildOfflineDatabase() {
  console.log('\n📦 Building optimized offline database...\n');
  
  const { execSync } = require('child_process');
  execSync('node scripts/build-offline-db.js', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  // Get offline DB size
  if (fs.existsSync(OFFLINE_DB_PATH)) {
    const stats = fs.statSync(OFFLINE_DB_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Offline database built: ${sizeMB} MB`);
    return {
      size: stats.size,
      sizeMB: parseFloat(sizeMB),
      hash: getFileHash(OFFLINE_DB_PATH)
    };
  }
  return null;
}

/**
 * Generate app version JSON for mobile app update checks
 */
function generateAppVersion(version, offlineDbInfo, gtfsDate) {
  const appVersion = {
    version: version,
    gtfs_date: gtfsDate,
    updated_at: new Date().toISOString(),
    database: {
      filename: 'dubai_transit_offline.db',
      size_bytes: offlineDbInfo.size,
      size_mb: offlineDbInfo.sizeMB,
      hash: offlineDbInfo.hash,
      download_url: '' // You'll set this when you host the file
    },
    changes: `Updated with GTFS data from ${gtfsDate}`,
    min_app_version: '1.0.0'
  };
  
  saveAppVersion(appVersion);
  return appVersion;
}

/**
 * Main update check
 */
async function main() {
  console.log('');
  console.log('🔄 Dubai Transit - Auto Update Check');
  console.log('='.repeat(50));
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    // Load current version
    const currentVersion = loadVersion();
    console.log(`📦 Current Version: ${currentVersion.version || 'None'}`);
    console.log(`📅 Last Update: ${currentVersion.lastUpdate || 'Never'}`);
    
    // Check remote file
    console.log('\n🌐 Checking Dubai Pulse for new GTFS data...');
    const remoteInfo = await getRemoteFileInfo(GTFS_URL);
    console.log(`   📊 Remote Size: ${(remoteInfo.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📅 Last Modified: ${remoteInfo.lastModified || 'Unknown'}`);
    
    // Get local file info
    let localSize = 0;
    let localHash = null;
    if (fs.existsSync(GTFS_7Z_PATH)) {
      const stats = fs.statSync(GTFS_7Z_PATH);
      localSize = stats.size;
      localHash = getFileHash(GTFS_7Z_PATH);
      console.log(`   📁 Local Size: ${(localSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Compare
    const sizeChanged = remoteInfo.size !== localSize;
    const needsUpdate = sizeChanged || !currentVersion.lastUpdate;
    
    if (!needsUpdate) {
      console.log('\n✅ No update needed - GTFS data is current!');
      console.log('='.repeat(50));
      return { updated: false };
    }
    
    console.log('\n🆕 New GTFS data available! Starting update...\n');
    
    // Delete old file to force fresh download
    if (fs.existsSync(GTFS_7Z_PATH)) {
      fs.unlinkSync(GTFS_7Z_PATH);
    }
    
    // Step 1: Run the download and import script (full database)
    console.log('📥 Step 1/2: Downloading and importing GTFS data...\n');
    const { execSync } = require('child_process');
    execSync('node scripts/download-and-import.js', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    // Step 2: Build offline database
    console.log('\n📦 Step 2/2: Building optimized offline database...\n');
    const offlineDbInfo = buildOfflineDatabase();
    
    // Get new hash
    const newHash = getFileHash(GTFS_7Z_PATH);
    
    // Extract date from GTFS folder name or use current date
    const gtfsFolders = fs.readdirSync(path.join(DATA_DIR, 'gtfs')).filter(f => f.startsWith('GTFS_'));
    const latestGtfs = gtfsFolders.sort().pop() || 'GTFS_' + new Date().toISOString().split('T')[0].replace(/-/g, '');
    const gtfsDate = latestGtfs.replace('GTFS_', '');
    
    // Save new version
    const newVersion = {
      version: (currentVersion.version || 0) + 1,
      lastUpdate: new Date().toISOString(),
      gtfsDate: gtfsDate,
      hash: newHash,
      remoteSize: remoteInfo.size,
      remoteLastModified: remoteInfo.lastModified,
      offlineDb: offlineDbInfo
    };
    saveVersion(newVersion);
    
    // Generate app version file for mobile apps
    if (offlineDbInfo) {
      generateAppVersion(newVersion.version, offlineDbInfo, gtfsDate);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ UPDATE COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📦 New Version: ${newVersion.version}`);
    console.log(`📅 GTFS Date: ${gtfsDate}`);
    console.log(`📱 Offline DB: ${offlineDbInfo?.sizeMB || 'N/A'} MB`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Upload dubai_transit_offline.db to your hosting');
    console.log('   2. Update download_url in app-version.json');
    console.log('   3. Upload app-version.json to your hosting');
    console.log('   4. Mobile apps will detect the update!');
    console.log('='.repeat(50));
    
    return { updated: true, version: newVersion };
    
  } catch (error) {
    console.error('\n❌ Update check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
