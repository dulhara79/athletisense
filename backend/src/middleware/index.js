/**
 * src/middleware/index.js
 * ─────────────────────────────────────────────────────────────
 * Shared Express middleware:
 *   requireFirebase  — 503 guard when DB is unavailable
 *   validateBody     — Joi-based request body validation
 *   requestId        — attaches a unique X-Request-Id header
 *   notFound         — 404 handler (must be last before error)
 *   errorHandler     — global error handler
 */

"use strict";

const { v4: uuidv4 } = require("uuid");
const logger = require("../config/logger");
const { db } = require("../config/firebase");

/* ── 503 Firebase guard ─────────────────────────────────────── */

function requireFirebase(req, res, next) {
  if (!db) {
    return res.status(503).json({
      error: "Database unavailable.",
      detail:
        "Firebase failed to initialise — check server logs and FIREBASE_SERVICE_ACCOUNT_PATH.",
      request_id: req.id,
    });
  }
  next();
}

/* ── Request-ID middleware ──────────────────────────────────── */

function requestId(req, res, next) {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
}

/* ── Joi body validator factory ─────────────────────────────── */

/**
 * Returns an Express middleware that validates req.body against
 * the provided Joi schema.  On failure returns 400 with details.
 *
 * @param  {import('joi').Schema} schema
 * @returns {import('express').RequestHandler}
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        error: "Validation failed.",
        details: error.details.map((d) => d.message),
        request_id: req.id,
      });
    }

    req.body = value; // Use stripped / coerced value
    next();
  };
}

/* ── 404 handler ─────────────────────────────────────────────  */

function notFound(req, res) {
  res.status(404).json({
    error: "Route not found.",
    path: req.originalUrl,
    request_id: req.id,
  });
}

/* ── Global error handler ───────────────────────────────────── */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    request_id: req.id,
    url: req.originalUrl,
  });

  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    error: err.expose ? err.message : "Internal server error.",
    request_id: req.id,
  });
}

/* ── Input sanitiser ────────────────────────────────────────── */

/**
 * Strips dangerous characters from all string values in
 * req.body, req.query, and req.params to prevent
 * NoSQL injection and basic XSS.
 * Does NOT replace Joi schema validation — both run together.
 */
function sanitiseInput(req, _res, next) {
  const clean = (v) => {
    if (typeof v !== "string") return v;
    return v
      .replace(/[<>]/g, "") // strip raw HTML tags
      .replace(/\$\{/g, "") // strip template literal injection
      .replace(/\0/g, "") // strip null bytes
      .trim();
  };

  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") obj[key] = clean(obj[key]);
      else if (typeof obj[key] === "object") walk(obj[key]);
    }
  };

  walk(req.body);
  walk(req.query);
  walk(req.params);
  next();
}

module.exports = {
  requireFirebase,
  requestId,
  validateBody,
  sanitiseInput,
  notFound,
  errorHandler,
};
