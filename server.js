const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { ErrorMiddleware } = require("./middleware/error");
const newsRoutes = require("./routes/newsRoutes");

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

// API Routes
app.use("/news", newsRoutes);
app.use("/api/news", newsRoutes); // Alternative API path

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "News Generation Backend API",
    version: "1.0.0",
    documentation: {
      health: "GET /health",
      news: {
        list: "GET /news or GET /api/news",
        single: "GET /news/:id",
        latest: "GET /news/latest",
        search: "GET /news/search?q=query",
        fetch: "POST /news/fetch",
        rss: "GET /news/rss or GET /news/rss.xml",
        stats: "GET /news/admin/stats",
        test: "GET /news/test-db"
      }
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
  console.log(`📰 News API: http://localhost:${PORT}/news`);
  console.log(`📡 RSS Feed: http://localhost:${PORT}/news/rss`);
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
