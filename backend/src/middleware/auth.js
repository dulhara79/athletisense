/**
 * src/middleware/auth.js
 * ─────────────────────────────────────────────────────────────
 * Firebase ID-token verification middleware.
 *
 * Usage:
 *   const { requireAuth, requireAdmin } = require('./auth');
 *   router.get('/protected', requireAuth, handler);
 *   router.delete('/admin-only', requireAuth, requireAdmin, handler);
 *
 * Clients must send:  Authorization: Bearer <Firebase ID token>
 *
 * When DISABLE_AUTH=true in .env the middleware is bypassed
 * entirely (useful for local development without a Firebase
 * project — set it to false in staging/production).
 */

"use strict";

const { admin } = require("../config/firebase");
const logger = require("../config/logger");

/**
 * Verifies the Firebase ID token supplied in the Authorization header.
 * Attaches decoded token to req.user on success.
 */
async function requireAuth(req, res, next) {
  // Dev bypass — NEVER enable in production
  if (
    process.env.DISABLE_AUTH === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    req.user = { uid: "dev-user", role: "admin", email: "dev@local" };
    return next();
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required.",
      detail: "Provide a valid Firebase ID token in the Authorization header.",
      request_id: req.id,
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn("[Auth] Token verification failed", {
      message: err.message,
      request_id: req.id,
    });

    const detail =
      err.code === "auth/id-token-expired"
        ? "Token has expired. Please sign in again."
        : "Invalid or malformed token.";

    return res
      .status(401)
      .json({ error: "Unauthorised.", detail, request_id: req.id });
  }
}

/**
 * Checks that the authenticated user has role === 'admin'
 * by reading their profile from Firebase DB.
 * Must run AFTER requireAuth.
 */
async function requireAdmin(req, res, next) {
  try {
    const { db } = require("../config/firebase");
    const snap = await db.ref(`users/${req.user.uid}`).once("value");
    const profile = snap.exists() ? snap.val() : {};

    if (profile.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden.",
        detail: "Admin role required for this endpoint.",
        request_id: req.id,
      });
    }

    req.userProfile = profile;
    next();
  } catch (err) {
    logger.error("[Auth] requireAdmin error", {
      message: err.message,
      request_id: req.id,
    });
    next(err);
  }
}

/**
 * Soft auth — attaches req.user if a valid token is present,
 * but never blocks the request if there is no token.
 * Useful for endpoints that behave differently for authed users.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return next();
  try {
    req.user = await admin.auth().verifyIdToken(authHeader.slice(7));
  } catch {
    /* ignore */
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
