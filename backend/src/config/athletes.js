/**
 * src/config/athletes.js
 * ─────────────────────────────────────────────────────────────
 * Dynamic athlete metadata — reads live from Firebase /users.
 * Zero hardcoded names or IDs.
 *
 * getMeta(id)   — returns cached name/sport, falls back to id
 * refreshMeta() — one-shot fetch to warm the cache at startup
 * watchMeta()   — live listener; auto-updates on any /users change
 */

"use strict";

const logger = require("./logger");

// In-memory cache: { [athleteId]: { name, sport, title, age } }
let metaCache = {};

function getMeta(id) {
  return metaCache[id] ?? { name: id, sport: "Athlete" };
}

function applySnapshot(usersVal) {
  if (!usersVal) {
    metaCache = {};
    return;
  }
  const next = {};
  Object.values(usersVal).forEach((u) => {
    if (!u?.athleteId) return;
    next[u.athleteId] = {
      name: u.name || u.athleteId,
      sport: u.sport || "Athlete",
      title: u.title || null,
      age: u.age || null,
    };
  });
  metaCache = next;
  logger.debug("[athletes] Meta cache updated", {
    count: Object.keys(next).length,
  });
}

async function refreshMeta() {
  try {
    const { db } = require("./firebase");
    if (!db) return;
    const snap = await db.ref("users").once("value");
    applySnapshot(snap.val());
  } catch (err) {
    logger.warn("[athletes] refreshMeta failed", { message: err.message });
  }
}

function watchMeta() {
  try {
    const { db } = require("./firebase");
    if (!db) return () => {};
    const listener = db.ref("users").on(
      "value",
      (snap) => applySnapshot(snap.val()),
      (err) =>
        logger.error("[athletes] watchMeta error", { message: err.message }),
    );
    logger.info("[athletes] Live /users listener attached.");
    return () => db.ref("users").off("value", listener);
  } catch (err) {
    logger.error("[athletes] watchMeta setup failed", { message: err.message });
    return () => {};
  }
}

module.exports = { getMeta, refreshMeta, watchMeta };
