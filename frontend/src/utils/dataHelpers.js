// src/utils/dataHelpers.js
// ─────────────────────────────────────────────────────────────
// Shared pure helpers used by all dashboard pages.
// No static athlete data — everything derived from API records.

export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:3001/api";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

// Assign a stable chart color by athlete index
const PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
];
export const athleteColor = (id, allIds) => {
  const idx = allIds ? allIds.indexOf(id) : 0;
  return PALETTE[Math.abs(idx) % PALETTE.length];
};

// Generate avatar initials from a name
export const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

/**
 * Parse any timestamp the DB emits:
 *   "1/1/2025 6:00"        → Date
 *   "16/03/2026 21:43:53"  → Date
 *   "2025-03-16 14:30:00"  → Date
 *   ISO string             → Date
 *   number                 → Date
 */
export function parseTs(ts) {
  if (!ts) return null;
  if (typeof ts === "number") return new Date(ts);
  if (typeof ts !== "string") return null;
  // D/M/YYYY or DD/MM/YYYY with optional time
  if (ts.includes("/")) {
    const [datePart, timePart = "00:00:00"] = ts.split(" ");
    const parts = datePart.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const d = new Date(
      `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${timePart}`,
    );
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(ts.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

export function timeLabel(ts) {
  if (!ts) return "--:--";
  const d = parseTs(ts);
  if (!d) {
    // fallback: take HH:MM from string
    const s = String(ts);
    const m = s.match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : "--:--";
  }
  return d.toTimeString().slice(0, 5);
}

export function motionMag(r) {
  const m = r?.motion;
  if (!m) return 0;
  const { accel_x: ax = 0, accel_y: ay = 0, accel_z: az = 0 } = m;
  return Math.sqrt(ax * ax + ay * ay + az * az) / 16384;
}

// Field accessors — handle both nested IoT format and flat format
export const getBpm = (r) =>
  r?._bpm ?? r?.heart_rate?.bpm_avg ?? r?.heart_rate?.bpm ?? null;
export const getTemp = (r) => r?._temp_c ?? r?.temperature?.celsius ?? null;
export const getResp = (r) =>
  r?._resp_rate ??
  r?.respiration?.rate_avg ??
  (r?.strain?.raw ? Math.round(r.strain.raw / 30) : null);
export const getMag = (r) => r?._motion_mag ?? motionMag(r);
export const getSteps = (r) => r?._step_count ?? r?.motion?.step_count ?? null;
export const getRssi = (r) => r?._rssi ?? r?.system?.wifi_rssi ?? null;

export const avg = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

export const fmtBpm = (v) => (v != null ? Number(v).toFixed(0) : "--");
export const fmtTemp = (v) => (v != null ? Number(v).toFixed(1) : "--");
export const fmtResp = (v) => (v != null ? Number(v).toFixed(0) : "--");
export const fmtMag = (v) => (v != null ? Number(v).toFixed(2) : "--");

export function rollingAvg(arr, window = 5) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1);
    return parseFloat(avg(slice).toFixed(1));
  });
}

export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = avg(xs),
    my = avg(ys);
  let num = 0,
    dx2 = 0,
    dy2 = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx,
      b = ys[i] - my;
    num += a * b;
    dx2 += a * a;
    dy2 += b * b;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
}

export function fatigueScore(latest) {
  if (!latest) return { score: null, recovery: null, status: "unknown" };
  const hr = getBpm(latest) ?? 70;
  const temp = getTemp(latest) ?? 36.5;
  const resp = getResp(latest) ?? 15;
  const mag = getMag(latest) ?? 0;
  const isActive = mag > 1.2;
  const hrP = isActive
    ? Math.min((hr - 60) / 125, 1) * 40
    : Math.min((hr - 60) / 40, 1) * 40;
  const tmpP = Math.min(Math.max((temp - 36.5) / 1.5, 0), 1) * 30;
  const rspP = Math.min(Math.max((resp - 12) / 28, 0), 1) * 30;
  const score = Math.max(0, Math.round(hrP + tmpP + rspP));
  const recovery = 100 - score;
  const status =
    score < 25
      ? "Optimal"
      : score < 50
        ? "Moderate"
        : score < 75
          ? "High"
          : "Critical";
  return { score, recovery, status };
}

/**
 * Shared Alert Logic
 * Evaluates a latest biometric record and returns an array of active alerts.
 */
export function getAlerts(latest) {
  if (!latest) return [];
  const bpm = getBpm(latest) ?? 0;
  const temp = getTemp(latest) ?? 0;
  const mag = getMag(latest) ?? 0;
  const isMoving = mag > 1.2;
  const out = [];

  if (isMoving) {
    if (bpm > 185)
      out.push({
        id: "hr-c",
        level: "critical",
        title: "Critical: Active HR Too High",
        msg: `${fmtBpm(bpm)} bpm — limit 185 bpm`,
      });
    else if (bpm > 165)
      out.push({
        id: "hr-w",
        level: "warning",
        title: "Warning: High Active HR",
        msg: `${fmtBpm(bpm)} bpm — monitor intensity`,
      });

    if (temp > 38.5)
      out.push({
        id: "tp-c",
        level: "critical",
        title: "Critical: High Active Temp",
        msg: `${fmtTemp(temp)}°C — heat risk`,
      });
    else if (temp > 38.0)
      out.push({
        id: "tp-w",
        level: "warning",
        title: "Warning: Elevated Temp",
        msg: `${fmtTemp(temp)}°C — monitor cooling`,
      });
  } else {
    if (bpm > 120)
      out.push({
        id: "hr-c",
        level: "critical",
        title: "Critical: Resting Tachycardia",
        msg: `${fmtBpm(bpm)} bpm while inactive`,
      });
    else if (bpm > 100)
      out.push({
        id: "hr-w",
        level: "warning",
        title: "Warning: Elevated Resting HR",
        msg: `${fmtBpm(bpm)} bpm`,
      });
    else if (bpm > 0 && bpm < 40)
      out.push({
        id: "hr-br",
        level: "warning",
        title: "Warning: Bradycardia",
        msg: `Low HR: ${fmtBpm(bpm)} bpm`,
      });

    if (temp > 38.0)
      out.push({
        id: "tp-c",
        level: "critical",
        title: "Critical: High Resting Temp",
        msg: `${fmtTemp(temp)}°C — fever risk`,
      });
    else if (temp > 37.5)
      out.push({
        id: "tp-w",
        level: "warning",
        title: "Warning: Elevated Temp",
        msg: `${fmtTemp(temp)}°C`,
      });
  }

  if (mag > 11)
    out.push({
      id: "mg-w",
      level: "warning",
      title: "Warning: High Impact",
      msg: `${mag.toFixed(1)} g`,
    });

  return out;
}
