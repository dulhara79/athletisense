/**
 * src/__tests__/analyticsService.test.js
 * Unit tests for the analytics service — pure functions only,
 * no Firebase, no network, no credentials needed.
 */
'use strict';

jest.mock('../config/firebase', () => ({ db: null, admin: { auth: () => ({ verifyIdToken: jest.fn() }) } }));
jest.mock('../config/logger',   () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), stream: { write: jest.fn() } }));

const {
  athleteTrend,
  buildComparison,
  fatigueScore,
  trainingLoad,
  timeBucket,
  detectAnomalies,
  pearson,
  linearSlope,
  sessionNarrative,
} = require('../services/analyticsService');

// ── Shared fixture ────────────────────────────────────────────
const makeRec = (bpm, celsius, resp, steps, ts) => ({
  heart_rate:  { bpm_avg: bpm },
  temperature: { celsius },
  respiration: { rate_avg: resp },
  motion:      { step_count: steps, accel_x: 0, accel_y: 0, accel_z: 16384 },
  timestamp:   ts || '2025-03-16 14:30:00',
});

const SAMPLES = [
  makeRec(68, 36.5, 13, 500,  '2025-03-16 08:00:00'),
  makeRec(72, 36.7, 14, 800,  '2025-03-16 09:00:00'),
  makeRec(145, 37.3, 22, 2000, '2025-03-16 10:00:00'),
  makeRec(162, 37.8, 28, 3500, '2025-03-16 11:00:00'),
  makeRec(80, 36.9, 16, 4200, '2025-03-16 12:00:00'),
];

// ── linearSlope ───────────────────────────────────────────────
describe('linearSlope', () => {
  it('returns positive slope for ascending series', () => {
    expect(linearSlope([1, 2, 3, 4, 5])).toBeGreaterThan(0);
  });
  it('returns negative slope for descending series', () => {
    expect(linearSlope([5, 4, 3, 2, 1])).toBeLessThan(0);
  });
  it('returns 0 for flat series', () => {
    expect(linearSlope([5, 5, 5, 5])).toBe(0);
  });
  it('returns 0 for single value', () => {
    expect(linearSlope([42])).toBe(0);
  });
});

// ── pearson ───────────────────────────────────────────────────
describe('pearson', () => {
  it('returns ~1 for perfectly correlated series', () => {
    const xs = [1, 2, 3, 4, 5];
    expect(pearson(xs, xs)).toBeCloseTo(1, 1);
  });
  it('returns ~-1 for inversely correlated series', () => {
    expect(pearson([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 1);
  });
  it('returns null for fewer than 3 points', () => {
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });
});

// ── fatigueScore ──────────────────────────────────────────────
describe('fatigueScore', () => {
  it('returns optimal for resting normal values', () => {
    const { status } = fatigueScore(makeRec(65, 36.5, 14, 0));
    expect(status).toBe('optimal');
  });
  it('returns critical for very high HR + temp', () => {
    const { status, fatigue_score } = fatigueScore(makeRec(200, 40, 45, 0));
    expect(fatigue_score).toBeGreaterThan(75);
    expect(status).toBe('critical');
  });
  it('returns unknown for null input', () => {
    expect(fatigueScore(null).status).toBe('unknown');
  });
  it('recovery_score + fatigue_score === 100', () => {
    const r = fatigueScore(makeRec(80, 37.0, 16, 0));
    expect(r.fatigue_score + r.recovery_score).toBeCloseTo(100, 5);
  });
});

// ── trainingLoad ──────────────────────────────────────────────
describe('trainingLoad', () => {
  it('returns zero total for empty records', () => {
    expect(trainingLoad([]).total).toBe(0);
  });
  it('returns positive total for active records', () => {
    expect(trainingLoad(SAMPLES).total).toBeGreaterThan(0);
  });
  it('higher HR produces higher load', () => {
    const lo = trainingLoad([makeRec(70, 36.5, 14, 0)]);
    const hi = trainingLoad([makeRec(180, 37.5, 30, 0)]);
    expect(hi.total).toBeGreaterThan(lo.total);
  });
});

// ── detectAnomalies ───────────────────────────────────────────
describe('detectAnomalies', () => {
  it('detects the outlier in a series', () => {
    const records = [
      makeRec(70, 36.5, 14, 0),
      makeRec(72, 36.6, 14, 0),
      makeRec(71, 36.5, 15, 0),
      makeRec(75, 36.7, 14, 0),
      makeRec(220, 36.6, 14, 0), // outlier
    ];
    const anomalies = detectAnomalies(records, r => r?.heart_rate?.bpm_avg ?? null);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(anomalies[0].value).toBe(220);
  });
  it('returns empty array for uniform series', () => {
    const records = Array(5).fill(makeRec(70, 36.5, 14, 0));
    expect(detectAnomalies(records, r => r?.heart_rate?.bpm_avg ?? null)).toHaveLength(0);
  });
});

// ── timeBucket ────────────────────────────────────────────────
describe('timeBucket', () => {
  it('groups records into correct hourly buckets', () => {
    const series = timeBucket(SAMPLES, 'hourly');
    expect(series.length).toBeGreaterThan(0);
    series.forEach(b => {
      expect(b).toHaveProperty('bucket');
      expect(b).toHaveProperty('avg_hr');
      expect(b).toHaveProperty('avg_temp');
    });
  });
  it('produces fewer buckets for daily than hourly', () => {
    const hourly = timeBucket(SAMPLES, 'hourly');
    const daily  = timeBucket(SAMPLES, 'daily');
    expect(daily.length).toBeLessThanOrEqual(hourly.length);
  });
  it('returns empty array for empty input', () => {
    expect(timeBucket([], 'hourly')).toHaveLength(0);
  });
});

// ── athleteTrend ──────────────────────────────────────────────
describe('athleteTrend', () => {
  it('returns null for empty records', () => {
    expect(athleteTrend([])).toBeNull();
  });
  it('returns all required keys', () => {
    const trend = athleteTrend(SAMPLES);
    expect(trend).toHaveProperty('heart_rate');
    expect(trend).toHaveProperty('temperature');
    expect(trend).toHaveProperty('respiration');
    expect(trend).toHaveProperty('fatigue');
    expect(trend).toHaveProperty('training_load');
    expect(trend).toHaveProperty('anomalies');
    expect(trend).toHaveProperty('correlations');
    expect(trend).toHaveProperty('time_series');
  });
  it('reports correct data_points count', () => {
    expect(athleteTrend(SAMPLES).data_points).toBe(SAMPLES.length);
  });
});

// ── buildComparison ───────────────────────────────────────────
describe('buildComparison', () => {
  it('returns one row per athlete', () => {
    const map = {
      ATH_001: { meta: { name: 'Alice', sport: 'Runner' }, records: SAMPLES },
      ATH_002: { meta: { name: 'Bob',   sport: 'Cyclist'}, records: SAMPLES.slice(0, 3) },
    };
    const result = buildComparison(map);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('fatigue_score');
    expect(result[0]).toHaveProperty('training_load');
  });
});

// ── sessionNarrative ─────────────────────────────────────────
describe('sessionNarrative', () => {
  it('returns null for empty records', () => {
    expect(sessionNarrative('ATH_001', { name: 'X', sport: 'Y' }, [])).toBeNull();
  });
  it('includes headline, insights, recommendation', () => {
    const n = sessionNarrative('ATH_001', { name: 'Marcus', sport: 'Runner' }, SAMPLES);
    expect(n).toHaveProperty('headline');
    expect(n.insights.length).toBeGreaterThan(0);
    expect(n).toHaveProperty('recommendation');
  });
});

// ── Health endpoint integration ───────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const request = require('supertest');
    const { app } = require('../server');
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});