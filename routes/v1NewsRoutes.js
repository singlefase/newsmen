/**
 * V1 News Routes - New 6 APIs + getRealRSS
 */

const express = require("express");
const {
  fetchGoogleNews,
  getGoogleNews,
  fetchExternalRSS,
  processNews,
  generateRSSFeed,
  getNewsJSON,
  getRealRSS,
} = require("../controllers/v1NewsController");

const router = express.Router();

// API 1: Google News RSS Fetcher & Storage
router.post("/fetch-google-news", fetchGoogleNews);

// API 2: Legal News Retrieval from Google News Collection
router.get("/google-news", getGoogleNews);

// API 3: External RSS Fetcher with Image Download
router.post("/fetch-external-rss", fetchExternalRSS);

// API 4: News Processing with AI Rewriting
router.post("/process-news", processNews);

// API 5: Valid RSS Feed Generator
router.get("/rss-feed", generateRSSFeed);
router.get("/rss-feed.xml", generateRSSFeed);

// API 6: JSON News Feed
router.get("/news", getNewsJSON);
router.get("/news/json", getNewsJSON);

module.exports = router;
