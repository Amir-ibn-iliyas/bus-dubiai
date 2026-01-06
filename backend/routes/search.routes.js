const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

/**
 * GET /api/search/stops?q=gold souq
 * Search for stops/stations by name (Fuzzy Search)
 * Handles: spaces, partial words, case insensitive
 */
router.get('/stops', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter "q" must be at least 2 characters' 
      });
    }

    const db = getDb();
    
    // Split query into words and create fuzzy pattern
    // "gold souq" -> "%gold%souq%"
    // "marina metro" -> "%marina%metro%"
    const words = q.trim().toLowerCase().split(/\s+/);
    const fuzzyPattern = '%' + words.join('%') + '%';
    
    // Also search for each word separately for better results
    // This helps when word order is different
    let stops = db.prepare(`
      SELECT stop_id, stop_name, stop_lat, stop_lon
      FROM stops 
      WHERE LOWER(stop_name) LIKE ?
      ORDER BY 
        CASE 
          WHEN LOWER(stop_name) LIKE ? THEN 1
          WHEN LOWER(stop_name) LIKE ? THEN 2
          ELSE 3
        END,
        LENGTH(stop_name)
      LIMIT 20
    `).all(fuzzyPattern, `%${words[0]}%`, fuzzyPattern);
    
    // If no results, try searching each word separately
    if (stops.length === 0 && words.length > 1) {
      const firstWord = `%${words[0]}%`;
      stops = db.prepare(`
        SELECT stop_id, stop_name, stop_lat, stop_lon
        FROM stops 
        WHERE LOWER(stop_name) LIKE ?
        ORDER BY LENGTH(stop_name)
        LIMIT 20
      `).all(firstWord);
    }
    
    res.json({
      success: true,
      count: stops.length,
      query: q,
      pattern: fuzzyPattern,
      data: stops
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/route?from=STOP_ID&to=STOP_ID
 * Find buses/metros that go from one stop to another (Journey Planner)
 * Now supports transfer routes (1 change)
 */
router.get('/route', (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both "from" and "to" stop IDs are required' 
      });
    }

    const db = getDb();
    
    // Get stop names for response
    const fromStop = db.prepare('SELECT stop_name FROM stops WHERE stop_id = ?').get(from);
    const toStop = db.prepare('SELECT stop_name FROM stops WHERE stop_id = ?').get(to);
    
    // ========== STEP 1: Find Direct Routes ==========
    const directRoutes = db.prepare(`
      SELECT DISTINCT 
        r.route_id,
        r.route_short_name,
        r.route_long_name,
        r.route_type,
        r.route_color,
        t.trip_headsign,
        t.direction_id,
        st1.stop_sequence as from_sequence,
        st2.stop_sequence as to_sequence,
        s1.stop_name as from_stop_name,
        s2.stop_name as to_stop_name
      FROM stop_times st1
      JOIN stop_times st2 ON st1.trip_id = st2.trip_id
      JOIN trips t ON st1.trip_id = t.trip_id
      JOIN routes r ON t.route_id = r.route_id
      JOIN stops s1 ON st1.stop_id = s1.stop_id
      JOIN stops s2 ON st2.stop_id = s2.stop_id
      WHERE st1.stop_id = ? 
        AND st2.stop_id = ?
        AND st1.stop_sequence < st2.stop_sequence
      ORDER BY (st2.stop_sequence - st1.stop_sequence)
      LIMIT 5
    `).all(from, to);

    if (directRoutes.length > 0) {
      // Direct route found!
      const formattedRoutes = directRoutes.map(r => ({
        type: 'direct',
        legs: 1,
        route_id: r.route_id,
        route_name: r.route_short_name,
        route_full_name: r.route_long_name,
        transport_type: r.route_type === 1 ? 'Metro' : 'Bus',
        color: r.route_color,
        direction: r.trip_headsign,
        from: r.from_stop_name,
        to: r.to_stop_name,
        stops_between: r.to_sequence - r.from_sequence
      }));

      return res.json({
        success: true,
        route_type: 'direct',
        from: fromStop?.stop_name,
        to: toStop?.stop_name,
        count: formattedRoutes.length,
        data: formattedRoutes
      });
    }

    // ========== STEP 2: Find Transfer Routes (Faster 2-Step Approach) ==========
    // Step 2a: Get all stops reachable FROM the origin
    const fromStops = db.prepare(`
      SELECT DISTINCT 
        st2.stop_id as transfer_stop_id,
        s.stop_name as transfer_stop_name,
        r.route_short_name as route1_name,
        r.route_type as route1_type
      FROM stop_times st1
      JOIN stop_times st2 ON st1.trip_id = st2.trip_id
      JOIN trips t ON st1.trip_id = t.trip_id
      JOIN routes r ON t.route_id = r.route_id
      JOIN stops s ON st2.stop_id = s.stop_id
      WHERE st1.stop_id = ?
        AND st1.stop_sequence < st2.stop_sequence
      LIMIT 100
    `).all(from);

    // Step 2b: Get all stops that can reach TO the destination
    const toStops = db.prepare(`
      SELECT DISTINCT 
        st1.stop_id as transfer_stop_id,
        s.stop_name as transfer_stop_name,
        r.route_short_name as route2_name,
        r.route_type as route2_type
      FROM stop_times st1
      JOIN stop_times st2 ON st1.trip_id = st2.trip_id
      JOIN trips t ON st1.trip_id = t.trip_id
      JOIN routes r ON t.route_id = r.route_id
      JOIN stops s ON st1.stop_id = s.stop_id
      WHERE st2.stop_id = ?
        AND st1.stop_sequence < st2.stop_sequence
      LIMIT 100
    `).all(to);

    // Step 2c: Find common transfer points (intersection)
    const fromStopMap = new Map();
    fromStops.forEach(s => {
      if (!fromStopMap.has(s.transfer_stop_id)) {
        fromStopMap.set(s.transfer_stop_id, s);
      }
    });

    const transferRoutes = [];
    for (const toStop of toStops) {
      if (fromStopMap.has(toStop.transfer_stop_id)) {
        const fromData = fromStopMap.get(toStop.transfer_stop_id);
        transferRoutes.push({
          transfer_stop_name: toStop.transfer_stop_name,
          route1_name: fromData.route1_name,
          route1_type: fromData.route1_type,
          route2_name: toStop.route2_name,
          route2_type: toStop.route2_type
        });
        if (transferRoutes.length >= 5) break;
      }
    }

    if (transferRoutes.length > 0) {
      const formattedTransfers = transferRoutes.map(r => ({
        type: 'transfer',
        legs: 2,
        leg1: {
          route_name: r.route1_name,
          transport_type: r.route1_type === 1 ? 'Metro' : 'Bus',
          from: fromStop?.stop_name,
          to: r.transfer_stop_name
        },
        transfer_at: r.transfer_stop_name,
        leg2: {
          route_name: r.route2_name,
          transport_type: r.route2_type === 1 ? 'Metro' : 'Bus',
          from: r.transfer_stop_name,
          to: toStop?.stop_name
        }
      }));

      return res.json({
        success: true,
        route_type: 'transfer',
        message: 'No direct route. Here are routes with 1 change:',
        from: fromStop?.stop_name,
        to: toStop?.stop_name,
        count: formattedTransfers.length,
        data: formattedTransfers
      });
    }

    // ========== STEP 3: No Route Found ==========
    return res.json({
      success: true,
      route_type: 'none',
      message: 'No route found. These stops may be too far apart or not connected by public transport.',
      from: fromStop?.stop_name,
      to: toStop?.stop_name,
      suggestion: 'Try searching for nearby stops or use Metro + Bus combination.',
      data: []
    });

  } catch (error) {
    console.error('Route search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/stop/:stopId/routes
 * Find all buses/metros passing through a specific stop
 */
router.get('/stop/:stopId/routes', (req, res) => {
  try {
    const { stopId } = req.params;
    const db = getDb();
    
    // Get stop info
    const stop = db.prepare(`
      SELECT stop_id, stop_name, stop_lat, stop_lon
      FROM stops WHERE stop_id = ?
    `).get(stopId);

    if (!stop) {
      return res.status(404).json({ success: false, error: 'Stop not found' });
    }

    // Get all routes passing this stop
    const routes = db.prepare(`
      SELECT DISTINCT 
        r.route_id,
        r.route_short_name,
        r.route_long_name,
        r.route_type,
        r.route_color,
        t.trip_headsign
      FROM stop_times st
      JOIN trips t ON st.trip_id = t.trip_id
      JOIN routes r ON t.route_id = r.route_id
      WHERE st.stop_id = ?
      ORDER BY r.route_type, r.route_short_name
    `).all(stopId);

    res.json({
      success: true,
      data: {
        stop: stop,
        routes: routes.map(r => ({
          route_id: r.route_id,
          route_name: r.route_short_name,
          route_full_name: r.route_long_name,
          type: r.route_type === 1 ? 'Metro' : 'Bus',
          towards: r.trip_headsign
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
