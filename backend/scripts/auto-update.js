/**
 * Smart GTFS Update Script
 * 
 * This script checks if new GTFS data is available and updates only if needed.
 * Designed to run as a cron job (e.g., every Sunday at 3 AM)
 * 
 * Usage: node scripts/auto-update.js
 * 
 * Cron Example (Linux/Mac): 
 *   0 3 * * 0 cd /path/to/backend && node scripts/auto-update.js
 * 
 * Windows Task Scheduler:
 *   Run weekly on Sunday at 3:00 AM
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');
const GTFS_7Z_PATH = path.join(DATA_DIR, 'gtfs.7z');

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
 * Main update check
 */
async function main() {
  console.log('');
  console.log('🔄 Dubai Transit - Auto Update Check');
  console.log('=' .repeat(50));
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    // Load current version
    const currentVersion = loadVersion();
    console.log(`📦 Current Version: ${currentVersion.version || 'None'}`);
    console.log(`📅 Last Update: ${currentVersion.lastUpdate || 'Never'}`);
    
    // Check remote file
    console.log('\n🌐 Checking remote server...');
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
      console.log('\n✅ No update needed - data is current!');
      console.log('=' .repeat(50));
      return;
    }
    
    console.log('\n🆕 New data available! Starting update...\n');
    
    // Delete old file to force fresh download
    if (fs.existsSync(GTFS_7Z_PATH)) {
      fs.unlinkSync(GTFS_7Z_PATH);
    }
    
    // Run the download and import script
    const { execSync } = require('child_process');
    execSync('node scripts/download-and-import.js', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    // Get new hash
    const newHash = getFileHash(GTFS_7Z_PATH);
    
    // Save new version
    const newVersion = {
      version: (currentVersion.version || 0) + 1,
      lastUpdate: new Date().toISOString(),
      hash: newHash,
      remoteSize: remoteInfo.size,
      remoteLastModified: remoteInfo.lastModified
    };
    saveVersion(newVersion);
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Update complete!');
    console.log(`📦 New Version: ${newVersion.version}`);
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Update check failed:', error.message);
    process.exit(1);
  }
}

main();
