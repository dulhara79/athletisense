/**
 * src/services/athleteService.js
 * ─────────────────────────────────────────────────────────────
 * All Firebase reads are isolated here.  Routes never touch
 * `admin.database()` directly — this makes unit-testing and
 * future DB migrations much easier.
 */

"use strict";

const { db } = require("../config/firebase");
const { getMeta } = require("../config/athletes");
const logger = require("../config/logger");

/* ── Low-level Firebase reads ───────────────────────────────── */

/**
 * Returns the list of athlete IDs from the top-level keys
 * under /athlete_records.
 * @returns {Promise<string[]>}
 */
async function getAthleteIds() {
  const snap = await db.ref("athlete_records").once("value");
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
}

/**
 * Fetches /athlete_records/:id/latest.
 * @param  {string} athleteId
 * @returns {Promise<object|null>}
 */
async function fetchLatest(athleteId) {
  const snap = await db
    .ref(`athlete_records/${athleteId}/latest`)
    .once("value");
  return snap.exists() ? snap.val() : null;
}

/**
 * Fetches all /athlete_records/:id/readings, newest first.
 * Supports an optional `limit` to cap results before returning.
 * @param  {string}      athleteId
 * @param  {number|null} [limit=null]
 * @returns {Promise<object[]>}
 */
async function fetchHistory(athleteId, limit = null) {
  const snap = await db
    .ref(`athlete_records/${athleteId}/readings`)
    .once("value");
  if (!snap.exists()) return [];

  let entries = Object.entries(snap.val())
    .map(([key, record]) => ({ _key: key, ...record }))
    .sort((a, b) => b._key.localeCompare(a._key));

  if (limit && limit > 0) entries = entries.slice(0, limit);
  return entries;
}

/**
 * Checks whether a given athlete node exists at all in the DB.
 * @param  {string} athleteId
 * @returns {Promise<boolean>}
 */
async function athleteExists(athleteId) {
  const snap = await db.ref(`athlete_records/${athleteId}`).once("value");
  return snap.exists();
}

/* ── Aggregation helper ─────────────────────────────────────── */

/**
 * Computes descriptive statistics from an array of sensor records.
 * Safe against missing / null values.
 *
 * @param  {object|object[]} records
 * @returns {object}  stats object
 */
function computeStats(records) {
  const rows = Array.isArray(records) ? records : [records];
  if (!rows.length) return {};

  const deepGet = (obj, path) =>
    path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);

  const nums = (field) =>
    rows
      .map((r) => Number(deepGet(r, field)))
      .filter((v) => Number.isFinite(v));

  const avg = (arr) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const max = (arr) => (arr.length ? Math.max(...arr) : null);
  const min = (arr) => (arr.length ? Math.min(...arr) : null);
  const round = (v, d) =>
    v !== null ? Math.round(v * 10 ** d) / 10 ** d : null;

  const bpms = nums("heart_rate.bpm_avg");
  const temps = nums("temperature.celsius");
  const steps = nums("motion.step_count");
  const respRates = nums("respiration.rate_avg");
  const accelX = nums("motion.accel_x");
  const accelY = nums("motion.accel_y");
  const accelZ = nums("motion.accel_z");

  return {
    heart_rate: {
      avg: round(avg(bpms), 1),
      max: max(bpms),
      min: min(bpms),
    },
    temperature: {
      avg: round(avg(temps), 2),
      max: max(temps),
      min: min(temps),
    },
    respiration: {
      avg: round(avg(respRates), 1),
      max: max(respRates),
      min: min(respRates),
    },
    motion: {
      step_count_latest: steps.length ? steps[0] : null, // cumulative; latest is meaningful
      accel_avg_x: round(avg(accelX), 3),
      accel_avg_y: round(avg(accelY), 3),
      accel_avg_z: round(avg(accelZ), 3),
    },
    data_points: rows.length,
  };
}

/* ── High-level aggregators used by routes ──────────────────── */

/**
 * Builds the full athlete list with latest snapshots.
 * Used by GET /api/athletes.
 * @returns {Promise<object[]>}
 */
async function buildAthleteList() {
  const ids = await getAthleteIds();
  return Promise.all(
    ids.map(async (id) => {
      const latest = await fetchLatest(id);
      const meta = getMeta(id);
      return { id, name: meta.name, sport: meta.sport, latest: latest ?? null };
    }),
  );
}

/**
 * Builds the cross-athlete summary used by GET /api/summary.
 * @returns {Promise<object[]>}
 */
async function buildSummary() {
  const ids = await getAthleteIds();
  return Promise.all(
    ids.map(async (id) => {
      const meta = getMeta(id);
      const latest = await fetchLatest(id);
      const history = await fetchHistory(id);

      const dataSource = history.length ? history : latest ? [latest] : [];
      const stats = computeStats(dataSource);

      // Healthy-range anomaly flags — useful for the AI context and dashboard
      const bpm = latest?.heart_rate?.bpm_avg ?? null;
      const temp = latest?.temperature?.celsius ?? null;
      const resp = latest?.respiration?.rate_avg ?? null;

      const alerts = [];
      if (bpm !== null && (bpm < 40 || bpm > 200)) alerts.push("HR_CRITICAL");
      else if (bpm !== null && (bpm < 60 || bpm > 185))
        alerts.push("HR_ELEVATED");
      if (temp !== null && (temp < 35 || temp > 40))
        alerts.push("TEMP_CRITICAL");
      else if (temp !== null && temp > 38) alerts.push("TEMP_ELEVATED");
      if (resp !== null && (resp < 8 || resp > 50))
        alerts.push("RESP_CRITICAL");
      else if (resp !== null && (resp < 12 || resp > 40))
        alerts.push("RESP_ELEVATED");

      return {
        id,
        name: meta.name,
        sport: meta.sport,

        // Quick-access latest values
        latest_bpm: bpm,
        latest_temp_c: temp,
        latest_resp_rate: resp,
        latest_step_count: latest?.motion?.step_count ?? null,
        leads_connected: latest?.heart_rate?.leads_connected ?? null,
        last_seen: latest?.timestamp ?? null,
        wifi_rssi: latest?.system?.wifi_rssi ?? null,
        fw_version: latest?.fw_version ?? null,

        alerts,
        stats,
        reading_count: history.length,
      };
    }),
  );
}

/**
 * Builds the context string injected into the AI system prompt.
 * Also resolves user-friendly names from /users.
 * @param {object} options Role-based access options
 * @returns {Promise<string>}
 */
async function buildAIDataContext(options = {}) {
  const { userRole, athleteId, connectedIds = [] } = options;
  try {
    // Optional: pull display names from /users node
    const usersSnap = await db.ref("users").once("value");
    const nameMap = {};
    if (usersSnap.exists()) {
      Object.values(usersSnap.val()).forEach((u) => {
        if (u?.athleteId) nameMap[u.athleteId] = u.name ?? u.athleteId;
      });
    }

    const recSnap = await db.ref("athlete_records").once("value");
    if (!recSnap.exists())
      return "No athlete data currently available in the database.";

    const records = recSnap.val();
    const lines = [];

    for (const [aid, node] of Object.entries(records)) {
      if (userRole === "admin" && !connectedIds.includes(aid)) continue;
      if (userRole === "athlete" && aid !== athleteId) continue;

      const lat = node?.latest;
      if (!lat) continue;

      const name = nameMap[aid] ?? getMeta(aid).name;
      const hr = lat.heart_rate?.bpm_avg ?? lat.heart_rate?.bpm ?? "N/A";
      const temp = lat.temperature?.celsius ?? "N/A";
      const step = lat.motion?.step_count ?? "N/A";
      const resp = lat.respiration?.rate_avg ?? "N/A";
      const rssi = lat.system?.wifi_rssi ?? "N/A";
      const ts = lat.timestamp ?? "unknown";
      const cnt = node.readings ? Object.keys(node.readings).length : 0;
      const leads = lat.heart_rate?.leads_connected ? "YES" : "NO";

      lines.push(
        `Athlete: ${name} (${aid}) | HR: ${hr} bpm | Temp: ${temp}°C | ` +
          `Steps: ${step} | Resp: ${resp} br/min | RSSI: ${rssi} dBm | ` +
          `Leads: ${leads} | Last seen: ${ts} | History: ${cnt} readings`,
      );
    }

    return lines.length ? lines.join("\n") : "No athlete readings available.";
  } catch (err) {
    logger.error("[athleteService] buildAIDataContext error:", {
      message: err.message,
    });
    return "Unable to fetch athlete data at this moment.";
  }
}

module.exports = {
  getAthleteIds,
  fetchLatest,
  fetchHistory,
  athleteExists,
  computeStats,
  buildAthleteList,
  buildSummary,
  buildAIDataContext,
};
