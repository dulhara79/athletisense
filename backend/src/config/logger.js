/**
 * src/config/logger.js
 * ─────────────────────────────────────────────────────────────
 * Centralised Winston logger. Outputs JSON in production and
 * colourised text in development. Writes to rotating log files
 * in the directory specified by LOG_DIR (.env).
 */

"use strict";

const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

const LOG_DIR = process.env.LOG_DIR || "./logs";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const IS_PROD = process.env.NODE_ENV === "production";

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const { combine, timestamp, errors, json, colorize, printf } = format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(
    ({ level, message, timestamp: ts, stack }) =>
      `${ts} [${level}] ${stack || message}`,
  ),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const logger = createLogger({
  level: LOG_LEVEL,
  format: IS_PROD ? prodFormat : devFormat,
  defaultMeta: { service: "athletisense-backend" },
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    new transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
  // Do not crash the process on unhandled rejections – log them instead.
  exitOnError: false,
});

// Morgan stream integration
logger.stream = { write: (message) => logger.http(message.trim()) };

module.exports = logger;
