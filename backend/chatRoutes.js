/**
 * ============================================================
 * AthletiSense Chat Routes — OpenAI Integration
 * ============================================================
 * Provides an LLM-powered conversational agent for data
 * exploration and decision support.
 *
 * Endpoints:
 *   POST /api/chat               — Send a message, get AI response
 *   GET  /api/chat/suggestions   — Get suggested starter questions
 * ============================================================
 */

'use strict';

const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');

/* ── OpenAI setup ────────────────────────────────────────────── */

let openai = null;

try {
  const OpenAI = require('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    openai = new OpenAI({ apiKey });
    console.log('[Chat] OpenAI initialized successfully.');
  } else {
    console.warn('[Chat] OPENAI_API_KEY not set — chat endpoint will return 503.');
  }
} catch (err) {
  console.error('[Chat] Failed to initialize OpenAI:', err.message);
}

/* ── System prompt ───────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are **AthletiSense AI**, an intelligent sports-performance analyst embedded in the AthletiSense IoT Athletic Performance Monitoring Platform.

## Your Role
- Help coaches, physiotherapists, and athletes understand biometric and kinematic data collected from IoT chest-strap sensors.
- Answer questions about heart rate, skin temperature, motion/acceleration, step count, respiration, and recovery metrics.
- Identify trends, anomalies, and patterns in athlete performance data.
- Provide actionable recommendations for training load management and recovery.
- Guide users in exploring dashboard visualizations and interpreting charts.
- Explain physiological concepts in accessible language.

## Platform Context
- Sensors: AD8232 ECG (heart rate / BPM), DS18B20 (skin temperature °C), BMI160 6-axis IMU (acceleration, gyroscope, step count), BF350 strain gauge (respiration / breathing rate).
- Key nested fields in each reading: heart_rate { bpm, bpm_avg, ecg_value, leads_connected }, temperature { celsius, fahrenheit }, motion { accel_x/y/z, gyro_x/y/z, step_count }, respiration { rate_avg, rate_instant, strain_raw }.
- Healthy resting ranges: HR 60-100 bpm, Temp 36-37.5 °C, Resp 12-20 breaths/min.
- Active ranges: HR up to 185 bpm normal, Temp up to 38.0 °C acceptable, Resp 20-40 breaths/min.

## Response Guidelines
- Be concise but thorough (under 250 words unless deep analysis is requested).
- Use bullet points and bold text for readability.
- Reference specific numbers from the data when available.
- Suggest which dashboard section the user should visit for deeper exploration.
- Flag concerning values with ⚠️ emoji.
- Use 📊 when referencing charts and 💡 for tips.
`;

/* ── Firebase helper: build live-data context ────────────────── */

async function buildDataContext() {
  try {
    const db = admin.database();

    // 1. Fetch user name mapping
    const usersSnap = await db.ref('users').once('value');
    const nameMap   = {};
    if (usersSnap.exists()) {
      Object.values(usersSnap.val()).forEach(u => {
        if (u && u.athleteId) nameMap[u.athleteId] = u.name || u.athleteId;
      });
    }

    // 2. Fetch latest readings
    const recSnap = await db.ref('athlete_records').once('value');
    if (!recSnap.exists()) return 'No athlete data currently available in the database.';

    const records = recSnap.val();
    const lines   = [];

    for (const [aid, node] of Object.entries(records)) {
      const lat = node?.latest;
      if (!lat) continue;

      const name = nameMap[aid] || aid;
      const hr   = lat.heart_rate?.bpm_avg ?? lat.heart_rate?.bpm ?? 'N/A';
      const temp = lat.temperature?.celsius ?? 'N/A';
      const step = lat.motion?.step_count   ?? 'N/A';
      const resp = lat.respiration?.rate_avg ?? 'N/A';
      const rssi = lat.system?.wifi_rssi    ?? 'N/A';
      const ts   = lat.timestamp            ?? 'unknown';

      // Count historical readings
      const readingCount = node.readings ? Object.keys(node.readings).length : 0;

      lines.push(
        `**${name}** (${aid})  HR: ${hr} bpm | Temp: ${temp} °C | Steps: ${step} | Resp: ${resp} br/min | RSSI: ${rssi} dBm | Last seen: ${ts} | History: ${readingCount} readings`
      );
    }

    return lines.join('\n');
  } catch (err) {
    console.error('[Chat] Context build error:', err.message);
    return 'Unable to fetch athlete data at this moment.';
  }
}

/* ── Rate limiting ───────────────────────────────────────────── */

const hits       = new Map();
const MAX_RPM    = 30;     // requests per minute per IP
const WINDOW_MS  = 60_000;

function rateOk(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.t > WINDOW_MS) { hits.set(ip, { t: now, n: 1 }); return true; }
  if (rec.n >= MAX_RPM) return false;
  rec.n++;
  return true;
}

/* ── POST /api/chat ─────────────────────────────────────────── */

router.post('/chat', async (req, res) => {
  try {
    if (!rateOk(req.ip)) {
      return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
    }

    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A non-empty "message" field is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message exceeds 2 000 character limit.' });
    }

    if (!openai) {
      return res.status(503).json({
        error: 'AI assistant is not configured. Please add OPENAI_API_KEY to the backend .env file and restart the server.',
        fallback: true,
      });
    }

    // Build fresh data snapshot
    const dataCtx = await buildDataContext();

    // Build OpenAI messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n## Current Live Athlete Data\n' + dataCtx },
    ];

    // Append conversation history
    if (Array.isArray(history) && history.length) {
      history.slice(-8).forEach(m => {
        messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content });
      });
    }

    // Append current user message
    messages.push({ role: 'user', content: message.trim() });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'No response generated.';

    res.json({ response, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[POST /api/chat]', err.message);
    res.status(500).json({ error: 'Failed to generate a response. Please try again.' });
  }
});

/* ── GET /api/chat/suggestions ──────────────────────────────── */

router.get('/chat/suggestions', (_req, res) => {
  res.json({
    suggestions: [
      "What's the current status of all athletes?",
      "Are there any anomalies in the latest readings?",
      "Which athlete needs the most recovery time?",
      "Compare heart rate trends across athletes",
      "What factors most influence performance?",
      "Explain the correlation between temperature and motion",
      "Give me a training load summary",
      "What does a healthy recovery pattern look like?",
    ],
  });
});

module.exports = router;
