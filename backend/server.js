/**
 * Dubai Transit API Server
 * 
 * A lightweight API for Dubai Bus & Metro journey planning
 * Uses optimized offline database (~1.3 MB) for fast queries
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

// Import routes
const busRoutes = require("./routes/bus.routes");
const metroRoutes = require("./routes/metro.routes");
const searchRoutes = require("./routes/search.routes");

// Import database for stats
const { getDb, OFFLINE_DB_PATH } = require("./db/offline-database");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * GET /
 * Health check and API info
 */
app.get("/", (req, res) => {
  // Get database stats
  let stats = {};
  try {
    const db = getDb();
    stats = {
      routes: db.prepare('SELECT COUNT(*) as count FROM routes').get().count,
      stops: db.prepare('SELECT COUNT(*) as count FROM stops').get().count,
      patterns: db.prepare('SELECT COUNT(*) as count FROM route_patterns').get().count,
      metro_lines: db.prepare('SELECT COUNT(*) as count FROM metro_lines').get().count,
    };

    // Get database file size
    if (fs.existsSync(OFFLINE_DB_PATH)) {
      const dbStats = fs.statSync(OFFLINE_DB_PATH);
      stats.database_size_mb = (dbStats.size / (1024 * 1024)).toFixed(2);
    }
  } catch (e) {
    stats.error = e.message;
  }

  res.json({
    message: "🚌 Dubai Transit API - Bus & Metro",
    version: "2.0.0",
    status: "online",
    database: {
      type: "Optimized Offline SQLite",
      size_mb: stats.database_size_mb || "unknown",
      routes: stats.routes,
      stops: stats.stops,
      patterns: stats.patterns,
      metro_lines: stats.metro_lines
    },
    endpoints: {
      bus: {
        list: "GET /api/bus",
        search: "GET /api/bus/search?q=8",
        details: "GET /api/bus/:busNumber",
        stops: "GET /api/bus/:busNumber/stops?direction=0"
      },
      metro: {
        lines: "GET /api/metro",
        details: "GET /api/metro/:lineId",
        stations: "GET /api/metro/:lineId/stations?direction=0"
      },
      search: {
        stops: "GET /api/search/stops?q=marina",
        journey: "GET /api/search/route?from=STOP_ID&to=STOP_ID",
        route_details: "GET /api/search/route/:routeId/details",
        stop_routes: "GET /api/search/stop/:stopId/routes",
        nearby: "GET /api/search/nearby?lat=25.2&lon=55.3&radius=500"
      }
    }
  });
});

// API Routes
app.use("/api/bus", busRoutes);
app.use("/api/metro", metroRoutes);
app.use("/api/search", searchRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: "Something went wrong!",
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    suggestion: "Visit / for available endpoints"
  });
});

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚌 Dubai Transit API v2.0`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📊 Database: Optimized Offline (~1.3 MB)`);
  console.log(`\n📋 Quick Test URLs:`);
  console.log(`   • Health: http://localhost:${PORT}/`);
  console.log(`   • All Buses: http://localhost:${PORT}/api/bus`);
  console.log(`   • Bus 8: http://localhost:${PORT}/api/bus/8`);
  console.log(`   • Metro Lines: http://localhost:${PORT}/api/metro`);
  console.log(`   • Search Stops: http://localhost:${PORT}/api/search/stops?q=marina`);
  console.log(`${'='.repeat(50)}\n`);
});

module.exports = app;
