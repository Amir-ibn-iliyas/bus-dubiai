const express = require('express');
const router = express.Router();
const { getDb, ROUTE_TYPES } = require('../db/database');

/**
 * GET /api/bus
 * Get all bus routes
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const routes = db.prepare(`
      SELECT route_id, route_short_name, route_long_name, route_color
      FROM routes 
      WHERE route_type = ?
      ORDER BY route_short_name
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
 * Search bus by number
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const db = getDb();
    const routes = db.prepare(`
      SELECT route_id, route_short_name, route_long_name, route_color
      FROM routes 
      WHERE route_type = ? AND route_short_name LIKE ?
      ORDER BY route_short_name
    `).all(ROUTE_TYPES.BUS, `%${q}%`);
    
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
 * GET /api/bus/:routeId
 * Get specific bus route details with directions
 */
router.get('/:routeId', (req, res) => {
  try {
    const { routeId } = req.params;
    const db = getDb();
    
    // Get route info
    const route = db.prepare(`
      SELECT route_id, route_short_name, route_long_name, route_color
      FROM routes 
      WHERE route_id = ? OR route_short_name = ?
    `).get(routeId, routeId);

    if (!route) {
      return res.status(404).json({ success: false, error: 'Bus route not found' });
    }

    // Get directions (headsigns) for this route
    const directions = db.prepare(`
      SELECT DISTINCT direction_id, trip_headsign
      FROM trips 
      WHERE route_id = ?
      ORDER BY direction_id
    `).all(route.route_id);
    
    res.json({
      success: true,
      data: {
        ...route,
        directions: directions.map(d => ({
          direction_id: d.direction_id,
          towards: d.trip_headsign
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bus/:routeId/stops?direction=0
 * Get all stops for a bus route in a specific direction
 */
router.get('/:routeId/stops', (req, res) => {
  try {
    const { routeId } = req.params;
    const { direction } = req.query;
    const db = getDb();
    
    // First get the route
    const route = db.prepare(`
      SELECT route_id FROM routes 
      WHERE route_id = ? OR route_short_name = ?
    `).get(routeId, routeId);

    if (!route) {
      return res.status(404).json({ success: false, error: 'Bus route not found' });
    }

    // Get one trip for this route and direction
    let tripQuery = `
      SELECT trip_id, trip_headsign, direction_id
      FROM trips 
      WHERE route_id = ?
    `;
    
    if (direction !== undefined) {
      tripQuery += ` AND direction_id = ?`;
    }
    tripQuery += ` LIMIT 1`;

    const trip = direction !== undefined 
      ? db.prepare(tripQuery).get(route.route_id, parseInt(direction))
      : db.prepare(tripQuery).get(route.route_id);

    if (!trip) {
      return res.status(404).json({ success: false, error: 'No trips found for this route' });
    }

    // Get all stops for this trip in order
    const stops = db.prepare(`
      SELECT s.stop_id, s.stop_name, s.stop_lat, s.stop_lon,
             st.arrival_time, st.departure_time, st.stop_sequence
      FROM stop_times st
      JOIN stops s ON st.stop_id = s.stop_id
      WHERE st.trip_id = ?
      ORDER BY st.stop_sequence
    `).all(trip.trip_id);

    res.json({
      success: true,
      data: {
        route_id: route.route_id,
        direction_id: trip.direction_id,
        towards: trip.trip_headsign,
        stop_count: stops.length,
        stops: stops
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
