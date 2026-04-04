/**
 * ============================================================
 * AthletiSense Backend — Firebase Edition
 * ============================================================
 * Reads all athlete data directly from Firebase Realtime DB.
 *
 * Firebase data structure (written by ESP32 firmware v2.7):
 *
 *   athlete_records/
 *     ATH_001/
 *       latest/                  ← most recent 60-second snapshot
 *         athlete_id, timestamp, fw_version
 *         heart_rate/  { bpm, bpm_avg, ecg_value, leads_connected }
 *         respiration/ { rate_instant, rate_avg, valid_breaths,
 *                        strain_raw, strain_v }
 *         motion/      { accel_x/y/z, gyro_x/y/z, step_count }
 *         temperature/ { celsius, fahrenheit, valid }
 *         system/      { wifi_rssi, heap_free }
 *       readings/                ← archive, one entry per minute
 *         20250316_143000/ { ...same shape as latest... }
 *         20250316_143100/ { ... }
 *
 * REST endpoints:
 *   GET  /api/athletes              — list all known athletes + latest snapshot
 *   GET  /api/athletes/:id          — full history for one athlete
 *   GET  /api/athletes/:id/latest   — latest snapshot only
 *   GET  /api/athletes/:id/history  — all archived readings (newest first)
 *   GET  /api/summary               — aggregated stats across all athletes
 *
 * WebSocket (ws://localhost:3001):
 *   On connect  → sends { type: 'snapshot', athletes: [...] }
 *   Every 5s    → Firebase listener pushes { type: 'live_update', data: {...} }
 *                 whenever /latest actually changes (no polling, no fake data)
 * ============================================================
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config();
const admin = require('firebase-admin');

// ─── Firebase Admin init ─────────────────────────────────────────────────────
// Service account JSON path can be overridden via env var for portability.
const SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let db = null;

try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      'https://performance-monitering-glove-default-rtdb.firebaseio.com'
  });
  db = admin.database();
  console.log('[Firebase] Admin SDK initialized successfully.');
} catch (err) {
  console.error('[Firebase] Initialization FAILED:', err.message);
  console.warn('[Firebase] All endpoints will return 503 until this is fixed.');
}

// ─── Athlete metadata ─────────────────────────────────────────────────────────
// Add entries here as you add more devices / athletes.
const ATHLETE_META = {
  ATH_001: { name: 'Marcus Thorne',  sport: 'Elite Runner' },
  ATH_002: { name: 'Sarah Chen',     sport: 'Cyclist'      },
  ATH_003: { name: 'Diego Ramirez',  sport: 'Swimmer'      },
  ATH_004: { name: 'Aisha Patel',    sport: 'Sprinter'     }
};

function getMeta(id) {
  return ATHLETE_META[id] || { name: id, sport: 'Athlete' };
}

// ─── Firebase helpers ─────────────────────────────────────────────────────────

/**
 * Returns a middleware that responds 503 when Firebase is unavailable.
 * Keeps route handlers clean.
 */
function requireFirebase(req, res, next) {
  if (!db) return res.status(503).json({ error: 'Firebase not available. Check server logs.' });
  next();
}

/**
 * Fetches the list of athlete IDs from the top-level keys under
 * /athlete_records. These are whatever node names the ESP32 devices
 * have written to — no hardcoded list needed.
 */
async function getAthleteIds() {
  const snap = await db.ref('athlete_records').once('value');
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
}

/**
 * Fetches the /latest node for a single athlete.
 * Returns null if the athlete or their /latest node doesn't exist.
 */
async function fetchLatest(athleteId) {
  const snap = await db.ref(`athlete_records/${athleteId}/latest`).once('value');
  return snap.exists() ? snap.val() : null;
}

/**
 * Fetches all archived readings for a single athlete from /readings.
 * Returns them as an array sorted newest-first.
 */
async function fetchHistory(athleteId) {
  const snap = await db.ref(`athlete_records/${athleteId}/readings`).once('value');
  if (!snap.exists()) return [];

  // Each child key is a timestamp string like "20250316_143000".
  // Convert to an array and sort descending so newest is first.
  const raw = snap.val();
  return Object.entries(raw)
    .map(([key, record]) => ({ _key: key, ...record }))
    .sort((a, b) => b._key.localeCompare(a._key));
}

/**
 * Computes aggregated statistics from an array of sensor records.
 * Works with both /latest (single object) and /readings (array).
 */
function computeStats(records) {
  // Accept a single record or an array
  const rows = Array.isArray(records) ? records : [records];
  if (!rows.length) return {};

  const pick = (row, path) => {
    // Safely navigate nested objects: "heart_rate.bpm_avg"
    return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), row);
  };

  const numericArray = (field) =>
    rows.map(r => Number(pick(r, field))).filter(v => !isNaN(v) && v !== null);

  const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const max = (arr) => arr.length ? Math.max(...arr) : null;
  const min = (arr) => arr.length ? Math.min(...arr) : null;

  const bpms     = numericArray('heart_rate.bpm_avg');
  const temps    = numericArray('temperature.celsius');
  const steps    = numericArray('motion.step_count');
  const respRates= numericArray('respiration.rate_avg');

  return {
    heart_rate: {
      avg:  avg(bpms)  !== null ? Math.round(avg(bpms)  * 10) / 10  : null,
      max:  max(bpms),
      min:  min(bpms)
    },
    temperature: {
      avg:  avg(temps) !== null ? Math.round(avg(temps) * 100) / 100 : null,
      max:  max(temps),
      min:  min(temps)
    },
    respiration: {
      avg:  avg(respRates) !== null ? Math.round(avg(respRates) * 10) / 10 : null
    },
    steps: {
      latest: steps.length ? steps[0] : null  // step_count is cumulative
    },
    data_points: rows.length
  };
}

// ─── Express app ──────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// ─── Chat Routes (Gemini AI) ──────────────────────────────────────────────────
const chatRoutes = require('./chatRoutes');
app.use('/api', chatRoutes);

// ─── REST routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/athletes
 * Lists all athletes found in Firebase, each with their latest snapshot.
 *
 * Response:
 *   { athletes: [ { id, name, sport, latest: {...} }, ... ] }
 */
app.get('/api/athletes', requireFirebase, async (req, res) => {
  try {
    const ids = await getAthleteIds();

    const athletes = await Promise.all(
      ids.map(async (id) => {
        const latest = await fetchLatest(id);
        const meta   = getMeta(id);
        return {
          id,
          name:   meta.name,
          sport:  meta.sport,
          latest: latest || null
        };
      })
    );

    res.json({ athletes });
  } catch (err) {
    console.error('[GET /api/athletes]', err.message);
    res.status(500).json({ error: 'Failed to fetch athletes from Firebase.' });
  }
});

/**
 * GET /api/athletes/:id
 * Full data for one athlete: metadata + latest snapshot + reading count.
 *
 * Response:
 *   { id, name, sport, latest: {...}, reading_count: N }
 */
app.get('/api/athletes/:id', requireFirebase, async (req, res) => {
  try {
    const { id } = req.params;

    // Check the athlete node exists at all
    const snap = await db.ref(`athlete_records/${id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ error: `Athlete '${id}' not found.` });

    const latest  = await fetchLatest(id);
    const history = await fetchHistory(id);
    const meta    = getMeta(id);

    res.json({
      id,
      name:          meta.name,
      sport:         meta.sport,
      latest:        latest  || null,
      reading_count: history.length,
      stats:         computeStats(history.length ? history : (latest ? [latest] : []))
    });
  } catch (err) {
    console.error(`[GET /api/athletes/${req.params.id}]`, err.message);
    res.status(500).json({ error: 'Failed to fetch athlete data from Firebase.' });
  }
});

/**
 * GET /api/athletes/:id/latest
 * Returns just the /latest snapshot for one athlete.
 *
 * Response: the raw Firebase /latest object
 */
app.get('/api/athletes/:id/latest', requireFirebase, async (req, res) => {
  try {
    const { id } = req.params;
    const latest = await fetchLatest(id);

    if (!latest) return res.status(404).json({ error: `No latest data for athlete '${id}'.` });

    res.json({ id, name: getMeta(id).name, sport: getMeta(id).sport, ...latest });
  } catch (err) {
    console.error(`[GET /api/athletes/${req.params.id}/latest]`, err.message);
    res.status(500).json({ error: 'Failed to fetch latest data from Firebase.' });
  }
});

/**
 * GET /api/athletes/:id/history
 * Returns all archived /readings for one athlete, newest first.
 * Supports optional ?limit=N query param to cap results.
 *
 * Response:
 *   { id, name, sport, count: N, readings: [ {...}, ... ] }
 */
app.get('/api/athletes/:id/history', requireFirebase, async (req, res) => {
  try {
    const { id }  = req.params;
    const limit   = parseInt(req.query.limit, 10) || null;

    const history = await fetchHistory(id);
    if (!history.length) {
      return res.status(404).json({ error: `No reading history for athlete '${id}'.` });
    }

    const trimmed = limit ? history.slice(0, limit) : history;
    const meta    = getMeta(id);

    res.json({
      id,
      name:     meta.name,
      sport:    meta.sport,
      count:    trimmed.length,
      readings: trimmed
    });
  } catch (err) {
    console.error(`[GET /api/athletes/${req.params.id}/history]`, err.message);
    res.status(500).json({ error: 'Failed to fetch history from Firebase.' });
  }
});

/**
 * GET /api/summary
 * Aggregated stats across all athletes, built from their /readings history.
 * Falls back to /latest if no history exists yet.
 *
 * Response:
 *   { summary: [ { id, name, sport, latest_bpm, latest_temp, ..., stats: {...} }, ... ] }
 */
app.get('/api/summary', requireFirebase, async (req, res) => {
  try {
    const ids = await getAthleteIds();

    const summary = await Promise.all(
      ids.map(async (id) => {
        const meta    = getMeta(id);
        const latest  = await fetchLatest(id);
        const history = await fetchHistory(id);

        // Use history for stats if available, otherwise fall back to latest snapshot
        const dataSource = history.length ? history : (latest ? [latest] : []);
        const stats      = computeStats(dataSource);

        return {
          id,
          name:  meta.name,
          sport: meta.sport,

          // Quick-access latest values for dashboard cards
          latest_bpm:         latest?.heart_rate?.bpm_avg        ?? null,
          latest_temp_c:      latest?.temperature?.celsius        ?? null,
          latest_resp_rate:   latest?.respiration?.rate_avg       ?? null,
          latest_step_count:  latest?.motion?.step_count          ?? null,
          leads_connected:    latest?.heart_rate?.leads_connected ?? null,
          last_seen:          latest?.timestamp                   ?? null,
          wifi_rssi:          latest?.system?.wifi_rssi           ?? null,

          stats,
          reading_count: history.length
        };
      })
    );

    res.json({ summary });
  } catch (err) {
    console.error('[GET /api/summary]', err.message);
    res.status(500).json({ error: 'Failed to build summary from Firebase.' });
  }
});

// ─── WebSocket: Real-time Firebase listeners ──────────────────────────────────
/**
 * When a client connects via WebSocket:
 *   1. Immediately sends a full snapshot of all athletes' /latest data.
 *   2. Attaches a Firebase onValue listener to EACH athlete's /latest node.
 *      Whenever the ESP32 uploads new data (every 60s), Firebase pushes it
 *      here and we forward it to the connected client instantly.
 *   3. On disconnect, all listeners are detached to avoid memory leaks.
 */
wss.on('connection', async (ws) => {
  console.log('[WS] Client connected.');

  if (!db) {
    ws.send(JSON.stringify({ type: 'error', message: 'Firebase not available on server.' }));
    ws.close();
    return;
  }

  // Collect Firebase listener unsubscribe callbacks so we can clean up on disconnect
  const unsubscribers = [];

  try {
    // ── Step 1: Send initial snapshot ──────────────────────────────
    const ids = await getAthleteIds();

    const snapshotData = await Promise.all(
      ids.map(async (id) => {
        const latest = await fetchLatest(id);
        const meta   = getMeta(id);
        return { id, name: meta.name, sport: meta.sport, latest: latest || null };
      })
    );

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'snapshot', athletes: snapshotData }));
    }

    // ── Step 2: Attach live listeners for each athlete ──────────────
    for (const id of ids) {
      const ref = db.ref(`athlete_records/${id}/latest`);
      const meta = getMeta(id);

      // Firebase calls this callback immediately on attach (we skip that
      // first call since we already sent a snapshot), then again every
      // time the data changes.
      let isFirst = true;

      const listener = ref.on('value', (snap) => {
        if (isFirst) { isFirst = false; return; } // Skip the immediate replay

        if (!snap.exists()) return;
        if (ws.readyState !== ws.OPEN) return;

        ws.send(JSON.stringify({
          type:      'live_update',
          athlete_id: id,
          name:      meta.name,
          sport:     meta.sport,
          data:      snap.val()
        }));

        console.log(`[WS] Pushed live update for ${id} → client`);
      });

      // Store the ref+listener pair so we can call ref.off(listener) later
      unsubscribers.push({ ref, listener });
    }

  } catch (err) {
    console.error('[WS] Setup error:', err.message);
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to set up live listeners.' }));
    }
  }

  // ── Step 3: Clean up all Firebase listeners on disconnect ─────────
  ws.on('close', () => {
    for (const { ref, listener } of unsubscribers) {
      ref.off('value', listener);
    }
    console.log(`[WS] Client disconnected. Detached ${unsubscribers.length} Firebase listener(s).`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err.message);
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Express] Unhandled error:', err?.message || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\nAthletiSense Backend (Firebase) running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on    ws://localhost:${PORT}\n`);
});