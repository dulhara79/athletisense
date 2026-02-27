const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { WebSocketServer } = require('ws');
const http = require('http');
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require("C:/Users/dulha/Downloads/GitHub/athletisense/backend/performance-monitering-glove-firebase-adminsdk.json");

// ─── Initialize Firebase Admin ────────────────────────────────────────────────
if (process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase Admin initialized successfully');
  } catch (err) {
    console.error('Firebase Admin initialization error:', err.message);
  }
} else {
  console.warn('Firebase environment variables missing. Falling back to CSV only.');
}

const db = admin.apps.length ? admin.database() : null;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// // ─── Load CSV Data ────────────────────────────────────────────────────────────
// const CSV_PATH = path.join(__dirname, 'data', 'smart_athlete_full_year.csv');

// function loadCSVData() {
//   const raw = fs.readFileSync(CSV_PATH, 'utf8');
//   try {
//     const records = parse(raw, {
//       // Normalize header row: replace null/empty names with generated names
//       columns: (header) => header.map((h, i) => {
//         if (h === null || h === undefined) return `COL_${i}`;
//         const s = String(h).trim();
//         return s.length ? s : `COL_${i}`;
//       }),
//       skip_empty_lines: true,
//       cast: (value, context) => {
//         if (context.column === 'Timestamp' || context.column === 'Athlete_ID') return value;
//         return parseFloat(value);
//       }
//     });
//     return records;
//   } catch (err) {
//     console.error('Failed to parse CSV:', err && err.message ? err.message : err);
//     return [];
//   }
// }

// let allData = loadCSVData();

// // Auto-import CSV data to Firebase on startup (disabled by default).
// // To enable this behavior set the environment variable `AUTO_IMPORT_CSV=true`.
// if (process.env.FIREBASE_PROJECT_ID && admin.apps.length && process.env.AUTO_IMPORT_CSV === 'true') {
//   (async () => {
//     try {
//       const subset = allData.slice(0, 50);
//       if (subset.length > 0) {
//         console.log(`Auto-importing ${subset.length} records to Firebase...`);
//         const ref = admin.database().ref('athlete_records');
//         for (const record of subset) {
//           await ref.push(record);
//         }
//         console.log('Successfully auto-imported data to Firebase!');
//       }
//     } catch (err) {
//       console.error('Auto-import failed:', err.message);
//     }
//   })();
// } else {
//   if (process.env.FIREBASE_PROJECT_ID && admin.apps.length) {
//     console.log('AUTO_IMPORT_CSV not enabled; skipping CSV auto-import on startup. Use the /api/import-csv endpoint or run the import script to load data.');
//   }
// }

// Keep only primitive properties to avoid circular/nested structures when serializing
function sanitizeRecord(rec) {
  if (!rec || typeof rec !== 'object') return rec;
  return Object.fromEntries(Object.entries(rec).filter(([k, v]) => {
    return v === null || (typeof v !== 'object' && typeof v !== 'function');
  }));
}

// Simulate new data stream (appends latest row variants in memory)
let simulationIndex = 0;

function getAthletes() {
  const ids = [...new Set(allData.map(r => r.Athlete_ID))];
  return ids.map(id => ({
    id,
    name: getAthleteName(id),
    sport: getAthleteSport(id),
    data: allData.filter(r => r.Athlete_ID === id)
  }));
}

// function getAthleteName(id) {
//   const names = {
//     ATH_001: 'Marcus Thorne',
//     ATH_002: 'Sarah Chen',
//     ATH_003: 'Diego Ramirez',
//     ATH_004: 'Aisha Patel'
//   };
//   return names[id] || id;
// }

// function getAthleteSport(id) {
//   const sports = {
//     ATH_001: 'Elite Runner',
//     ATH_002: 'Cyclist',
//     ATH_003: 'Swimmer',
//     ATH_004: 'Sprinter'
//   };
//   return sports[id] || 'Athlete';
// }

// ─── REST API Routes ──────────────────────────────────────────────────────────

// GET /api/athletes - list all athletes
app.get('/api/athletes', (req, res) => {
  const athletes = getAthletes().map(a => ({
    id: a.id,
    name: a.name,
    sport: a.sport,
    latestRecord: a.data && a.data.length ? sanitizeRecord(a.data[a.data.length - 1]) : null
  }));
  res.json({ athletes });
});

// GET /api/athletes/:id - full data for one athlete
app.get('/api/athletes/:id', (req, res) => {
  const { id } = req.params;
  const athleteData = allData.filter(r => r.Athlete_ID === id);
  if (!athleteData.length) return res.status(404).json({ error: 'Athlete not found' });
  res.json({
    id,
    name: getAthleteName(id),
    sport: getAthleteSport(id),
    records: athleteData.map(sanitizeRecord)
  });
});

// GET /api/athletes/:id/latest - latest record
app.get('/api/athletes/:id/latest', (req, res) => {
  const { id } = req.params;
  const athleteData = allData.filter(r => r.Athlete_ID === id);
  if (!athleteData.length) return res.status(404).json({ error: 'Athlete not found' });
  const latest = athleteData[athleteData.length - 1];
  res.json(sanitizeRecord(latest));
});

// GET /api/summary - aggregated stats for admin dashboard
app.get('/api/summary', (req, res) => {
  try {
    const athletes = getAthletes();
    const summary = athletes.map(a => {
      const data = Array.isArray(a.data) ? a.data : [];
      const latest = data.length ? data[data.length - 1] : null;

      const hrValues = data.map(d => Number(d.MAX30102_Heart_Rate_bpm) || 0);
      const avgHR = hrValues.length ? (hrValues.reduce((s, v) => s + v, 0) / hrValues.length) : 0;
      const maxHR = hrValues.length ? hrValues.reduce((m, v) => (v > m ? v : m), hrValues[0]) : 0;

      const tempValues = data.map(d => Number(d.DS18B20_Skin_Temperature_C) || 0);
      const avgTemp = tempValues.length ? (tempValues.reduce((s, v) => s + v, 0) / tempValues.length) : 0;

      const fatigueValues = data.map(d => Number(d.Fatigue_Index) || 0);
      const avgFatigue = fatigueValues.length ? (fatigueValues.reduce((s, v) => s + v, 0) / fatigueValues.length) : 0;

      return {
        id: a.id,
        name: a.name,
        sport: a.sport,
        latestHR: latest ? latest.MAX30102_Heart_Rate_bpm : null,
        avgHR: Math.round(avgHR * 10) / 10,
        maxHR,
        latestTemp: latest ? latest.DS18B20_Skin_Temperature_C : null,
        avgTemp: Math.round(avgTemp * 100) / 100,
        latestFatigue: latest ? latest.Fatigue_Index : null,
        avgFatigue: Math.round(avgFatigue * 100) / 100,
        latestMotion: latest ? latest.Motion_Magnitude : null,
        dataPoints: data.length
      };
    });
    res.json({ summary });
  } catch (err) {
    console.error('Error building summary:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to build summary' });
  }
});

// POST /api/import-csv - Manual trigger to import CSV data to Firebase
app.post('/api/import-csv', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firebase not initialized' });

  try {
    const records = loadCSVData().slice(0, 50);
    const ref = db.ref('athlete_records');

    // Clear existing data or append? The user said "add", so we append.
    for (const record of records) {
      await ref.push(record);
    }

    res.json({ message: `Successfully imported ${records.length} records to Firebase` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebSocket: Simulate live streaming ──────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');

  // Send current data snapshot
  ws.send(JSON.stringify({ type: 'snapshot', data: allData.map(sanitizeRecord) }));

  // Stream new simulated data every 4 seconds
  const interval = setInterval(() => {
    const athletes = [...new Set(allData.map(r => r.Athlete_ID))];
    const liveUpdates = athletes.map(id => {
      const prev = allData.filter(r => r.Athlete_ID === id).slice(-1)[0];
      const now = new Date();
      const newRecord = {
        Timestamp: now.toISOString().replace('T', ' ').slice(0, 19),
        Athlete_ID: id,
        BMI160_Acc_X: prev.BMI160_Acc_X + (Math.random() - 0.5) * 0.5,
        BMI160_Acc_Y: prev.BMI160_Acc_Y + (Math.random() - 0.5) * 0.5,
        BMI160_Acc_Z: prev.BMI160_Acc_Z + (Math.random() - 0.5) * 0.3,
        BMI160_Gyro_X: prev.BMI160_Gyro_X + (Math.random() - 0.5) * 20,
        BMI160_Gyro_Y: prev.BMI160_Gyro_Y + (Math.random() - 0.5) * 20,
        BMI160_Gyro_Z: prev.BMI160_Gyro_Z + (Math.random() - 0.5) * 20,
        Motion_Magnitude: Math.max(0, prev.Motion_Magnitude + (Math.random() - 0.5) * 1),
        MAX30102_Heart_Rate_bpm: Math.max(50, Math.min(200, prev.MAX30102_Heart_Rate_bpm + (Math.random() - 0.5) * 10)),
        MAX30102_PPG_Signal: prev.MAX30102_PPG_Signal + (Math.random() - 0.5) * 500,
        DS18B20_Skin_Temperature_C: Math.max(30, Math.min(40, prev.DS18B20_Skin_Temperature_C + (Math.random() - 0.5) * 0.3)),
        StrainGauge_Force_N: Math.max(0, prev.StrainGauge_Force_N + (Math.random() - 0.5) * 5),
        Fatigue_Index: Math.max(0, Math.min(1, prev.Fatigue_Index + (Math.random() - 0.5) * 0.05))
      };
      allData.push(newRecord);
      // Keep only last 100 records per athlete
      const athleteRecords = allData.filter(r => r.Athlete_ID === id);
      if (athleteRecords.length > 100) {
        const toRemove = athleteRecords.slice(0, athleteRecords.length - 100);
        allData = allData.filter(r => !toRemove.includes(r));
      }
      return newRecord;
    });

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'live_update', data: liveUpdates.map(sanitizeRecord) }));
    }
  }, 4000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`AthletiSense Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Express error handler to ensure JSON responses on server errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.message ? err.message : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});
