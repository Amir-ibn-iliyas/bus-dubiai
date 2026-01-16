/**
 * Bus Routes API
 * Updated to use the optimized offline database structure
 * 
 * Endpoints:
 * - GET /api/bus - Get all bus routes
 * - GET /api/bus/search?q=8 - Search bus by number
 * - GET /api/bus/:busNumber - Get bus details with up/down directions
 * - GET /api/bus/:busNumber/stops?direction=0 - Get all stops for a bus direction
 */

const express = require('express');
const router = express.Router();
const { getDb, ROUTE_TYPES } = require('../db/offline-database');

/**
 * GET /api/bus
 * Get all bus routes
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const routes = db.prepare(`
      SELECT 
        route_id, 
        route_short_name as bus_number, 
        route_long_name as route_name, 
        route_color
      FROM routes 
      WHERE route_type = ?
      ORDER BY 
        CASE 
          WHEN route_short_name GLOB '[0-9]*' THEN CAST(route_short_name AS INTEGER)
          ELSE 999999
        END,
        route_short_name
    `).all(ROUTE_TYPES.BUS);
    
    res.json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bus/search?q=X28
 * Search bus by number (fuzzy search)
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const db = getDb();
    const routes = db.prepare(`
      SELECT 
        route_id, 
        route_short_name as bus_number, 
        route_long_name as route_name, 
        route_color
      FROM routes 
      WHERE route_type = ? AND (
        route_short_name LIKE ? OR 
        route_short_name = ? OR
        route_long_name LIKE ?
      )
      ORDER BY 
        CASE 
          WHEN route_short_name = ? THEN 1
          WHEN route_short_name LIKE ? THEN 2
          ELSE 3
        END,
        route_short_name
      LIMIT 20
    `).all(ROUTE_TYPES.BUS, `%${q}%`, q, `%${q}%`, q, `${q}%`);
    
    res.json({
      success: true,
      count: routes.length,
      query: q,
      data: routes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bus/:busNumber
 * Get specific bus route details with both directions
 * Returns: bus info + upward direction stops + downward direction stops
 */
router.get('/:busNumber', (req, res) => {
  try {
    const { busNumber } = req.params;
    const db = getDb();
    
    // Get route info (search by short name first, then route_id)
    const route = db.prepare(`
      SELECT route_id, route_short_name as bus_number, route_long_name as route_name, route_color
      FROM routes 
      WHERE (route_short_name = ? OR route_id = ?) AND route_type = ?
    `).get(busNumber, busNumber, ROUTE_TYPES.BUS);

    if (!route) {
      return res.status(404).json({ success: false, error: `Bus "${busNumber}" not found` });
    }

    // Get both directions (patterns) for this route
    const patterns = db.prepare(`
      SELECT 
        pattern_id,
        direction_id,
        headsign,
        first_stop_id,
        last_stop_id,
        total_stops
      FROM route_patterns 
      WHERE route_id = ?
      ORDER BY direction_id
    `).all(route.route_id);

    // Get stops for each direction
    const directions = patterns.map(pattern => {
      const stops = db.prepare(`
        SELECT 
          ps.stop_sequence,
          s.stop_id,
          s.stop_name,
          s.stop_lat,
          s.stop_lon
        FROM pattern_stops ps
        JOIN stops s ON ps.stop_id = s.stop_id
        WHERE ps.pattern_id = ?
        ORDER BY ps.stop_sequence
      `).all(pattern.pattern_id);

      // Get first and last stop names
      const firstStop = stops[0];
      const lastStop = stops[stops.length - 1];

      return {
        direction_id: pattern.direction_id,
        direction_name: pattern.direction_id === 0 ? 'Upward' : 'Downward',
        headsign: pattern.headsign || (lastStop ? `To ${lastStop.stop_name}` : ''),
        from: firstStop?.stop_name || '',
        to: lastStop?.stop_name || '',
        total_stops: stops.length,
        stops: stops
      };
    });

    res.json({
      success: true,
      data: {
        route_id: route.route_id,
        bus_number: route.bus_number,
        route_name: route.route_name,
        route_color: route.route_color,
        directions: directions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bus/:busNumber/stops?direction=0
 * Get all stops for a bus route in a specific direction
 */
router.get('/:busNumber/stops', (req, res) => {
  try {
    const { busNumber } = req.params;
    const { direction } = req.query;
    const db = getDb();
    
    // Get route
    const route = db.prepare(`
      SELECT route_id, route_short_name as bus_number, route_long_name as route_name
      FROM routes 
      WHERE (route_short_name = ? OR route_id = ?) AND route_type = ?
    `).get(busNumber, busNumber, ROUTE_TYPES.BUS);

    if (!route) {
      return res.status(404).json({ success: false, error: `Bus "${busNumber}" not found` });
    }

    // Get the pattern for the requested direction
    const directionId = direction !== undefined ? parseInt(direction) : 0;
    
    const pattern = db.prepare(`
      SELECT pattern_id, direction_id, headsign, total_stops
      FROM route_patterns 
      WHERE route_id = ? AND direction_id = ?
    `).get(route.route_id, directionId);

    if (!pattern) {
      return res.status(404).json({ 
        success: false, 
        error: `Direction ${directionId} not found for bus ${busNumber}` 
      });
    }

    // Get all stops for this pattern
    const stops = db.prepare(`
      SELECT 
        ps.stop_sequence,
        s.stop_id,
        s.stop_name,
        s.stop_lat,
        s.stop_lon
      FROM pattern_stops ps
      JOIN stops s ON ps.stop_id = s.stop_id
      WHERE ps.pattern_id = ?
      ORDER BY ps.stop_sequence
    `).all(pattern.pattern_id);

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    res.json({
      success: true,
      data: {
        route_id: route.route_id,
        bus_number: route.bus_number,
        route_name: route.route_name,
        direction_id: pattern.direction_id,
        direction_name: pattern.direction_id === 0 ? 'Upward' : 'Downward',
        headsign: pattern.headsign || (lastStop ? `To ${lastStop.stop_name}` : ''),
        from: firstStop?.stop_name || '',
        to: lastStop?.stop_name || '',
        total_stops: stops.length,
        stops: stops
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
