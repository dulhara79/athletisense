/**
 * src/routes/metricsRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Operational observability endpoints.
 *
 *   GET /health          — liveness probe (no auth, used by Docker/k8s)
 *   GET /api/v1/metrics  — detailed system metrics (auth required in prod)
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const express = require("express");
const router = express.Router();
const os = require("os");
const { db } = require("../config/firebase");

/* ── Shared counters (incremented by server.js) ──────────────── */
const counters = {
  requests: 0,
  errors: 0,
  ws_clients: 0,
  started_at: new Date().toISOString(),
};

function inc(key) {
  counters[key] = (counters[key] || 0) + 1;
}

/* ── GET /health — liveness probe ───────────────────────────── */
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "athletisense-backend",
    version: process.env.npm_package_version || "2.0.0",
    uptime: Math.floor(process.uptime()),
    ts: new Date().toISOString(),
  });
});

/* ── GET /api/v1/metrics — system + Firebase metrics ─────────── */
router.get("/metrics", async (req, res) => {
  const memMB = (v) => Math.round(v / 1024 / 1024);
  const mem = process.memoryUsage();
  const load = os.loadavg();

  let firebaseOk = false;
  let athleteCount = 0;
  try {
    if (db) {
      const snap = await db.ref("athlete_records").once("value");
      firebaseOk = true;
      athleteCount = snap.exists() ? Object.keys(snap.val()).length : 0;
    }
  } catch {
    /* Firebase unreachable */
  }

  res.json({
    service: "athletisense-backend",
    version: process.env.npm_package_version || "2.0.0",
    env: process.env.NODE_ENV || "development",
    uptime_s: Math.floor(process.uptime()),
    started_at: counters.started_at,

    process: {
      pid: process.pid,
      node: process.version,
      heap_used_mb: memMB(mem.heapUsed),
      heap_total_mb: memMB(mem.heapTotal),
      rss_mb: memMB(mem.rss),
    },

    system: {
      platform: os.platform(),
      cpus: os.cpus().length,
      load_1m: load[0].toFixed(2),
      load_5m: load[1].toFixed(2),
      free_mem_mb: memMB(os.freemem()),
      total_mem_mb: memMB(os.totalmem()),
    },

    firebase: {
      connected: firebaseOk,
      athlete_count: athleteCount,
    },

    counters,
    generated_at: new Date().toISOString(),
  });
});

module.exports = { router, inc };
