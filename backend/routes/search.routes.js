const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

/**
 * GET /api/search/stops?q=gold
 * Search for stops/stations by name
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
    const stops = db.prepare(`
      SELECT stop_id, stop_name, stop_lat, stop_lon
      FROM stops 
      WHERE stop_name LIKE ?
      ORDER BY stop_name
      LIMIT 20
    `).all(`%${q}%`);
    
    res.json({
      success: true,
      count: stops.length,
      data: stops
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/route?from=STOP_ID&to=STOP_ID
 * Find buses/metros that go from one stop to another (Journey Planner)
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
    
    // Find all routes that pass through BOTH stops
    // and where "from" comes BEFORE "to" in the sequence
    const routes = db.prepare(`
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
      LIMIT 10
    `).all(from, to);

    if (routes.length === 0) {
      return res.json({
        success: true,
        message: 'No direct route found. You may need to change buses/metros.',
        data: []
      });
    }

    // Format response
    const formattedRoutes = routes.map(r => ({
      route_id: r.route_id,
      route_name: r.route_short_name,
      route_full_name: r.route_long_name,
      type: r.route_type === 1 ? 'Metro' : 'Bus',
      color: r.route_color,
      direction: r.trip_headsign,
      from: r.from_stop_name,
      to: r.to_stop_name,
      stops_between: r.to_sequence - r.from_sequence
    }));

    res.json({
      success: true,
      count: formattedRoutes.length,
      data: formattedRoutes
    });
  } catch (error) {
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
