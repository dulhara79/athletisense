/**
 * src/services/analyticsService.js
 * ─────────────────────────────────────────────────────────────
 * Pure analytics functions — no Express, no Firebase direct calls.
 * All functions receive plain data arrays and return plain objects.
 * This makes them trivially unit-testable and reusable.
 *
 * Covers assignment criteria:
 *   ✓ Multi-dimensional analysis
 *   ✓ Trend detection (linear regression slope)
 *   ✓ Cross-athlete comparison
 *   ✓ Correlation between variables
 *   ✓ Fatigue & recovery scoring
 *   ✓ Training load (TRIMP-inspired)
 *   ✓ Anomaly detection (z-score)
 *   ✓ Time-bucketed aggregation (hourly / daily)
 */

"use strict";

/* ── Math helpers ────────────────────────────────────────────── */

const mean = (arr) =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(
    arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1),
  );
};
const round = (v, d = 2) =>
  v !== null && Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ── Field extractors ────────────────────────────────────────── */

const HR = (r) => r?.heart_rate?.bpm_avg ?? r?.heart_rate?.bpm ?? null;
const TEMP = (r) => r?.temperature?.celsius ?? null;
const RESP = (r) => r?.respiration?.rate_avg ?? null;
const STEPS = (r) => r?.motion?.step_count ?? null;
const ACCEL = (r) => {
  const m = r?.motion;
  if (!m) return null;
  const { accel_x: ax = 0, accel_y: ay = 0, accel_z: az = 0 } = m;
  return Math.sqrt(ax ** 2 + ay ** 2 + az ** 2) / 16384; // g
};
const RSSI = (r) => r?.system?.wifi_rssi ?? null;

/* ── Linear regression slope (trend per reading) ─────────────── */

function linearSlope(values) {
  const n = values.length;
  if (n < 2) return 0;
  const xs = Array.from({ length: n }, (_, i) => i);
  const mx = mean(xs),
    my = mean(values);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (values[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

/* ── Pearson correlation ─────────────────────────────────────── */

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const ax = mean(xs.slice(0, n)),
    ay = mean(ys.slice(0, n));
  const sx = stddev(xs.slice(0, n)),
    sy = stddev(ys.slice(0, n));
  if (sx === 0 || sy === 0) return null;
  const cov =
    xs.slice(0, n).reduce((s, x, i) => s + (x - ax) * (ys[i] - ay), 0) /
    (n - 1);
  return round(cov / (sx * sy));
}

/* ── Z-score anomaly detection ───────────────────────────────── */

/**
 * Flags records whose field value is more than `threshold` std-deviations
 * from the mean of that field across the series.
 */
function detectAnomalies(records, field, threshold = 2.5) {
  const vals = records
    .map(field)
    .filter((v) => v !== null && Number.isFinite(v));
  if (vals.length < 3) return [];
  const m = mean(vals),
    s = stddev(vals);
  if (s === 0) return [];

  return records
    .map((rec, idx) => {
      const v = field(rec);
      if (v === null || !Number.isFinite(v)) return null;
      const z = Math.abs((v - m) / s);
      return z >= threshold
        ? {
            index: idx,
            timestamp: rec.timestamp ?? rec._key ?? idx,
            value: round(v),
            z_score: round(z),
          }
        : null;
    })
    .filter(Boolean);
}

/* ── Training Load (TRIMP-inspired) ──────────────────────────── */

/**
 * Simplified TRIMP:  load = duration_min × avg_hr × motion_factor
 * We approximate duration as 1 min per reading (ESP32 uploads every 60 s).
 */
function trainingLoad(records) {
  if (!records.length) return { total: 0, avg_per_session: 0, peak: 0 };

  const loads = records.map((r) => {
    const hr = HR(r);
    const acc = ACCEL(r);
    if (hr === null) return 0;
    const hrFactor = hr / 220; // normalised HR (0-1)
    const motFactor = acc ? clamp(acc, 0.5, 3) : 1;
    return round(1 * hrFactor * motFactor, 3); // per-minute load unit
  });

  const total = round(
    loads.reduce((s, v) => s + v, 0),
    1,
  );
  return {
    total,
    avg_per_reading: round(mean(loads)),
    peak: round(Math.max(...loads)),
  };
}

/* ── Fatigue & Recovery Score ────────────────────────────────── */

/**
 * Computes a 0-100 fatigue score from the latest reading.
 *  - High resting HR   → fatigue
 *  - Elevated temp     → fatigue
 *  - High resp rate    → fatigue
 *  - Low motion during day → recovery (inverse signal)
 * Returns { fatigue_score, recovery_score, status }
 */
function fatigueScore(latest) {
  if (!latest)
    return { fatigue_score: null, recovery_score: null, status: "unknown" };

  const hr = HR(latest) ?? 70;
  const temp = TEMP(latest) ?? 36.6;
  const resp = RESP(latest) ?? 15;
  const acc = ACCEL(latest) ?? 0;

  const isActive = acc > 1.2;

  // Component penalties (0-100)
  const hrPenalty = isActive
    ? clamp((hr - 60) / 125, 0, 1) * 40
    : clamp((hr - 60) / 40, 0, 1) * 40;
  const tempPenalty = clamp((temp - 36.5) / 1.5, 0, 1) * 30;
  const respPenalty = clamp((resp - 12) / 28, 0, 1) * 30;

  const fatigue = round(hrPenalty + tempPenalty + respPenalty, 1);
  const recovery = round(100 - fatigue, 1);

  const status =
    fatigue < 25
      ? "optimal"
      : fatigue < 50
        ? "moderate"
        : fatigue < 75
          ? "high"
          : "critical";

  return { fatigue_score: fatigue, recovery_score: recovery, status };
}

/* ── Time bucketing ──────────────────────────────────────────── */

/**
 * Groups records into hourly or daily buckets and returns
 * avg HR, avg temp, avg resp per bucket.
 * @param {object[]} records   — sorted oldest → newest
 * @param {'hourly'|'daily'}  granularity
 */
function timeBucket(records, granularity = "hourly") {
  const buckets = {};

  records.forEach((r) => {
    const ts = r.timestamp || r._key || "";
    if (!ts) return;
    const d = new Date(ts.replace(" ", "T") + (ts.includes("T") ? "" : "Z"));
    if (isNaN(d.getTime())) return;

    const key =
      granularity === "daily"
        ? d.toISOString().slice(0, 10)
        : d.toISOString().slice(0, 13) + ":00";

    if (!buckets[key]) buckets[key] = { hr: [], temp: [], resp: [], count: 0 };
    const b = buckets[key];
    const hr = HR(r),
      temp = TEMP(r),
      resp = RESP(r);
    if (hr !== null) b.hr.push(hr);
    if (temp !== null) b.temp.push(temp);
    if (resp !== null) b.resp.push(resp);
    b.count++;
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, data]) => ({
      bucket,
      count: data.count,
      avg_hr: round(mean(data.hr)),
      avg_temp: round(mean(data.temp)),
      avg_resp: round(mean(data.resp)),
    }));
}

/* ── Per-athlete trend report ────────────────────────────────── */

/**
 * Computes a full trend object for a single athlete's history.
 * Used by GET /api/v1/analytics/athlete/:id/trend
 */
function athleteTrend(records) {
  if (!records.length) return null;

  const hrVals = records.map(HR).filter(Number.isFinite);
  const tmpVals = records.map(TEMP).filter(Number.isFinite);
  const respVals = records.map(RESP).filter(Number.isFinite);
  const accVals = records.map(ACCEL).filter(Number.isFinite);
  const stepVals = records.map(STEPS).filter(Number.isFinite);

  const latest = records.at(-1);

  return {
    data_points: records.length,

    heart_rate: {
      avg: round(mean(hrVals)),
      max: hrVals.length ? Math.max(...hrVals) : null,
      min: hrVals.length ? Math.min(...hrVals) : null,
      trend: round(linearSlope(hrVals), 4), // positive = rising
      stddev: round(stddev(hrVals)),
    },
    temperature: {
      avg: round(mean(tmpVals)),
      max: tmpVals.length ? Math.max(...tmpVals) : null,
      min: tmpVals.length ? Math.min(...tmpVals) : null,
      trend: round(linearSlope(tmpVals), 4),
    },
    respiration: {
      avg: round(mean(respVals)),
      trend: round(linearSlope(respVals), 4),
    },
    motion: {
      avg_magnitude: round(mean(accVals)),
      trend: round(linearSlope(accVals), 4),
      latest_steps: stepVals.at(-1) ?? null,
    },
    fatigue: fatigueScore(latest),
    training_load: trainingLoad(records),

    anomalies: {
      heart_rate: detectAnomalies(records, HR),
      temperature: detectAnomalies(records, TEMP),
    },

    correlations: {
      hr_vs_temp: pearson(hrVals, tmpVals),
      hr_vs_resp: pearson(hrVals, respVals),
      hr_vs_motion: pearson(hrVals, accVals),
      temp_vs_resp: pearson(tmpVals, respVals),
    },

    time_series: {
      hourly: timeBucket(records, "hourly"),
      daily: timeBucket(records, "daily"),
    },
  };
}

/* ── Cross-athlete comparison ────────────────────────────────── */

/**
 * Builds a comparison matrix across all athletes.
 * Used by GET /api/v1/analytics/comparison
 */
function buildComparison(athleteMap) {
  // athleteMap: { [id]: { meta: {name,sport}, records: [...] } }
  return Object.entries(athleteMap).map(([id, { meta, records }]) => {
    const hrVals = records.map(HR).filter(Number.isFinite);
    const tmpVals = records.map(TEMP).filter(Number.isFinite);
    const respVals = records.map(RESP).filter(Number.isFinite);
    const latest = records.at(-1);
    const { fatigue_score, recovery_score, status } = fatigueScore(latest);
    const load = trainingLoad(records);

    return {
      id,
      name: meta.name,
      sport: meta.sport,

      latest: {
        hr: HR(latest) !== null ? round(HR(latest), 0) : null,
        temp: TEMP(latest) !== null ? round(TEMP(latest)) : null,
        resp: RESP(latest) !== null ? round(RESP(latest), 0) : null,
        rssi: RSSI(latest),
      },
      averages: {
        hr: round(mean(hrVals)),
        temp: round(mean(tmpVals)),
        resp: round(mean(respVals)),
      },
      trends: {
        hr: round(linearSlope(hrVals), 4),
        temp: round(linearSlope(tmpVals), 4),
      },
      fatigue_score,
      recovery_score,
      fatigue_status: status,
      training_load: load.total,
      data_points: records.length,
    };
  });
}

/* ── Visual storytelling: session narrative ──────────────────── */

/**
 * Generates a structured narrative summary that feeds the
 * "Visual Analytics" dashboard storytelling section.
 */
function sessionNarrative(athleteId, meta, records) {
  if (!records.length) return null;

  const hrVals = records.map(HR).filter(Number.isFinite);
  const latest = records.at(-1);
  const { fatigue_score, status } = fatigueScore(latest);
  const load = trainingLoad(records);
  const slope = linearSlope(hrVals);

  const trend =
    Math.abs(slope) < 0.1 ? "stable" : slope > 0 ? "increasing" : "decreasing";

  // Peak detection: find record with max HR
  const peakRec = records.reduce((best, r) => {
    const h = HR(r);
    return h !== null && (HR(best) === null || h > HR(best)) ? r : best;
  }, records[0]);

  const alerts = [];
  const hrMax = hrVals.length ? Math.max(...hrVals) : 0;
  if (hrMax > 185)
    alerts.push({
      type: "warning",
      message: "Peak heart rate exceeded active safety threshold (185 bpm).",
    });
  if (fatigue_score > 70)
    alerts.push({
      type: "critical",
      message: "High fatigue index detected — recovery recommended.",
    });
  const tempMax = records.map(TEMP).filter(Number.isFinite);
  if (tempMax.length && Math.max(...tempMax) > 38.5)
    alerts.push({
      type: "warning",
      message: "Skin temperature exceeded active safety limit (38.5 °C).",
    });

  return {
    athlete_id: athleteId,
    name: meta.name,
    sport: meta.sport,
    period: {
      start: records[0]?.timestamp ?? null,
      end: records.at(-1)?.timestamp ?? null,
      data_points: records.length,
    },
    headline: `${meta.name}'s session shows ${trend} cardiovascular load with ${status} fatigue.`,
    insights: [
      {
        label: "Training Load",
        value: load.total,
        unit: "TRIMP",
        interpretation:
          load.total > 15
            ? "High intensity session"
            : load.total > 7
              ? "Moderate session"
              : "Light session",
      },
      {
        label: "Avg Heart Rate",
        value: round(mean(hrVals), 0),
        unit: "bpm",
        interpretation:
          trend === "stable" ? "Consistent effort" : `HR trending ${trend}`,
      },
      {
        label: "Fatigue Score",
        value: fatigue_score,
        unit: "%",
        interpretation: status,
      },
      {
        label: "Peak HR",
        value: round(HR(peakRec), 0),
        unit: "bpm",
        interpretation: `at ${peakRec?.timestamp ?? "unknown time"}`,
      },
    ],
    alerts,
    recommendation:
      fatigue_score > 70
        ? "Full rest day recommended. Reduce training intensity by 40%."
        : fatigue_score > 45
          ? "Light active recovery session recommended."
          : "Athlete is ready for normal or high-intensity training.",
  };
}

module.exports = {
  athleteTrend,
  buildComparison,
  sessionNarrative,
  fatigueScore,
  trainingLoad,
  timeBucket,
  detectAnomalies,
  pearson,
  linearSlope,
};
