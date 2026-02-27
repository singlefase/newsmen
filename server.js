const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const { ErrorMiddleware } = require("./middleware/error");
const v1NewsRoutes = require("./routes/v1NewsRoutes");
const v1NewsController = require("./controllers/v1NewsController");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const AUTH_COOKIE_NAME = "newsmen_auth";
const AUTH_SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET || "change-this-auth-secret-in-env";
const AUTH_USERNAME = process.env.AUTH_USERNAME || "admin";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "admin123";
const AUTH_SESSION_HOURS = Number(process.env.AUTH_SESSION_HOURS || 24);

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

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");
    if (!rawName) return;
    cookies[rawName] = decodeURIComponent(rawValueParts.join("=") || "");
  });
  return cookies;
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", AUTH_SESSION_SECRET)
    .update(payload)
    .digest("hex");
}

function createSessionToken(username) {
  const exp = Date.now() + AUTH_SESSION_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ username, exp })).toString(
    "base64url"
  );
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = signPayload(payload);
  if (signature !== expected) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );
    if (!decoded?.username || !decoded?.exp) return null;
    if (Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = AUTH_SESSION_HOURS * 60 * 60;
  const cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    secure ? "; Secure" : ""
  }`;
  res.setHeader("Set-Cookie", cookie);
}

function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === "production";
  const cookie = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
    secure ? "; Secure" : ""
  }`;
  res.setHeader("Set-Cookie", cookie);
}

function isApiRequest(req) {
  return req.path.startsWith("/api/");
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[AUTH_COOKIE_NAME];
  const session = verifySessionToken(token);

  if (!session) {
    if (isApiRequest(req)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }
    return res.redirect("/login");
  }

  req.user = { username: session.username };
  next();
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Login page
app.get("/login", (req, res) => {
  const cookies = parseCookies(req);
  const session = verifySessionToken(cookies[AUTH_COOKIE_NAME]);
  if (session) {
    return res.redirect("/flow-check");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Auth APIs
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }

  const token = createSessionToken(username);
  setAuthCookie(res, token);
  return res.json({
    success: true,
    message: "Login successful",
    user: { username },
  });
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

app.get("/api/auth/me", (req, res) => {
  const cookies = parseCookies(req);
  const session = verifySessionToken(cookies[AUTH_COOKIE_NAME]);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
  res.json({
    success: true,
    user: { username: session.username },
  });
});

// Protect whole website + APIs below
app.use(requireAuth);

// Serve static files (frontend) without auto-serving /index.html at root
app.use(express.static("public", { index: false }));

// Root route disabled
app.get("/", (req, res) => {
  res.status(404).json({
    success: false,
    message: "This route is disabled. Use /flow-check",
  });
});

// Flow check page (previous root UI)
app.get("/flow-check", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Keep automate page accessible with and without trailing slash
app.get("/automate", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "automate", "index.html"));
});

app.get("/automate/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "automate", "index.html"));
});

// Public config for frontend tools (safe values only)
app.get("/api/public-config", (req, res) => {
  const rssBaseUrl =
    process.env.RSS_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.BASE_URL ||
    "https://news.swadeshconnect.com/";

  res.json({
    success: true,
    rssBaseUrl,
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
    auth: {
      enabled: true,
      loginPage: "/login",
      loginApi: "POST /api/auth/login",
    },
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
      frontend: "GET /flow-check (API Tester Interface)"
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
  console.log(`🔐 Login Page: http://localhost:${PORT}/login`);
  console.log(`🌐 Frontend Tester: http://localhost:${PORT}/flow-check`);
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
