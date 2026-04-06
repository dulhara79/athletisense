/**
 * src/routes/analyticsRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Visual Analytics & Decision-Support API
 *
 * All endpoints are prefixed /api/v1/analytics by server.js
 *
 *   GET  /athlete/:id/trend       — full trend + anomaly + correlations
 *   GET  /athlete/:id/fatigue     — fatigue/recovery score for one athlete
 *   GET  /athlete/:id/timeseries  — bucketed time series (hourly/daily)
 *   GET  /athlete/:id/narrative   — storytelling narrative for Visual Analytics page
 *   GET  /comparison              — cross-athlete comparison matrix
 *   GET  /leaderboard             — ranked athletes by chosen metric
 *   GET  /anomalies               — all current anomalies across all athletes
 *   GET  /performance-zones       — HR zone distribution per athlete
 * ─────────────────────────────────────────────────────────────
 */

"use strict";

const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const { requireFirebase } = require("../middleware/index");
const { requireAuth } = require("../middleware/auth");
const svc = require("../services/athleteService");
const analytics = require("../services/analyticsService");
const { getMeta } = require("../config/athletes");

/* ── Shared: load athlete history (with optional limit) ──────── */
async function loadHistory(id, limit = null) {
  return svc.fetchHistory(id, limit);
}

/* ── GET /athlete/:id/trend ──────────────────────────────────── */
router.get(
  "/athlete/:id/trend",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit, 10) || 120;

      if (!(await svc.athleteExists(id))) {
        return res
          .status(404)
          .json({ error: `Athlete '${id}' not found.`, request_id: req.id });
      }

      const history = await loadHistory(id, limit);
      const trend = analytics.athleteTrend(history);
      const meta = getMeta(id);

      res.json({
        id,
        name: meta.name,
        sport: meta.sport,
        trend,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error(`[GET /analytics/athlete/${req.params.id}/trend]`, {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

/* ── GET /athlete/:id/fatigue ────────────────────────────────── */
router.get(
  "/athlete/:id/fatigue",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const latest = await svc.fetchLatest(id);

      if (!latest) {
        return res
          .status(404)
          .json({ error: `No data for athlete '${id}'.`, request_id: req.id });
      }

      const meta = getMeta(id);
      const fatigue = analytics.fatigueScore(latest);
      const history = await loadHistory(id, 60);
      const load = analytics.trainingLoad(history);

      res.json({
        id,
        name: meta.name,
        sport: meta.sport,
        ...fatigue,
        training_load: load,
        last_reading_at: latest.timestamp ?? null,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error(`[GET /analytics/athlete/${req.params.id}/fatigue]`, {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

/* ── GET /athlete/:id/timeseries ─────────────────────────────── */
router.get(
  "/athlete/:id/timeseries",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const granularity = ["hourly", "daily"].includes(req.query.granularity)
        ? req.query.granularity
        : "hourly";
      const limit = parseInt(req.query.limit, 10) || 240;

      const history = await loadHistory(id, limit);
      if (!history.length) {
        return res.status(404).json({
          error: `No history for athlete '${id}'.`,
          request_id: req.id,
        });
      }

      const meta = getMeta(id);
      const series = analytics.timeBucket(history, granularity);

      res.json({
        id,
        name: meta.name,
        sport: meta.sport,
        granularity,
        count: series.length,
        series,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error(`[GET /analytics/athlete/${req.params.id}/timeseries]`, {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

/* ── GET /athlete/:id/narrative ──────────────────────────────── */
router.get(
  "/athlete/:id/narrative",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit, 10) || 60;

      const history = await loadHistory(id, limit);
      const meta = getMeta(id);
      const narrative = analytics.sessionNarrative(id, meta, history);

      if (!narrative) {
        return res.status(404).json({
          error: `No session data for athlete '${id}'.`,
          request_id: req.id,
        });
      }

      res.json({ narrative, generated_at: new Date().toISOString() });
    } catch (err) {
      logger.error(`[GET /analytics/athlete/${req.params.id}/narrative]`, {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

/* ── GET /comparison ─────────────────────────────────────────── */
router.get(
  "/comparison",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const ids = await svc.getAthleteIds();
      const limit = parseInt(req.query.limit, 10) || 60;

      // Parallel load of all athletes
      const athleteMap = Object.fromEntries(
        await Promise.all(
          ids.map(async (id) => {
            const [records] = await Promise.all([loadHistory(id, limit)]);
            return [id, { meta: getMeta(id), records }];
          }),
        ),
      );

      const comparison = analytics.buildComparison(athleteMap);
      res.json({
        comparison,
        count: comparison.length,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("[GET /analytics/comparison]", {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

/* ── GET /leaderboard?metric=hr|temp|load|fatigue&order=asc|desc */
router.get(
  "/leaderboard",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const VALID_METRICS = ["hr", "temp", "load", "fatigue", "steps"];
      const metric = VALID_METRICS.includes(req.query.metric)
        ? req.query.metric
        : "load";
      const order = req.query.order === "asc" ? "asc" : "desc";
      const limit = parseInt(req.query.limit, 10) || 60;

      const ids = await svc.getAthleteIds();

      const rows = await Promise.all(
        ids.map(async (id) => {
          const meta = getMeta(id);
          const history = await loadHistory(id, limit);
          const latest = await svc.fetchLatest(id);
          const load = analytics.trainingLoad(history);
          const { fatigue_score } = analytics.fatigueScore(latest);

          const hrVals = history
            .map((r) => r?.heart_rate?.bpm_avg ?? r?.heart_rate?.bpm ?? null)
            .filter(Number.isFinite);
          const tmpVals = history
            .map((r) => r?.temperature?.celsius ?? null)
            .filter(Number.isFinite);
          const stepVals = history
            .map((r) => r?.motion?.step_count ?? null)
            .filter(Number.isFinite);

          const value =
            metric === "hr"
              ? hrVals.length
                ? Math.round(hrVals.reduce((s, v) => s + v, 0) / hrVals.length)
                : null
              : metric === "temp"
                ? tmpVals.length
                  ? +(
                      tmpVals.reduce((s, v) => s + v, 0) / tmpVals.length
                    ).toFixed(2)
                  : null
                : metric === "load"
                  ? load.total
                  : metric === "fatigue"
                    ? fatigue_score
                    : metric === "steps"
                      ? (stepVals.at(-1) ?? null)
                      : null;

          return { id, name: meta.name, sport: meta.sport, metric, value };
        }),
      );

      const sorted = rows
        .filter((r) => r.value !== null)
        .sort((a, b) =>
          order === "asc" ? a.value - b.value : b.value - a.value,
        )
        .map((r, i) => ({ rank: i + 1, ...r }));

      res.json({
        leaderboard: sorted,
        metric,
        order,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("[GET /analytics/leaderboard]", {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

/* ── GET /anomalies ──────────────────────────────────────────── */
router.get(
  "/anomalies",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const ids = await svc.getAthleteIds();
      const limit = parseInt(req.query.limit, 10) || 120;
      const results = [];

      await Promise.all(
        ids.map(async (id) => {
          const meta = getMeta(id);
          const history = await loadHistory(id, limit);
          if (!history.length) return;

          const hrAnomalies = analytics.detectAnomalies(
            history,
            (r) => r?.heart_rate?.bpm_avg ?? r?.heart_rate?.bpm ?? null,
          );
          const tempAnomalies = analytics.detectAnomalies(
            history,
            (r) => r?.temperature?.celsius ?? null,
          );

          if (hrAnomalies.length || tempAnomalies.length) {
            results.push({
              id,
              name: meta.name,
              sport: meta.sport,
              anomalies: {
                heart_rate: hrAnomalies,
                temperature: tempAnomalies,
              },
            });
          }
        }),
      );

      res.json({
        total_athletes_with_anomalies: results.length,
        results,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("[GET /analytics/anomalies]", {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

/* ── GET /performance-zones ──────────────────────────────────── */
/**
 * Classifies each reading into HR training zones (Karvonen / 5-zone model)
 * and returns distribution percentages per athlete.
 * Zones (% of Max HR, using HRmax = 220 - age, default 30):
 *   Z1 Recovery  < 60%
 *   Z2 Aerobic   60-70%
 *   Z3 Tempo     70-80%
 *   Z4 Threshold 80-90%
 *   Z5 Max       > 90%
 */
router.get(
  "/performance-zones",
  requireFirebase,
  requireAuth,
  async (req, res, next) => {
    try {
      const ids = await svc.getAthleteIds();

      const results = await Promise.all(
        ids.map(async (id) => {
          const meta = getMeta(id);
          const history = await loadHistory(id, 120);
          const hrVals = history
            .map((r) => r?.heart_rate?.bpm_avg ?? r?.heart_rate?.bpm ?? null)
            .filter(Number.isFinite);

          if (!hrVals.length)
            return {
              id,
              name: meta.name,
              sport: meta.sport,
              zones: null,
              data_points: 0,
            };

          // Age from users node — default 30 if unavailable
          const age = 30;
          const hrMax = 220 - age;
          const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };

          hrVals.forEach((hr) => {
            const pct = hr / hrMax;
            if (pct < 0.6) zones.Z1++;
            else if (pct < 0.7) zones.Z2++;
            else if (pct < 0.8) zones.Z3++;
            else if (pct < 0.9) zones.Z4++;
            else zones.Z5++;
          });

          const total = hrVals.length;
          const dist = Object.fromEntries(
            Object.entries(zones).map(([k, v]) => [
              k,
              { count: v, pct: +((v / total) * 100).toFixed(1) },
            ]),
          );

          return {
            id,
            name: meta.name,
            sport: meta.sport,
            hr_max_estimate: hrMax,
            zones: dist,
            data_points: total,
          };
        }),
      );

      res.json({ athletes: results, generated_at: new Date().toISOString() });
    } catch (err) {
      logger.error("[GET /analytics/performance-zones]", {
        message: err.message,
        request_id: req.id,
      });
      next(err);
    }
  },
);

module.exports = router;
