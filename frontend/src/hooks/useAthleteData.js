// src/hooks/useAthleteData.js
// ─────────────────────────────────────────────────────────────
// Single source of truth for all athlete data.
// Reads directly from Firebase Realtime DB — no static data.
// Normalises both IoT nested format and any flat format.
// Provides getAthleteData(id), getLatest(id), and a full
// athletes list built from /users + /athlete_records.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { ref as dbRef, onValue } from "firebase/database";
import { db, auth } from "../firebase";
import {
  API_BASE,
  WS_URL,
  getBpm,
  getTemp,
  getResp,
  getMag,
  getSteps,
  getRssi,
} from "../utils/dataHelpers";

function normaliseRecord(rec) {
  if (!rec) return null;
  const m = rec.motion;
  let mag = 0;
  if (m) {
    const { accel_x: ax = 0, accel_y: ay = 0, accel_z: az = 0 } = m;
    mag = Math.sqrt(ax * ax + ay * ay + az * az) / 16384;
  }
  const resp =
    rec.respiration?.rate_avg ??
    rec.respiration?.rate_instant ??
    (rec.strain?.raw ? Math.round(rec.strain.raw / 30) : 0);

  return {
    ...rec,
    _bpm: rec.heart_rate?.bpm_avg ?? rec.heart_rate?.bpm ?? 0,
    _temp_c: rec.temperature?.celsius ?? 0,
    _resp_rate: resp,
    _motion_mag: mag,
    _step_count: rec.motion?.step_count ?? 0,
    _strain_raw: rec.strain?.raw ?? rec.respiration?.strain_raw ?? 0,
    _rssi: rec.system?.wifi_rssi ?? null,
  };
}

function buildSummary(id, records, meta) {
  const latest = records.at(-1) ?? null;
  const hrVals = records.map((r) => r._bpm).filter((v) => v > 0);
  const tmpVals = records.map((r) => r._temp_c).filter((v) => v > 0);
  const fatVals = records.map((r) => r.Fatigue_Index || 0);
  const a = (arr) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
  return {
    id,
    name: meta?.name || id,
    sport: meta?.sport || "Athlete",
    latestHR: latest?._bpm,
    avgHR: Math.round(a(hrVals) * 10) / 10,
    maxHR: hrVals.length ? Math.max(...hrVals) : 0,
    latestTemp: latest?._temp_c,
    avgTemp: Math.round(a(tmpVals) * 100) / 100,
    latestFatigue: latest?.Fatigue_Index ?? null,
    avgFatigue: Math.round(a(fatVals) * 100) / 100,
    latestMotion: latest?._motion_mag,
    latestSteps: latest?._step_count,
    dataPoints: records.length,
  };
}

export function useAthleteData() {
  const [athletes, setAthletes] = useState([]);
  const [liveData, setLiveData] = useState({}); // { [id]: normalised[] }
  const [summary, setSummary] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  // ── Firebase path ────────────────────────────────────────────
  useEffect(() => {
    if (!db) {
      // WS + REST fallback
      const fetchRest = async () => {
        try {
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
          const [ar, sr] = await Promise.all([
            fetch(`${API_BASE}/athletes`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
            fetch(`${API_BASE}/summary`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
          ]);
          setAthletes(ar.athletes || []);
          setSummary(sr.summary || []);
        } catch (e) {
          console.error("[useAthleteData] REST:", e);
        } finally {
          setLoading(false);
        }
      };
      fetchRest();

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type === "snapshot") {
            const map = {};
            msg.athletes?.forEach((a) => {
              if (a.latest) map[a.id] = [normaliseRecord(a.latest)];
            });
            setLiveData(map);
            setAthletes(
              msg.athletes?.map((a) => ({
                id: a.id,
                name: a.name,
                sport: a.sport,
                latestRecord: normaliseRecord(a.latest),
              })) || [],
            );
          } else if (msg.type === "live_update") {
            const rec = normaliseRecord(msg.data);
            if (!rec) return;
            setLiveData((prev) => {
              const arr = [...(prev[msg.athlete_id] || []), rec].slice(-60);
              return { ...prev, [msg.athlete_id]: arr };
            });
          }
        } catch {
          /* ignore */
        }
      };
      return () => ws.close();
    }

    // ── Firebase direct ──────────────────────────────────────
    const usersRef = dbRef(db, "users");
    const recordsRef = dbRef(db, "athlete_records");
    let usersMap = {};

    const unsubUsers = onValue(usersRef, (snap) => {
      usersMap = {};
      if (snap.exists()) {
        Object.values(snap.val()).forEach((u) => {
          if (u?.athleteId)
            usersMap[u.athleteId] = {
              name: u.name || u.athleteId,
              sport: u.sport || "Athlete",
              age: u.age,
            };
        });
      }
    });

    const unsub = onValue(recordsRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setLoading(false);
        return;
      }

      const keys = Object.keys(val);
      const isPerAthlete =
        keys.length && (val[keys[0]]?.readings || val[keys[0]]?.latest);
      const map = {};

      if (isPerAthlete) {
        keys.forEach((aid) => {
          const node = val[aid] || {};
          const recs = Object.values(node.readings || {})
            .map((r) => normaliseRecord(r))
            .filter(Boolean);
          if (node.latest) {
            const lat = normaliseRecord(node.latest);
            if (lat && !recs.some((r) => r.timestamp === lat.timestamp))
              recs.push(lat);
          }
          recs.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
          map[aid] = recs;
        });
      } else {
        Object.values(val).forEach((rec) => {
          const n = normaliseRecord(rec);
          if (!n) return;
          const id = n.athlete_id || n.Athlete_ID || "UNKNOWN";
          if (!map[id]) map[id] = [];
          map[id].push(n);
        });
        Object.keys(map).forEach((id) =>
          map[id].sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1)),
        );
      }

      // Include users with no records yet
      Object.keys(usersMap).forEach((aid) => {
        if (!map[aid]) map[aid] = [];
      });

      const athletesList = Object.keys(map).map((id) => ({
        id,
        name: usersMap[id]?.name || map[id].at(-1)?.name || id,
        sport: usersMap[id]?.sport || map[id].at(-1)?.sport || "Athlete",
        latestRecord: map[id].at(-1) ?? null,
      }));

      const summaryList = Object.keys(map).map((id) =>
        buildSummary(id, map[id], usersMap[id]),
      );

      setLiveData(map);
      setAthletes(athletesList);
      setSummary(summaryList);
      setConnected(true);
      setLoading(false);
    });

    return () => {
      try {
        unsub();
        unsubUsers();
      } catch {}
      setConnected(false);
    };
  }, []);

  const getAthleteData = useCallback((id) => liveData[id] || [], [liveData]);
  const getLatest = useCallback(
    (id) => (liveData[id] || []).at(-1) ?? null,
    [liveData],
  );

  return {
    athletes,
    liveData,
    summary,
    connected,
    loading,
    getAthleteData,
    getLatest,
  };
}
