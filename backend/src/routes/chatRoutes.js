/**
 * src/routes/chatRoutes.js
 * ─────────────────────────────────────────────────────────────
 * LLM-powered conversational agent for athlete data exploration.
 *
 *   POST /api/chat              — send message, receive AI response
 *   GET  /api/chat/suggestions  — starter question chips for the UI
 */

"use strict";

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const logger = require("../config/logger");
const { validateBody } = require("../middleware/index");
const { buildAIDataContext } = require("../services/athleteService");

/* ── OpenAI client ──────────────────────────────────────────── */

let openai = null;

(function initOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn("[Chat] OPENAI_API_KEY not set — /api/chat will return 503.");
    return;
  }
  try {
    const { default: OpenAI } = require("openai");
    openai = new OpenAI({ apiKey });
    logger.info("[Chat] OpenAI client initialised.");
  } catch (err) {
    logger.error("[Chat] Failed to load openai package:", {
      message: err.message,
    });
  }
})();

/* ── System prompt ──────────────────────────────────────────── */

const SYSTEM_PROMPT = `\
You are **AthletiSense AI**, an intelligent sports-performance analyst embedded in the
AthletiSense IoT Athletic Performance Monitoring Platform.

## STRICT DATA RESTRICTION (CRITICAL)
- You MUST answer questions using ONLY the data provided in the "User Context" and "Current Live Athlete Data" sections below.
- DO NOT hallucinate, guess, or invent metrics.
- DO NOT use outside knowledge to fill in missing data.
- Note that athletes and coaches listed in your "User Context" are definitively connected to the user, even if they currently lack entries in the "Live Athlete Data" telemetry section. Provide their names if asked.

## Your Role
- Help coaches, physiotherapists, and athletes understand biometric and kinematic data
  collected from IoT chest-strap sensors.
- Answer questions about heart rate, skin temperature, motion/acceleration, step count,
  respiration, and recovery metrics.
- Identify trends, anomalies, and patterns in athlete performance data.
- Provide actionable recommendations for training load management and recovery.
- Guide users in exploring dashboard visualisations and interpreting charts.
- Explain physiological concepts in accessible language.

## Platform Context
Sensors used:
- **AD8232 ECG** → heart_rate { bpm, bpm_avg, ecg_value, leads_connected }
- **DS18B20**    → temperature { celsius, fahrenheit, valid }
- **BMI160 IMU** → motion { accel_x/y/z, gyro_x/y/z, step_count }
- **BF350 Strain gauge** → respiration { rate_avg, rate_instant, strain_raw }
- **System**    → { wifi_rssi, heap_free, fw_version }

Healthy ranges:
- Resting HR 60–100 bpm | Active up to 185 bpm
- Skin temperature 36–37.5 °C | Active up to 38.0 °C
- Resting respiration 12–20 br/min | Active 20–40 br/min

Alerts:
- ⚠️ HR_ELEVATED (>185 bpm or <60 bpm), HR_CRITICAL (>200 or <40)
- ⚠️ TEMP_ELEVATED (>38 °C), TEMP_CRITICAL (>40 or <35)
- ⚠️ RESP_ELEVATED (>40 or <12), RESP_CRITICAL (>50 or <8)

## Response Guidelines
- Be concise but thorough (≤250 words unless deep analysis is explicitly requested).
- Use **bold** and bullet points for readability.
- Reference specific numbers when they appear in the live data.
- Use ⚠️ for alert conditions, 📊 when referencing charts, 💡 for tips.
- Recommend which dashboard section the user should visit for deeper exploration.
- Never expose raw Firebase paths or internal field names to the user.
`;

/* ── Joi validation schema ───────────────────────────────────── */

const chatSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required(),
  history: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid("user", "assistant").required(),
        content: Joi.string().max(4000).required(),
      }),
    )
    .max(20)
    .optional(),
  userRole: Joi.string().valid("admin", "athlete").optional(),
  athleteId: Joi.string().allow(null, "").optional(),
  connectedIds: Joi.array().items(Joi.string()).optional(),
  userContext: Joi.object({
    name: Joi.string().allow(null, "").optional(),
    role: Joi.string().allow(null, "").optional(),
    connectedAthletes: Joi.array().items(Joi.string()).optional(),
    connectedCoaches: Joi.array().items(Joi.string()).optional()
  }).optional()
});

/* ── POST /api/chat ──────────────────────────────────────────── */

router.post("/chat", validateBody(chatSchema), async (req, res, next) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: "AI assistant is not configured.",
        detail: "Add OPENAI_API_KEY to .env and restart the server.",
        fallback: true,
        request_id: req.id,
      });
    }

    const { message, history = [], userRole, athleteId, connectedIds = [], userContext = {} } = req.body;

    // Build live data context for the system prompt filtering by RBAC
    const dataCtx = await buildAIDataContext({ userRole, athleteId, connectedIds });

    const ctxString = `
## User Context
You are currently talking to: ${userContext.name || "Unknown User"} (Role: ${userContext.role || "Unknown"})
Connected Athletes: ${userContext.connectedAthletes?.length ? userContext.connectedAthletes.join(", ") : "None"}
Connected Coaches: ${userContext.connectedCoaches?.length ? userContext.connectedCoaches.join(", ") : "None"}
`;

    const messages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n${ctxString}\n## Current Live Athlete Data\n${dataCtx}`,
      },
    ];

    // Append up to the last 8 conversation turns to keep context window lean
    history
      .slice(-8)
      .forEach((m) => messages.push({ role: m.role, content: m.content }));

    messages.push({ role: "user", content: message });

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const max_tokens = parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 800;

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature: 0.65,
    });

    const response =
      completion.choices[0]?.message?.content ?? "No response generated.";

    logger.info("[Chat] Response generated", {
      model,
      prompt_tokens: completion.usage?.prompt_tokens,
      completion_tokens: completion.usage?.completion_tokens,
      request_id: req.id,
    });

    res.json({
      response,
      model,
      timestamp: new Date().toISOString(),
      request_id: req.id,
    });
  } catch (err) {
    logger.error("[POST /api/chat]", {
      message: err.message,
      request_id: req.id,
    });
    next(err);
  }
});

/* ── GET /api/chat/suggestions ──────────────────────────────── */

router.get("/chat/suggestions", (_req, res) => {
  res.json({
    suggestions: [
      "What's the current status of all athletes?",
      "Are there any anomalies in the latest readings?",
      "Which athlete needs the most recovery time?",
      "Compare heart rate trends across all athletes",
      "Which athlete has the highest training load right now?",
      "Explain the correlation between temperature and respiration",
      "Give me a training load and fatigue summary",
      "What does a healthy post-training recovery pattern look like?",
      "Summarise today's session performance",
      "Flag any athletes with critical biometric values",
    ],
  });
});

module.exports = router;
