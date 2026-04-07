/**
 * src/server.js — AthletiSense Backend v2.0 Production Entry Point
 *
 * Route map:
 *   GET  /health                                  — liveness probe
 *   GET  /api/v1/metrics                          — system metrics
 *   GET  /api/v1/athletes[/:id][/latest|/history] — athlete data
 *   GET  /api/v1/summary                          — cross-athlete stats
 *   POST /api/v1/chat                             — AI agent
 *   GET  /api/v1/chat/suggestions
 *   GET  /api/v1/analytics/athlete/:id/trend
 *   GET  /api/v1/analytics/athlete/:id/fatigue
 *   GET  /api/v1/analytics/athlete/:id/timeseries
 *   GET  /api/v1/analytics/athlete/:id/narrative
 *   GET  /api/v1/analytics/comparison
 *   GET  /api/v1/analytics/leaderboard
 *   GET  /api/v1/analytics/anomalies
 *   GET  /api/v1/analytics/performance-zones
 *   WS   ws://host:PORT — real-time Firebase push
 */
"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const logger = require("./config/logger");
const {
  requestId,
  sanitiseInput,
  notFound,
  errorHandler,
} = require("./middleware/index");
const athleteRoutes = require("./routes/athleteRoutes");
const chatRoutes = require("./routes/chatRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { router: metricsRouter, inc } = require("./routes/metricsRoutes");
const { attachWebSocket } = require("./services/websocketService");
const { refreshMeta, watchMeta } = require("./config/athletes");

const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────
app.use(
  helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }),
);

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow local development (Vite frontend, etc) and requests with no origin
      if (!origin || origin.startsWith("http://localhost:") || origin === "http://127.0.0.1:5173") {
        return cb(null, true);
      }
      
      if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      cb(new Error(`CORS: origin '${origin}' not allowed.`));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  }),
);

// ── Body + logging + tracing + sanitisation ───────────────────
app.use(compression());
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(morgan("combined", { stream: logger.stream }));
app.use(requestId);
app.use(sanitiseInput);
app.use((_req, _res, next) => {
  inc("requests");
  next();
});

// ── Rate limiters ─────────────────────────────────────────────
const limiter = (max) =>
  rateLimit({
    windowMs: 60_000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded. Please wait." },
    skip: (req) => req.path === "/health",
  });

app.use(
  "/api/v1/chat",
  limiter(parseInt(process.env.CHAT_RATE_LIMIT_RPM, 10) || 30),
);
app.use(
  "/api/v1/analytics",
  limiter(parseInt(process.env.ANALYTICS_RATE_LIMIT_RPM, 10) || 60),
);
app.use(
  "/api/v1",
  limiter(parseInt(process.env.API_RATE_LIMIT_RPM, 10) || 120),
);

// ── Health probe (no auth) ────────────────────────────────────
app.use(metricsRouter); // mounts /health

// ── Versioned routes ──────────────────────────────────────────
app.use("/api/v1", athleteRoutes);
app.use("/api/v1", chatRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1", metricsRouter); // mounts /api/v1/metrics

// ── Legacy redirect (backwards compat for /api/* → /api/v1/*) -
app.use("/api", (req, res) => res.redirect(301, "/api/v1" + req.url));

// ── Error handlers ────────────────────────────────────────────
app.use(notFound);
app.use((err, req, res, next) => {
  inc("errors");
  errorHandler(err, req, res, next);
});

// ── WebSocket ─────────────────────────────────────────────────
attachWebSocket(server);

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3001;
server.listen(PORT, async () => {
  logger.info("AthletiSense Backend running", {
    port: PORT,
    env: process.env.NODE_ENV || "development",
    http: `http://localhost:${PORT}`,
    ws: `ws://localhost:${PORT}`,
  });
  // Warm athlete metadata cache from Firebase /users, then watch for live changes
  await refreshMeta();
  watchMeta();
  logger.info("[athletes] Dynamic metadata ready.");
});

// ── Graceful shutdown ─────────────────────────────────────────
const shutdown = (sig) => {
  logger.info(`[${sig}] Graceful shutdown…`);
  server.close((err) => {
    if (err) {
      logger.error("Close error", { message: err.message });
      process.exit(1);
    }
    logger.info("Exiting cleanly.");
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("Forced shutdown.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (r) =>
  logger.error("Unhandled rejection", { reason: String(r) }),
);
process.on("uncaughtException", (e) => {
  logger.error("Uncaught exception", { message: e.message });
  process.exit(1);
});

module.exports = { app, server };
