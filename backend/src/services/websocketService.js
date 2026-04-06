/**
 * src/services/websocketService.js
 * ─────────────────────────────────────────────────────────────
 * Manages WebSocket connections and Firebase real-time listeners.
 *
 * Protocol (server → client):
 *   { type: 'snapshot',    athletes: [...] }           — initial full state
 *   { type: 'live_update', athlete_id, name, sport, data } — per-athlete push
 *   { type: 'error',       message }                   — setup failure
 *   { type: 'pong' }                                   — heartbeat reply
 */

"use strict";

const { WebSocketServer } = require("ws");
const logger = require("../config/logger");
const { db } = require("../config/firebase");
const { getMeta } = require("../config/athletes");
const svc = require("./athleteService");

const HEARTBEAT_INTERVAL =
  parseInt(process.env.WS_HEARTBEAT_INTERVAL_MS, 10) || 30_000;

/**
 * Attaches a WebSocket server to the existing HTTP server instance.
 * @param {import('http').Server} httpServer
 */
function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  // Heartbeat: detect and close stale connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        logger.info("[WS] Terminating stale client.");
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", async (ws, req) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    logger.info("[WS] Client connected.", { ip: clientIp });

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Handle messages from client (e.g. ping)
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {
        // Ignore malformed messages
      }
    });

    if (!db) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Firebase unavailable on server.",
        }),
      );
      ws.close();
      return;
    }

    const unsubscribers = [];

    try {
      // ── 1. Initial snapshot ──────────────────────────────────
      const ids = await svc.getAthleteIds();

      const snapshotData = await Promise.all(
        ids.map(async (id) => {
          const latest = await svc.fetchLatest(id);
          const meta = getMeta(id);
          return {
            id,
            name: meta.name,
            sport: meta.sport,
            latest: latest ?? null,
          };
        }),
      );

      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "snapshot", athletes: snapshotData }));
      }

      // ── 2. Per-athlete live listeners ────────────────────────
      for (const id of ids) {
        const ref = db.ref(`athlete_records/${id}/latest`);
        const meta = getMeta(id);
        let isFirst = true;

        const listener = ref.on("value", (snap) => {
          if (isFirst) {
            isFirst = false;
            return;
          } // Skip the replay on attach
          if (!snap.exists() || ws.readyState !== ws.OPEN) return;

          ws.send(
            JSON.stringify({
              type: "live_update",
              athlete_id: id,
              name: meta.name,
              sport: meta.sport,
              data: snap.val(),
            }),
          );

          logger.debug(`[WS] Live update pushed for ${id}.`);
        });

        unsubscribers.push({ ref, listener });
      }
    } catch (err) {
      logger.error("[WS] Setup error:", { message: err.message });
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Failed to set up live data stream.",
          }),
        );
      }
    }

    // ── 3. Clean up Firebase listeners on disconnect ──────────
    ws.on("close", () => {
      for (const { ref, listener } of unsubscribers) {
        ref.off("value", listener);
      }
      logger.info(
        `[WS] Client disconnected. Detached ${unsubscribers.length} listener(s).`,
        { ip: clientIp },
      );
    });

    ws.on("error", (err) => {
      logger.error("[WS] Socket error:", {
        message: err.message,
        ip: clientIp,
      });
    });
  });

  logger.info("[WS] WebSocket server attached.");
  return wss;
}

module.exports = { attachWebSocket };
