/**
 * src/routes/athleteRoutes.js
 * ─────────────────────────────────────────────────────────────
 * REST endpoints for athlete data.
 *
 *   GET /api/athletes               — list all athletes + latest snapshot
 *   GET /api/athletes/:id           — full profile for one athlete
 *   GET /api/athletes/:id/latest    — latest snapshot only
 *   GET /api/athletes/:id/history   — archived readings (newest first, ?limit=N)
 *   GET /api/summary                — aggregated stats across all athletes
 */

"use strict";

const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const { requireFirebase } = require("../middleware/index");
const { requireAuth } = require("../middleware/auth");
const { getMeta } = require("../config/athletes");
const svc = require("../services/athleteService");

/* ── GET /api/athletes ──────────────────────────────────────── */

router.get("/athletes", requireFirebase, requireAuth, async (req, res, next) => {
  try {
    const athletes = await svc.buildAthleteList();
    res.json({ athletes, count: athletes.length });
  } catch (err) {
    logger.error("[GET /api/athletes]", {
      message: err.message,
      request_id: req.id,
    });
    next(err);
  }
});

/* ── GET /api/athletes/:id ───────────────────────────────────── */

router.get("/athletes/:id", requireFirebase, requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!(await svc.athleteExists(id))) {
      return res
        .status(404)
        .json({ error: `Athlete '${id}' not found.`, request_id: req.id });
    }

    const [latest, history] = await Promise.all([
      svc.fetchLatest(id),
      svc.fetchHistory(id),
    ]);

    const meta = getMeta(id);

    res.json({
      id,
      name: meta.name,
      sport: meta.sport,
      latest: latest ?? null,
      reading_count: history.length,
      stats: svc.computeStats(
        history.length ? history : latest ? [latest] : [],
      ),
    });
  } catch (err) {
    logger.error(`[GET /api/athletes/${req.params.id}]`, {
      message: err.message,
      request_id: req.id,
    });
    next(err);
  }
});

/* ── GET /api/athletes/:id/latest ───────────────────────────── */

router.get("/athletes/:id/latest", requireFirebase, requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const latest = await svc.fetchLatest(id);

    if (!latest) {
      return res
        .status(404)
        .json({
          error: `No latest data for athlete '${id}'.`,
          request_id: req.id,
        });
    }

    const meta = getMeta(id);
    res.json({ id, name: meta.name, sport: meta.sport, ...latest });
  } catch (err) {
    logger.error(`[GET /api/athletes/${req.params.id}/latest]`, {
      message: err.message,
      request_id: req.id,
    });
    next(err);
  }
});

/* ── GET /api/athletes/:id/history ──────────────────────────── */

router.get("/athletes/:id/history", requireFirebase, requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ?limit query param
    const rawLimit = req.query.limit;
    let limit = null;
    if (rawLimit !== undefined) {
      limit = parseInt(rawLimit, 10);
      if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
        return res.status(400).json({
          error: 'Query param "limit" must be an integer between 1 and 10000.',
          request_id: req.id,
        });
      }
    }

    const history = await svc.fetchHistory(id, limit);

    if (!history.length) {
      return res
        .status(404)
        .json({
          error: `No reading history for athlete '${id}'.`,
          request_id: req.id,
        });
    }

    const meta = getMeta(id);
    res.json({
      id,
      name: meta.name,
      sport: meta.sport,
      count: history.length,
      readings: history,
    });
  } catch (err) {
    logger.error(`[GET /api/athletes/${req.params.id}/history]`, {
      message: err.message,
      request_id: req.id,
    });
    next(err);
  }
});

/* ── GET /api/summary ───────────────────────────────────────── */

router.get("/summary", requireFirebase, requireAuth, async (req, res, next) => {
  try {
    const summary = await svc.buildSummary();
    res.json({
      summary,
      count: summary.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("[GET /api/summary]", {
      message: err.message,
      request_id: req.id,
    });
    next(err);
  }
});

module.exports = router;
