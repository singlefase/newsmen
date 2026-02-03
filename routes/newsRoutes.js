const express = require("express");
const {
  fetchAndProcessNews,
  getAllNews,
  getNewsById,
  getLatestNews,
  searchNews,
  deleteNews,
  getNewsStats,
  testDatabase,
  generateRSSFeed
} = require("../controllers/newsController");

const newsRouter = express.Router();

// RSS Feed endpoint (must come before /:id to avoid route conflicts)
newsRouter.get("/rss", generateRSSFeed);
newsRouter.get("/rss.xml", generateRSSFeed);

// API routes (must come before /:id to avoid route conflicts)
newsRouter.get("/api", getAllNews);
newsRouter.get("/latest", getLatestNews);
newsRouter.get("/search", searchNews);

// Root endpoint - return API info or news list
newsRouter.get("/", (req, res) => {
  // Check if it's an API request (Accept header or query param)
  const hasJsonAccept = req.headers.accept && req.headers.accept.includes('application/json');
  const hasFormatJson = req.query.format === 'json';
  const hasPageParam = req.query.page !== undefined;
  
  // If any of these conditions are true, it's an API request
  if (hasJsonAccept || hasFormatJson || hasPageParam) {
    console.log('[News Route] API request detected:', { hasJsonAccept, hasFormatJson, hasPageParam, query: req.query });
    return getAllNews(req, res);
  }
  
  // Return API information
  return res.json({
    success: true,
    message: "News Generation API",
    version: "1.0.0",
    endpoints: {
      "GET /": "API information",
      "GET /api": "Get all news (paginated)",
      "GET /api?page=1&limit=10": "Get paginated news",
      "GET /:id": "Get single news article",
      "GET /latest": "Get latest news",
      "GET /search?q=query": "Search news",
      "POST /fetch": "Fetch and process news from RSS",
      "GET /rss": "RSS feed (for WordPress aggregator)",
      "GET /rss.xml": "RSS feed (alternative)",
      "GET /test-db": "Test database connection"
    }
  });
});

// News detail - get by ID
newsRouter.get("/:id", (req, res) => {
  return getNewsById(req, res);
});

// Fetch news endpoint (public - for generating news)
newsRouter.post("/fetch", (req, res) => {
  console.log("\n🔥 [ROUTE] /news/fetch endpoint called");
  console.log("   Method:", req.method);
  console.log("   Body:", req.body);
  return fetchAndProcessNews(req, res);
});

// Test endpoint (public for debugging)
newsRouter.get("/test-db", testDatabase);

// Admin routes (stats and delete - can add auth later if needed)
newsRouter.get("/admin/stats", getNewsStats);
newsRouter.delete("/:id", deleteNews);

module.exports = newsRouter;
