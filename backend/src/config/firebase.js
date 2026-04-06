/**
 * src/config/firebase.js
 * ─────────────────────────────────────────────────────────────
 * Initialises Firebase Admin SDK exactly once, validates the
 * service-account file exists, and exposes the Realtime DB
 * instance.  All other modules import { db } from here.
 */

"use strict";

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

let db = null;

function initFirebase() {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!saPath) {
    logger.error("[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env");
    return null;
  }

  const resolved = path.resolve(saPath);
  if (!fs.existsSync(resolved)) {
    logger.error(`[Firebase] Service account file not found: ${resolved}`);
    return null;
  }

  // Avoid "app already exists" error on hot-reloads (dev)
  if (admin.apps.length > 0) {
    logger.info("[Firebase] Reusing existing admin app.");
    return admin.database();
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    const database = admin.database();
    logger.info("[Firebase] Admin SDK initialised successfully.");
    return database;
  } catch (err) {
    logger.error("[Firebase] Initialisation failed:", { message: err.message });
    return null;
  }
}

db = initFirebase();

module.exports = { db, admin };
