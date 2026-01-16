/**
 * Metro Routes API
 * Updated to use the optimized offline database structure
 * 
 * Endpoints:
 * - GET /api/metro - Get all metro lines (Red, Green, Route 2020)
 * - GET /api/metro/:lineId - Get specific line details with stations
 * - GET /api/metro/:lineId/stations?direction=0 - Get stations for a direction
 */

const express = require('express');
const router = express.Router();
const { getDb, ROUTE_TYPES } = require('../db/offline-database');

/**
 * GET /api/metro
 * Get all metro lines with summary info
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    
    // Get metro lines from the dedicated metro_lines table
    const lines = db.prepare(`
      SELECT 
        ml.line_id,
        ml.line_name,
        ml.line_name_ar,
        ml.line_color,
        ml.route_id,
        r.route_long_name,
        (SELECT COUNT(*) FROM route_patterns WHERE route_id = ml.route_id) as directions,
        (SELECT total_stops FROM route_patterns WHERE route_id = ml.route_id AND direction_id = 0) as total_stations
      FROM metro_lines ml
      JOIN routes r ON ml.route_id = r.route_id
      ORDER BY ml.line_name
    `).all();

    // Get terminal stations for each line
    const linesWithTerminals = lines.map(line => {
      const pattern = db.prepare(`
        SELECT headsign, first_stop_id, last_stop_id
        FROM route_patterns
        WHERE route_id = ? AND direction_id = 0
      `).get(line.route_id);

      let from_station = '';
      let to_station = '';

      if (pattern) {
        const firstStop = db.prepare('SELECT stop_name FROM stops WHERE stop_id = ?').get(pattern.first_stop_id);
        const lastStop = db.prepare('SELECT stop_name FROM stops WHERE stop_id = ?').get(pattern.last_stop_id);
        from_station = firstStop?.stop_name || '';
        to_station = lastStop?.stop_name || '';
      }

      return {
        line_id: line.line_id,
        line_name: line.line_name,
        line_name_ar: line.line_name_ar,
        line_color: line.line_color,
        route_id: line.route_id,
        total_stations: line.total_stations || 0,
        from_station,
        to_station
      };
    });
    
    res.json({
      success: true,
      count: linesWithTerminals.length,
      data: linesWithTerminals
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metro/:lineId
 * Get specific metro line details with both directions
 */
router.get('/:lineId', (req, res) => {
  try {
    const { lineId } = req.params;
    const db = getDb();
    
    // Try to find by line_id, line_name, or route_id
    let line = db.prepare(`
      SELECT 
        ml.line_id,
        ml.line_name,
        ml.line_name_ar,
        ml.line_color,
        ml.route_id
      FROM metro_lines ml
      WHERE ml.line_id = ? OR ml.route_id = ? OR LOWER(ml.line_name) LIKE LOWER(?)
    `).get(lineId, lineId, `%${lineId}%`);

    if (!line) {
      // Try searching in routes directly
      const route = db.prepare(`
        SELECT route_id, route_short_name, route_long_name, route_color
        FROM routes
        WHERE route_type = ? AND (
          route_id = ? OR 
          route_short_name LIKE ? OR 
          LOWER(route_long_name) LIKE LOWER(?)
        )
      `).get(ROUTE_TYPES.METRO, lineId, `%${lineId}%`, `%${lineId}%`);

      if (!route) {
        return res.status(404).json({ success: false, error: `Metro line "${lineId}" not found` });
      }

      // Create line info from route
      line = {
        line_id: route.route_id,
        line_name: route.route_short_name || route.route_long_name,
        line_name_ar: '',
        line_color: route.route_color,
        route_id: route.route_id
      };
    }

    // Get both directions (patterns) for this line
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
    `).all(line.route_id);

    // Get stations for each direction
    const directions = patterns.map(pattern => {
      const stations = db.prepare(`
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

      const firstStation = stations[0];
      const lastStation = stations[stations.length - 1];

      return {
        direction_id: pattern.direction_id,
        direction_name: pattern.direction_id === 0 ? 'Upward' : 'Downward',
        headsign: pattern.headsign || (lastStation ? `To ${lastStation.stop_name}` : ''),
        from: firstStation?.stop_name || '',
        to: lastStation?.stop_name || '',
        total_stations: stations.length,
        stations: stations
      };
    });

    res.json({
      success: true,
      data: {
        line_id: line.line_id,
        line_name: line.line_name,
        line_name_ar: line.line_name_ar,
        line_color: line.line_color,
        route_id: line.route_id,
        directions: directions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metro/:lineId/stations?direction=0
 * Get all stations for a metro line in a specific direction
 */
router.get('/:lineId/stations', (req, res) => {
  try {
    const { lineId } = req.params;
    const { direction } = req.query;
    const db = getDb();
    
    // Find the metro line
    let line = db.prepare(`
      SELECT ml.line_id, ml.line_name, ml.line_name_ar, ml.line_color, ml.route_id
      FROM metro_lines ml
      WHERE ml.line_id = ? OR ml.route_id = ? OR LOWER(ml.line_name) LIKE LOWER(?)
    `).get(lineId, lineId, `%${lineId}%`);

    if (!line) {
      // Try routes directly
      const route = db.prepare(`
        SELECT route_id, route_short_name, route_long_name, route_color
        FROM routes
        WHERE route_type = ? AND (route_id = ? OR route_short_name LIKE ?)
      `).get(ROUTE_TYPES.METRO, lineId, `%${lineId}%`);

      if (!route) {
        return res.status(404).json({ success: false, error: `Metro line "${lineId}" not found` });
      }

      line = {
        line_id: route.route_id,
        line_name: route.route_short_name || route.route_long_name,
        line_name_ar: '',
        line_color: route.route_color,
        route_id: route.route_id
      };
    }

    // Get the pattern for the requested direction
    const directionId = direction !== undefined ? parseInt(direction) : 0;
    
    const pattern = db.prepare(`
      SELECT pattern_id, direction_id, headsign, total_stops
      FROM route_patterns 
      WHERE route_id = ? AND direction_id = ?
    `).get(line.route_id, directionId);

    if (!pattern) {
      return res.status(404).json({ 
        success: false, 
        error: `Direction ${directionId} not found for metro line ${line.line_name}` 
      });
    }

    // Get all stations for this pattern
    const stations = db.prepare(`
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

    const firstStation = stations[0];
    const lastStation = stations[stations.length - 1];

    res.json({
      success: true,
      data: {
        line_id: line.line_id,
        line_name: line.line_name,
        line_name_ar: line.line_name_ar,
        line_color: line.line_color,
        route_id: line.route_id,
        direction_id: pattern.direction_id,
        direction_name: pattern.direction_id === 0 ? 'Upward' : 'Downward',
        headsign: pattern.headsign || (lastStation ? `To ${lastStation.stop_name}` : ''),
        from: firstStation?.stop_name || '',
        to: lastStation?.stop_name || '',
        total_stations: stations.length,
        stations: stations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
