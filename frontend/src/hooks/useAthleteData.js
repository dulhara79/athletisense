import { useState, useEffect, useRef, useCallback } from 'react';
import { ref as dbRef, onValue } from 'firebase/database';
import { db } from '../firebase';

const API_BASE = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

export function useAthleteData(athleteId = null) {
  const [athletes, setAthletes] = useState([]);
  const [liveData, setLiveData] = useState({}); // { athleteId: [...records] }
  const [summary, setSummary] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  // Fetch initial REST data
  const fetchInitial = useCallback(async () => {
    // If Firebase DB is available, skip REST fetch and rely on real-time listener
    if (db) {
      setLoading(false);
      return;
    }

    try {
      const [athRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/athletes`),
        fetch(`${API_BASE}/summary`)
      ]);
      const athData = await athRes.json();
      const sumData = await sumRes.json();
      setAthletes(athData.athletes || []);
      setSummary(sumData.summary || []);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAthleteHistory = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/athletes/${id}`);
      const data = await res.json();
      return data.records || [];
    } catch {
      return [];
    }
  }, []);

  // WebSocket for live updates
  useEffect(() => {
    // If Realtime Database is configured, attach a listener and use that as primary source
    if (db) {
      fetchInitial();
      const recordsRef = dbRef(db, 'athlete_records');
      const usersRef = dbRef(db, 'users');

      // users map: athleteId -> metadata
      let usersMap = {};

      const unsubUsers = onValue(usersRef, (uSnap) => {
        const uVal = uSnap.val();
        usersMap = {};
        if (uVal) {
          // uVal keyed by uid; each value contains athleteId, name, sport, etc.
          Object.values(uVal).forEach(user => {
            if (user && user.athleteId) {
              usersMap[user.athleteId] = {
                name: user.name || user.athleteId,
                sport: user.sport || 'Athlete',
                age: user.age || null
              };
            }
          });
        }
      });

      const unsub = onValue(recordsRef, (snapshot) => {
        const val = snapshot.val();
        const map = {};
        const athletesList = [];

        if (val) {
          // Two possible Realtime DB shapes:
          // 1) Flat pushes under /athlete_records/{pushId} -> { Athlete_ID, ... }
          // 2) Per-athlete nodes: /athlete_records/{athleteId}/{readings: {pushId: rec}, latest: rec}
          const keys = Object.keys(val);
          const looksLikePerAthlete = keys.length && (val[keys[0]] && (val[keys[0]].readings || val[keys[0]].latest));

          const normalizeRecord = (rec) => {
            if (!rec) return null;
            // If nested IoT format, convert to flat fields
            if (rec.heart_rate || rec.temperature || rec.motion) {
              let motionMag = 0;
              if (rec.motion) {
                const ax = rec.motion.accel_x || 0;
                const ay = rec.motion.accel_y || 0;
                const az = rec.motion.accel_z || 0;
                const g_to_ms2 = 9.81;
                const lsb_per_g = 16384;
                const accel_x_ms2 = (ax / lsb_per_g) * g_to_ms2;
                const accel_y_ms2 = (ay / lsb_per_g) * g_to_ms2;
                const accel_z_ms2 = (az / lsb_per_g) * g_to_ms2;
                motionMag = Math.sqrt(accel_x_ms2 ** 2 + accel_y_ms2 ** 2 + accel_z_ms2 ** 2);
              }

              let ts = rec.timestamp;
              if (typeof ts === 'number') {
                if (ts < 1000000000000) {
                  ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
                } else {
                  ts = new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
                }
              }

              return {
                ...rec,
                Athlete_ID: rec.Athlete_ID || rec.athlete_id || 'UNKNOWN',
                Timestamp: ts || rec.Timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
                AD8232_Heart_Rate_bpm: rec.heart_rate?.bpm || rec.AD8232_Heart_Rate_bpm || 0,
                DS18B20_Skin_Temperature_C: rec.temperature?.celsius || rec.DS18B20_Skin_Temperature_C || 0,
                StrainGauge_Force_N: rec.strain?.raw ? (rec.strain.raw / 100) : (rec.StrainGauge_Force_N || 0),
                Motion_Magnitude: motionMag || rec.Motion_Magnitude || 0,
                Fatigue_Index: rec.Fatigue_Index || 0
              };
            }

            // Already flat
            return {
              ...rec,
              Athlete_ID: rec.Athlete_ID || rec.athlete_id || 'UNKNOWN',
              Timestamp: rec.Timestamp || rec.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
              AD8232_Heart_Rate_bpm: rec.AD8232_Heart_Rate_bpm || 0,
              DS18B20_Skin_Temperature_C: rec.DS18B20_Skin_Temperature_C || 0,
              StrainGauge_Force_N: rec.StrainGauge_Force_N || 0,
              Motion_Magnitude: rec.Motion_Magnitude || 0,
              Fatigue_Index: rec.Fatigue_Index || 0
            };
          };

          if (looksLikePerAthlete) {
            // Each key is an athleteId
            keys.forEach(aid => {
              const node = val[aid] || {};
              const readingsObj = node.readings || {};
              const readings = Object.values(readingsObj).map(normalizeRecord).filter(Boolean);
              // If latest exists and isn't already in readings, include it
              if (node.latest) {
                const latestRec = normalizeRecord(node.latest);
                const exists = readings.some(r => r && r.Timestamp === latestRec.Timestamp);
                if (!exists) readings.push(latestRec);
              }

              // Sort readings by Timestamp
              readings.sort((a, b) => (a.Timestamp > b.Timestamp ? 1 : -1));
              map[aid] = readings;
              const latest = readings.length ? readings[readings.length - 1] : null;
              const meta = usersMap[aid] || { name: latest?.name || aid, sport: latest?.sport || 'Athlete' };
              athletesList.push({ id: aid, name: meta.name || aid, sport: meta.sport || 'Athlete', latestRecord: latest });
            });
          } else {
            // Flat pushed records under athlete_records/{pushId}
            const rawRecords = Object.values(val);
            const records = rawRecords.map(normalizeRecord).filter(Boolean);
            records.forEach(rec => {
              const id = rec.Athlete_ID || 'UNKNOWN';
              if (!map[id]) map[id] = [];
              map[id].push(rec);
            });

            // sort each athlete's records by Timestamp and build athletesList
            Object.keys(map).forEach(id => {
              map[id].sort((a, b) => (a.Timestamp > b.Timestamp ? 1 : -1));
              const latest = map[id][map[id].length - 1];
              const meta = usersMap[id] || { name: latest?.name || id, sport: latest?.sport || 'Athlete' };
              athletesList.push({ id, name: meta.name || id, sport: meta.sport || 'Athlete', latestRecord: latest ? latest : null });
            });
          }
        }

        // Ensure users without records are included in the map (so admins can see newly added users)
        Object.keys(usersMap).forEach(uidAthleteId => {
          if (!map[uidAthleteId]) {
            map[uidAthleteId] = [];
            athletesList.push({ id: uidAthleteId, name: usersMap[uidAthleteId].name, sport: usersMap[uidAthleteId].sport, latestRecord: null });
          }
        });

        // Build summary from grouped map
        const summaryList = Object.keys(map).map(id => {
          const data = map[id];
          const latest = data[data.length - 1] || null;
          const hrValues = data.map(d => Number(d.AD8232_Heart_Rate_bpm) || 0);
          const avgHR = hrValues.length ? (hrValues.reduce((s, v) => s + v, 0) / hrValues.length) : 0;
          const maxHR = hrValues.length ? hrValues.reduce((m, v) => (v > m ? v : m), hrValues[0]) : 0;
          const tempValues = data.map(d => Number(d.DS18B20_Skin_Temperature_C) || 0);
          const avgTemp = tempValues.length ? (tempValues.reduce((s, v) => s + v, 0) / tempValues.length) : 0;
          const fatigueValues = data.map(d => Number(d.Fatigue_Index) || 0);
          const avgFatigue = fatigueValues.length ? (fatigueValues.reduce((s, v) => s + v, 0) / fatigueValues.length) : 0;
          return {
            id,
            // Prefer metadata from usersMap if available
            name: (usersMap[id] && usersMap[id].name) || latest?.name || id,
            sport: (usersMap[id] && usersMap[id].sport) || latest?.sport || 'Athlete',
            latestHR: latest ? latest.AD8232_Heart_Rate_bpm : null,
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

        setLiveData(map);
        setAthletes(athletesList);
        setSummary(summaryList);
        setConnected(true);
        setLoading(false);
      });

      return () => {
        try { unsub(); } catch (e) { }
        try { unsubUsers(); } catch (e) { }
        setConnected(false);
      };
    }

    // Fallback: use WebSocket + REST
    fetchInitial();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'snapshot') {
        // Build initial liveData map
        const map = {};
        msg.data.forEach(record => {
          if (!map[record.Athlete_ID]) map[record.Athlete_ID] = [];
          map[record.Athlete_ID].push(record);
        });
        setLiveData(map);
      } else if (msg.type === 'live_update') {
        setLiveData(prev => {
          const updated = { ...prev };
          msg.data.forEach(record => {
            const id = record.Athlete_ID;
            const arr = [...(updated[id] || []), record];
            // Keep last 50 for charts
            updated[id] = arr.slice(-50);
          });
          return updated;
        });
        // Update summary latest values
        setSummary(prev => prev.map(s => {
          const update = msg.data.find(d => d.Athlete_ID === s.id);
          if (!update) return s;
          return {
            ...s,
            latestHR: update.AD8232_Heart_Rate_bpm,
            latestTemp: update.DS18B20_Skin_Temperature_C,
            latestFatigue: update.Fatigue_Index,
            latestMotion: update.Motion_Magnitude
          };
        }));
      }
    };

    return () => ws.close();
  }, [fetchInitial]);

  // Filter data for specific athlete if role requires it
  const getAthleteData = (id) => liveData[id] || [];
  const getLatest = (id) => {
    const data = liveData[id] || [];
    return data[data.length - 1] || null;
  };

  return {
    athletes,
    liveData,
    summary,
    connected,
    loading,
    getAthleteData,
    getLatest,
    fetchAthleteHistory
  };
}
