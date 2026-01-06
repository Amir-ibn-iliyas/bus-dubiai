const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'dubai_transit.db');

try {
  const db = new Database(DB_PATH, { readonly: true });
  
  console.log('\n--- 📊 Database Verification Report ---');
  
  // 1. Routes Count
  const routeStats = db.prepare(`
    SELECT 
      route_type, 
      COUNT(*) as count 
    FROM routes 
    GROUP BY route_type
  `).all();
  
  console.log('\n📍 Routes Summary:');
  routeStats.forEach(stat => {
    const type = stat.route_type === 1 ? '🚇 Metro' : (stat.route_type === 3 ? '🚌 Bus' : '❓ Other');
    console.log(`   - ${type}: ${stat.count} lines`);
  });

  // 2. Stops Count
  const stopCount = db.prepare('SELECT COUNT(*) as count FROM stops').get().count;
  console.log(`\n🚏 Total Stops/Stations: ${stopCount}`);

  // 3. Sample Route Check (X28)
  const x28 = db.prepare(`SELECT * FROM routes WHERE route_short_name = 'X28'`).get();
  if (x28) {
    console.log(`\n✅ Sample Bus Found: ${x28.route_short_name} (${x28.route_long_name})`);
    
    // Check stops for X28
    const stopsX28 = db.prepare(`
      SELECT COUNT(DISTINCT stop_id) as count 
      FROM stop_times st
      JOIN trips t ON st.trip_id = t.trip_id
      WHERE t.route_id = ?
    `).get(x28.route_id).count;
    console.log(`   - Has ${stopsX28} unique stops in its schedule`);
  }

  // 4. Metro Check
  const metroLines = db.prepare(`SELECT route_long_name FROM routes WHERE route_type = 1`).all();
  if (metroLines.length > 0) {
    console.log('\n🚇 Metro Lines Found:');
    metroLines.forEach(m => console.log(`   - ${m.route_long_name}`));
  }

  db.close();
  console.log('\n--- ✅ Verification Complete ---\n');

} catch (error) {
  console.error('❌ Error checking database:', error.message);
}
