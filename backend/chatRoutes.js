// /**
//  * ============================================================
//  * AthletiSense Chat Routes — Production Level
//  * ============================================================
//  * Provides an LLM-powered conversational agent strictly
//  * grounded in Firebase Realtime Database telemetry.
//  * ============================================================
//  */

// 'use strict';

// const express = require('express');
// const router  = express.Router();
// const admin   = require('firebase-admin');

// /* ── OpenAI setup ────────────────────────────────────────────── */

// let openai = null;

// try {
//   const OpenAI = require('openai');
//   const apiKey = process.env.OPENAI_API_KEY;
//   if (apiKey) {
//     openai = new OpenAI({ apiKey });
//     console.log('[Chat] OpenAI initialized successfully.');
//   } else {
//     console.warn('[Chat] OPENAI_API_KEY not set — chat endpoint will return 503.');
//   }
// } catch (err) {
//   console.error('[Chat] Failed to initialize OpenAI:', err.message);
// }

// /* ── System prompt (Strictly Grounded) ───────────────────────── */

// const SYSTEM_PROMPT = `You are **AthletiSense AI**, a data-driven sports-performance analyst embedded in a dashboard.

// ## STRICT DATA RESTRICTION (CRITICAL)
// - You MUST answer questions using ONLY the data provided in the "Current Live & Historical Athlete Data" section below.
// - DO NOT hallucinate, guess, or invent metrics.
// - DO NOT use outside knowledge to fill in missing data.
// - If a user asks about an athlete, metric, or event NOT present in the provided data context, you MUST reply: "I do not have data in the current database to answer that."

// ## Your Role & Assignment Requirements
// - Identify trends, anomalies, and patterns in the provided athlete performance data.
// - Provide actionable recommendations for training load management and recovery based strictly on the provided data.
// - Explain trends or anomalies identified in the visuals (e.g., spike in heart rate, drop in temperature).
// - Support decision-oriented questions (e.g., "What factors influence fatigue the most based on current readings?").

// ## Platform Context & Ranges
// - Nested fields: heart_rate { bpm, bpm_avg, ecg_value }, temperature { celsius }, motion { accel, gyro, step_count }, respiration { rate_avg }.
// - Healthy resting: HR 60-100 bpm, Temp 36-37.5 °C, Resp 12-20 br/min.
// - Active ranges: HR up to 185 bpm normal, Temp up to 38.0 °C acceptable, Resp 20-40 br/min.

// ## Formatting
// - Be concise (under 200 words).
// - Use bullet points and bold text for readability.
// - Quote specific numbers from the data to prove your claims.
// - Flag anomalies with ⚠️.
// `;

// /* ── Firebase helper: build live & trend data context ────────── */

// async function buildDataContext() {
//   try {
//     const db = admin.database();

//     // 1. Fetch user names based on screenshots (usernames -> uid -> users)
//     const usernamesSnap = await db.ref('usernames').once('value');
//     const usersSnap = await db.ref('users').once('value');
    
//     const nameMap = {};
//     if (usernamesSnap.exists() && usersSnap.exists()) {
//       const usernamesMap = usernamesSnap.val();
//       const usersData = usersSnap.val();
      
//       for (const [athleteId, node] of Object.entries(usernamesMap)) {
//         if (node.uid && usersData[node.uid]) {
//             // Check for name variations depending on how you store it in /users
//             nameMap[athleteId] = usersData[node.uid].name || usersData[node.uid].fullName || athleteId;
//         }
//       }
//     }

//     // 2. Fetch latest readings AND a small slice of history for trends
//     const recSnap = await db.ref('athlete_records').once('value');
//     if (!recSnap.exists()) return 'No athlete data currently available in the database.';

//     const records = recSnap.val();
//     const athleteSummaries = [];

//     for (const [aid, node] of Object.entries(records)) {
//       const lat = node?.latest;
//       if (!lat) continue;

//       const name = nameMap[aid] || aid;
      
//       // Calculate a quick trend if readings exist
//       let trendText = "Insufficient historical data for trends.";
//       if (node.readings) {
//           const readingValues = Object.values(node.readings);
//           const recentBPMs = readingValues.slice(-5).map(r => r.heart_rate?.bpm_avg).filter(v => v != null);
//           if (recentBPMs.length > 0) {
//               const maxBpm = Math.max(...recentBPMs);
//               const minBpm = Math.min(...recentBPMs);
//               trendText = `Recent 5min HR Range: ${minBpm}-${maxBpm} bpm.`;
//           }
//       }

//       // Format snapshot
//       const hr   = lat.heart_rate?.bpm_avg ?? lat.heart_rate?.bpm ?? 'N/A';
//       const temp = lat.temperature?.celsius ?? 'N/A';
//       const step = lat.motion?.step_count   ?? 'N/A';
//       const resp = lat.respiration?.rate_avg ?? 'N/A';
//       const ts   = lat.timestamp            ?? 'unknown';

//       athleteSummaries.push(
//         `Athlete: **${name}** (${aid})\n- Latest Snapshot [${ts}]: HR: ${hr} bpm, Temp: ${temp} °C, Steps: ${step}, Resp: ${resp} br/min.\n- Trends: ${trendText}\n`
//       );
//     }

//     return athleteSummaries.join('\n');
//   } catch (err) {
//     console.error('[Chat] Context build error:', err.message);
//     return 'System Error: Unable to fetch athlete data.';
//   }
// }

// /* ── Rate limiting ───────────────────────────────────────────── */
// const hits = new Map();
// const MAX_RPM = 30; 
// const WINDOW_MS = 60_000;

// function rateOk(ip) {
//   const now = Date.now();
//   const rec = hits.get(ip);
//   if (!rec || now - rec.t > WINDOW_MS) { hits.set(ip, { t: now, n: 1 }); return true; }
//   if (rec.n >= MAX_RPM) return false;
//   rec.n++;
//   return true;
// }

// /* ── POST /api/chat ─────────────────────────────────────────── */

// router.post('/chat', async (req, res) => {
//   try {
//     if (!rateOk(req.ip)) return res.status(429).json({ error: 'Rate limit exceeded.' });

//     const { message, history } = req.body;
//     if (!message || typeof message !== 'string' || !message.trim()) {
//       return res.status(400).json({ error: 'Valid message required.' });
//     }

//     if (!openai) {
//       return res.status(503).json({ error: 'AI assistant is not configured.', fallback: true });
//     }

//     // Build fresh data snapshot for LLM to base answers upon
//     const dataCtx = await buildDataContext();

//     const messages = [
//       { role: 'system', content: SYSTEM_PROMPT + '\n\n## Current Live & Historical Athlete Data\n' + dataCtx },
//     ];

//     if (Array.isArray(history)) {
//       history.slice(-8).forEach(m => messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
//     }

//     messages.push({ role: 'user', content: message.trim() });

//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       messages,
//       max_tokens: 500,
//       temperature: 0.1, // LOW temperature to enforce strict factual answers (no hallucinations)
//     });

//     res.json({ response: completion.choices[0]?.message?.content || 'No response.', timestamp: new Date().toISOString() });
//   } catch (err) {
//     console.error('[POST /api/chat]', err);
//     res.status(500).json({ error: 'Failed to generate a response.' });
//   }
// });

// router.get('/chat/suggestions', (_req, res) => {
//   res.json({
//     suggestions: [
//       "Are there any anomalies in the latest readings?",
//       "Which athlete currently has the highest heart rate?",
//       "Compare the recent heart rate trends across athletes.",
//       "Are any athletes showing signs of overexertion?"
//     ],
//   });
// });

// module.exports = router;