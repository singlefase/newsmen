const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { ErrorMiddleware } = require("./middleware/error");
const v1NewsRoutes = require("./routes/v1NewsRoutes");
const v1NewsController = require("./controllers/v1NewsController");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['*'];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static("public"));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// V1 API Routes - New 6 APIs
app.use("/api/v1", v1NewsRoutes);

// API 7: Real RSS Feed (Keep from old code)
app.get("/real/news/rss", v1NewsController.getRealRSS);

// API Documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "News Generation Backend API v1",
    version: "1.0.0",
    documentation: {
      health: "GET /health",
      apis: {
        "API 1 - Fetch Google News": "POST /api/v1/fetch-google-news",
        "API 2 - Get Google News": "GET /api/v1/google-news?page=1&limit=10",
        "API 3 - Fetch External RSS": "POST /api/v1/fetch-external-rss",
        "API 4 - Process News": "POST /api/v1/process-news",
        "API 5 - RSS Feed": "GET /api/v1/rss-feed",
        "API 6 - JSON News": "GET /api/v1/news",
        "API 7 - Real RSS": "GET /real/news/rss"
      },
      frontend: "GET / (API Tester Interface)"
    }
  });
});

// Error handling middleware (must be last)
app.use(ErrorMiddleware);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 News Generation Backend Server");
  console.log("=".repeat(50));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend Tester: http://localhost:${PORT}/`);
  console.log(`📰 V1 API: http://localhost:${PORT}/api/v1`);
  console.log(`📡 RSS Feed: http://localhost:${PORT}/api/v1/rss-feed`);
  console.log(`📡 Real RSS: http://localhost:${PORT}/real/news/rss`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log("=".repeat(50) + "\n");
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
