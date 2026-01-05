const express = require("express");
const cors = require("cors");
const path = require("path");

// Import routes
const busRoutes = require("./routes/bus.routes");
const metroRoutes = require("./routes/metro.routes");
const searchRoutes = require("./routes/search.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Dubai Transit API - Bus & Metro",
    version: "1.0.0",
    endpoints: {
      bus: "/api/bus",
      metro: "/api/metro",
      search: "/api/search",
    },
  });
});

// Routes
app.use("/api/bus", busRoutes);
app.use("/api/metro", metroRoutes);
app.use("/api/search", searchRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`🚌 Dubai Transit API running on http://localhost:${PORT}`);
  console.log(`📋 Test with Postman: GET http://localhost:${PORT}/`);
});

module.exports = app;
