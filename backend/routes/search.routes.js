/**
 * Search Routes API
 * Updated to use the optimized offline database structure
 * 
 * Endpoints:
 * - GET /api/search/stops?q=marina - Search for stops by name
 * - GET /api/search/route?from=STOP_ID&to=STOP_ID - Journey planner
 * - GET /api/search/stop/:stopId/routes - Get all routes serving a stop
 */

const express = require('express');
const router = express.Router();
const { getDb, ROUTE_TYPES } = require('../db/offline-database');

/**
 * GET /api/search/stops?q=gold souq
 * Search for stops/stations by name (Fuzzy Search)
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
    const words = q.trim().toLowerCase().split(/\s+/);
    const fuzzyPattern = '%' + words.join('%') + '%';
    
    let stops = db.prepare(`
      SELECT stop_id, stop_name, stop_lat, stop_lon, location_type
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
      stops = db.prepare(`
        SELECT stop_id, stop_name, stop_lat, stop_lon, location_type
        FROM stops 
        WHERE LOWER(stop_name) LIKE ?
        ORDER BY LENGTH(stop_name)
        LIMIT 20
      `).all(`%${words[0]}%`);
    }
    
    res.json({
      success: true,
      count: stops.length,
      query: q,
      data: stops.map(s => ({
        ...s,
        type: s.location_type === 1 ? 'Station' : 'Stop'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/route?from=STOP_ID&to=STOP_ID
 * Journey Planner - Find routes from one stop to another
 * Returns direct routes and transfer routes (1 change)
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
    const fromStop = db.prepare('SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?').get(from);
    const toStop = db.prepare('SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?').get(to);
    
    if (!fromStop) {
      return res.status(404).json({ success: false, error: `From stop "${from}" not found` });
    }
    if (!toStop) {
      return res.status(404).json({ success: false, error: `To stop "${to}" not found` });
    }

    // ========== STEP 1: Find Direct Routes ==========
    // Using the new stop_routes and pattern_stops tables
    const directRoutes = db.prepare(`
      SELECT DISTINCT 
        r.route_id,
        r.route_short_name,
        r.route_long_name,
        r.route_type,
        r.route_color,
        rp.pattern_id,
        rp.direction_id,
        rp.headsign,
        ps1.stop_sequence as from_sequence,
        ps2.stop_sequence as to_sequence
      FROM stop_routes sr1
      JOIN stop_routes sr2 ON sr1.route_id = sr2.route_id AND sr1.direction_id = sr2.direction_id
      JOIN routes r ON sr1.route_id = r.route_id
      JOIN route_patterns rp ON r.route_id = rp.route_id AND sr1.direction_id = rp.direction_id
      JOIN pattern_stops ps1 ON rp.pattern_id = ps1.pattern_id AND ps1.stop_id = ?
      JOIN pattern_stops ps2 ON rp.pattern_id = ps2.pattern_id AND ps2.stop_id = ?
      WHERE sr1.stop_id = ? 
        AND sr2.stop_id = ?
        AND ps1.stop_sequence < ps2.stop_sequence
      ORDER BY (ps2.stop_sequence - ps1.stop_sequence)
      LIMIT 5
    `).all(from, to, from, to);

    if (directRoutes.length > 0) {
      const formattedRoutes = directRoutes.map(r => {
        // Get all stops between from and to for this route
        const stopsOnRoute = db.prepare(`
          SELECT 
            ps.stop_sequence,
            s.stop_id,
            s.stop_name,
            s.stop_lat,
            s.stop_lon
          FROM pattern_stops ps
          JOIN stops s ON ps.stop_id = s.stop_id
          WHERE ps.pattern_id = ? AND ps.stop_sequence >= ? AND ps.stop_sequence <= ?
          ORDER BY ps.stop_sequence
        `).all(r.pattern_id, r.from_sequence, r.to_sequence);

        return {
          type: 'direct',
          legs: 1,
          route_id: r.route_id,
          route_name: r.route_short_name,
          route_full_name: r.route_long_name,
          transport_type: r.route_type === ROUTE_TYPES.METRO ? 'Metro' : 'Bus',
          color: r.route_color,
          direction_id: r.direction_id,
          headsign: r.headsign,
          from_stop: fromStop.stop_name,
          to_stop: toStop.stop_name,
          stops_count: r.to_sequence - r.from_sequence + 1,
          stops: stopsOnRoute
        };
      });

      return res.json({
        success: true,
        route_type: 'direct',
        from: fromStop,
        to: toStop,
        count: formattedRoutes.length,
        data: formattedRoutes
      });
    }

    // ========== STEP 2: Find Transfer Routes ==========
    // Get all routes from origin stop
    const fromRoutes = db.prepare(`
      SELECT DISTINCT 
        sr.route_id,
        sr.direction_id,
        r.route_short_name,
        r.route_type,
        r.route_color
      FROM stop_routes sr
      JOIN routes r ON sr.route_id = r.route_id
      WHERE sr.stop_id = ?
    `).all(from);

    // Get all routes to destination stop  
    const toRoutes = db.prepare(`
      SELECT DISTINCT 
        sr.route_id,
        sr.direction_id,
        r.route_short_name,
        r.route_type,
        r.route_color
      FROM stop_routes sr
      JOIN routes r ON sr.route_id = r.route_id
      WHERE sr.stop_id = ?
    `).all(to);

    // Find transfer points
    const transferRoutes = [];
    
    for (const fromRoute of fromRoutes) {
      // Get all stops reachable from origin on this route
      const fromPattern = db.prepare(`
        SELECT pattern_id FROM route_patterns 
        WHERE route_id = ? AND direction_id = ?
      `).get(fromRoute.route_id, fromRoute.direction_id);

      if (!fromPattern) continue;

      // Get the sequence of origin stop
      const fromSeq = db.prepare(`
        SELECT stop_sequence FROM pattern_stops 
        WHERE pattern_id = ? AND stop_id = ?
      `).get(fromPattern.pattern_id, from);

      if (!fromSeq) continue;

      // Get all stops after origin on this route
      const reachableStops = db.prepare(`
        SELECT ps.stop_id, ps.stop_sequence, s.stop_name
        FROM pattern_stops ps
        JOIN stops s ON ps.stop_id = s.stop_id
        WHERE ps.pattern_id = ? AND ps.stop_sequence > ?
      `).all(fromPattern.pattern_id, fromSeq.stop_sequence);

      // For each reachable stop, check if any toRoute serves it before destination
      for (const stop of reachableStops) {
        for (const toRoute of toRoutes) {
          // Skip same route (already checked in direct)
          if (toRoute.route_id === fromRoute.route_id) continue;

          // Check if this stop is on the toRoute before the destination
          const toPattern = db.prepare(`
            SELECT pattern_id FROM route_patterns 
            WHERE route_id = ? AND direction_id = ?
          `).get(toRoute.route_id, toRoute.direction_id);

          if (!toPattern) continue;

          const transferSeq = db.prepare(`
            SELECT stop_sequence FROM pattern_stops 
            WHERE pattern_id = ? AND stop_id = ?
          `).get(toPattern.pattern_id, stop.stop_id);

          if (!transferSeq) continue;

          const destSeq = db.prepare(`
            SELECT stop_sequence FROM pattern_stops 
            WHERE pattern_id = ? AND stop_id = ?
          `).get(toPattern.pattern_id, to);

          if (!destSeq || transferSeq.stop_sequence >= destSeq.stop_sequence) continue;

          // Found a valid transfer!
          transferRoutes.push({
            transfer_stop_id: stop.stop_id,
            transfer_stop_name: stop.stop_name,
            route1: {
              route_id: fromRoute.route_id,
              route_name: fromRoute.route_short_name,
              transport_type: fromRoute.route_type === ROUTE_TYPES.METRO ? 'Metro' : 'Bus',
              color: fromRoute.route_color
            },
            route2: {
              route_id: toRoute.route_id,
              route_name: toRoute.route_short_name,
              transport_type: toRoute.route_type === ROUTE_TYPES.METRO ? 'Metro' : 'Bus',
              color: toRoute.route_color
            }
          });

          if (transferRoutes.length >= 5) break;
        }
        if (transferRoutes.length >= 5) break;
      }
      if (transferRoutes.length >= 5) break;
    }

    if (transferRoutes.length > 0) {
      const formattedTransfers = transferRoutes.map(t => ({
        type: 'transfer',
        legs: 2,
        leg1: {
          route_id: t.route1.route_id,
          route_name: t.route1.route_name,
          transport_type: t.route1.transport_type,
          color: t.route1.color,
          from: fromStop.stop_name,
          to: t.transfer_stop_name
        },
        transfer_at: {
          stop_id: t.transfer_stop_id,
          stop_name: t.transfer_stop_name
        },
        leg2: {
          route_id: t.route2.route_id,
          route_name: t.route2.route_name,
          transport_type: t.route2.transport_type,
          color: t.route2.color,
          from: t.transfer_stop_name,
          to: toStop.stop_name
        }
      }));

      return res.json({
        success: true,
        route_type: 'transfer',
        message: 'No direct route. Here are routes with 1 change:',
        from: fromStop,
        to: toStop,
        count: formattedTransfers.length,
        data: formattedTransfers
      });
    }

    // ========== STEP 3: No Route Found ==========
    return res.json({
      success: true,
      route_type: 'none',
      message: 'No route found. These stops may be too far apart or not connected by public transport.',
      from: fromStop,
      to: toStop,
      suggestion: 'Try searching for nearby stops or use Metro + Bus combination.',
      data: []
    });

  } catch (error) {
    console.error('Route search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/route/:routeId/details
 * Get full details of a route (for when user clicks on a journey result)
 */
router.get('/route/:routeId/details', (req, res) => {
  try {
    const { routeId } = req.params;
    const { direction } = req.query;
    const db = getDb();
    
    // Get route info
    const route = db.prepare(`
      SELECT route_id, route_short_name, route_long_name, route_type, route_color
      FROM routes 
      WHERE route_id = ? OR route_short_name = ?
    `).get(routeId, routeId);

    if (!route) {
      return res.status(404).json({ success: false, error: `Route "${routeId}" not found` });
    }

    // Get patterns for this route
    const patterns = db.prepare(`
      SELECT pattern_id, direction_id, headsign, first_stop_id, last_stop_id, total_stops
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
        route_name: route.route_short_name,
        route_full_name: route.route_long_name,
        transport_type: route.route_type === ROUTE_TYPES.METRO ? 'Metro' : 'Bus',
        color: route.route_color,
        directions: directions
      }
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
      SELECT stop_id, stop_name, stop_lat, stop_lon, location_type
      FROM stops WHERE stop_id = ?
    `).get(stopId);

    if (!stop) {
      return res.status(404).json({ success: false, error: 'Stop not found' });
    }

    // Get all routes passing this stop using stop_routes table
    const routes = db.prepare(`
      SELECT DISTINCT 
        r.route_id,
        r.route_short_name,
        r.route_long_name,
        r.route_type,
        r.route_color,
        sr.direction_id,
        rp.headsign
      FROM stop_routes sr
      JOIN routes r ON sr.route_id = r.route_id
      LEFT JOIN route_patterns rp ON r.route_id = rp.route_id AND sr.direction_id = rp.direction_id
      WHERE sr.stop_id = ?
      ORDER BY r.route_type, r.route_short_name
    `).all(stopId);

    res.json({
      success: true,
      data: {
        stop: {
          ...stop,
          type: stop.location_type === 1 ? 'Station' : 'Stop'
        },
        routes_count: routes.length,
        routes: routes.map(r => ({
          route_id: r.route_id,
          route_name: r.route_short_name,
          route_full_name: r.route_long_name,
          transport_type: r.route_type === ROUTE_TYPES.METRO ? 'Metro' : 'Bus',
          color: r.route_color,
          direction_id: r.direction_id,
          headsign: r.headsign
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/nearby?lat=25.2&lon=55.3&radius=500
 * Find stops near a location
 */
router.get('/nearby', (req, res) => {
  try {
    const { lat, lon, radius = 500 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ 
        success: false, 
        error: 'lat and lon query parameters are required' 
      });
    }

    const db = getDb();
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radiusKm = parseFloat(radius) / 1000;

    // Approximate degree conversion (1 degree ≈ 111km at equator)
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

    const stops = db.prepare(`
      SELECT 
        stop_id, 
        stop_name, 
        stop_lat, 
        stop_lon, 
        location_type
      FROM stops 
      WHERE stop_lat BETWEEN ? AND ?
        AND stop_lon BETWEEN ? AND ?
      ORDER BY 
        ((stop_lat - ?) * (stop_lat - ?) + (stop_lon - ?) * (stop_lon - ?))
      LIMIT 20
    `).all(
      latitude - latDelta, latitude + latDelta,
      longitude - lonDelta, longitude + lonDelta,
      latitude, latitude, longitude, longitude
    );

    // Calculate approximate distance for each stop
    const stopsWithDistance = stops.map(stop => {
      const dLat = (stop.stop_lat - latitude) * 111;
      const dLon = (stop.stop_lon - longitude) * 111 * Math.cos(latitude * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLon * dLon) * 1000; // meters

      return {
        ...stop,
        type: stop.location_type === 1 ? 'Station' : 'Stop',
        distance_meters: Math.round(distance)
      };
    });

    res.json({
      success: true,
      count: stopsWithDistance.length,
      location: { lat: latitude, lon: longitude },
      radius_meters: parseFloat(radius),
      data: stopsWithDistance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
