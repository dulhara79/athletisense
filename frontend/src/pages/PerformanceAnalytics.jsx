import React, { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Filter,
  RefreshCw,
  ChevronRight,
  WifiOff,
  ChevronDown,
} from "lucide-react";

const API_BASE = "http://localhost:3001";
const WS_URL = "ws://localhost:3001";

const ATHLETE_META = {
  ATH_001: { name: "Marcus Thorne", sport: "Elite Runner", avatar: "MT" },
  ATH_002: { name: "Sarah Chen", sport: "Cyclist", avatar: "SC" },
  ATH_003: { name: "Diego Ramirez", sport: "Swimmer", avatar: "DR" },
  ATH_004: { name: "Aisha Patel", sport: "Sprinter", avatar: "AP" },
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function motionMag(r) {
  if (!r?.motion) return 0;
  const { accel_x: ax = 0, accel_y: ay = 0, accel_z: az = 0 } = r.motion;
  return parseFloat(
    (Math.sqrt(ax * ax + ay * ay + az * az) / 16384).toFixed(3),
  );
}

function parseTs(ts) {
  if (!ts) return null;
  const [datePart, timePart] = ts.split(" ");
  if (!datePart) return null;
  const [dd, mm, yyyy] = datePart.split("/");
  return new Date(`${yyyy}-${mm}-${dd}T${timePart || "00:00:00"}`);
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ChartTip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: t.shadow,
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <p style={{ color: t.muted, marginBottom: 5, fontWeight: 700 }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color || p.stroke,
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          {p.name}:{" "}
          <span style={{ color: t.text }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function Select({ label, options, value, onChange, multi, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const display = multi
    ? value.length === 0
      ? label
      : value.length === options.length
        ? "All Athletes"
        : `${value.length} selected`
    : options.find((o) => o.value === value)?.label || label;

  return (
    <div
      ref={ref}
      style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          padding: "8px 12px",
          borderRadius: 10,
          background: t.surface,
          border: `1px solid ${t.border}`,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: t.text,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {display}
        </span>
        <ChevronDown
          size={13}
          color={t.muted}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 200,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            boxShadow: t.shadowHover,
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          {options.map((opt) => {
            const sel = multi ? value.includes(opt.value) : value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (multi) {
                    onChange(
                      sel
                        ? value.filter((v) => v !== opt.value)
                        : [...value, opt.value],
                    );
                  } else {
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px 14px",
                  background: sel ? t.accentBg : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: sel ? 700 : 500,
                  color: sel ? t.accent : t.text,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: "background 0.15s",
                }}
              >
                {multi && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      border: `2px solid ${sel ? t.accent : t.border}`,
                      background: sel ? t.accent : "transparent",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {sel && (
                      <span
                        style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({ title, children, t, action }) {
  return (
    <div
      className="card-fadein"
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "1.125rem 1.25rem",
        boxShadow: t.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: t.muted,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function heatColor(value, min, max) {
  if (max === min) return "#93c5fd";
  const pct = (value - min) / (max - min);
  if (pct < 0.5) {
    const t = pct * 2;
    return `rgb(${Math.round(147 + 108 * t)},${Math.round(197 + -78 * t)},${Math.round(253 + -253 * t + 200 * (1 - t))})`;
  } else {
    const t = (pct - 0.5) * 2;
    return `rgb(${Math.round(255)},${Math.round(119 - 119 * t)},${Math.round(200 * Math.max(0, 1 - t * 2))})`;
  }
}

export default function PerformanceAnalytics({ t }) {
  const [athletes, setAthletes] = useState([]);
  const [allRecords, setAllRecords] = useState({});
  const [liveLatest, setLiveLatest] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  // Role-based filtering
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const myAthleteId = user?.athleteId;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));
  const monthOptions = [
    { value: "all", label: "All Months" },
    ...MONTHS.map((m, i) => ({ value: String(i), label: m })),
  ];

  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterAthletes, setFilterAthletes] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/athletes`)
      .then((r) => r.json())
      .then(async ({ athletes: list }) => {
        // Role-based filter: athletes only see their own data
        const filtered = (!isAdmin && myAthleteId)
          ? (list || []).filter(a => a.id === myAthleteId)
          : (list || []);
        setAthletes(filtered);
        setFilterAthletes(filtered.map((a) => a.id));
        const latestMap = {};
        list?.forEach((a) => {
          if (a.latest) latestMap[a.id] = a.latest;
        });
        setLiveLatest(latestMap);

        const histories = await Promise.all(
          (list || []).map((a) =>
            fetch(`${API_BASE}/api/athletes/${a.id}/history?limit=200`)
              .then((r) => r.json())
              .then((d) => ({
                id: a.id,
                readings: d.readings?.reverse() || [],
              }))
              .catch(() => ({ id: a.id, readings: [] })),
          ),
        );
        const rec = {};
        histories.forEach((h) => {
          rec[h.id] = h.readings;
        });
        setAllRecords(rec);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "live_update" && msg.athlete_id && msg.data) {
            const { athlete_id: id, data } = msg;
            setLiveLatest((p) => ({ ...p, [id]: data }));
            setAllRecords((p) => {
              const existing = p[id] || [];
              return { ...p, [id]: [...existing, data].slice(-200) };
            });
          }
        } catch (e) {}
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  const filteredRecords = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    const all = ids.flatMap((id) =>
      (allRecords[id] || []).map((r) => ({ ...r, _athleteId: id })),
    );
    return all.filter((r) => {
      const d = parseTs(r.timestamp);
      if (!d) return true;
      if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear))
        return false;
      if (filterMonth !== "all" && d.getMonth() !== parseInt(filterMonth))
        return false;
      return true;
    });
  }, [allRecords, filterAthletes, filterYear, filterMonth, athletes]);

  const monthlyLoad = useMemo(() => {
    const buckets = MONTHS.map((m, i) => ({
      month: m,
      hrLoad: 0,
      steps: 0,
      motion: 0,
      count: 0,
    }));
    filteredRecords.forEach((r) => {
      const d = parseTs(r.timestamp);
      if (!d) return;
      const mi = d.getMonth();
      buckets[mi].hrLoad += r?.heart_rate?.bpm_avg || 0;
      buckets[mi].steps += (r?.motion?.step_count || 0) / 100;
      buckets[mi].motion += motionMag(r) * 50;
      buckets[mi].count++;
    });
    return buckets.map((b) => ({
      month: b.month,
      "Training Load": b.count ? Math.round(b.hrLoad / b.count) : 0,
      "Steps (÷100)": b.count ? Math.round(b.steps / b.count) : 0,
      Motion: b.count ? parseFloat((b.motion / b.count).toFixed(1)) : 0,
    }));
  }, [filteredRecords]);

  const seasonalHR = useMemo(() => {
    const n = filteredRecords.length;
    if (!n) return [];
    const seasons = ["Pre-Season", "Off-Season", "In-Season", "Post-Season"];
    return seasons.map((s, i) => {
      const slice = filteredRecords.slice(
        Math.floor((n * i) / 4),
        Math.floor((n * (i + 1)) / 4),
      );
      const hrValues = slice
        .map((r) => r?.heart_rate?.bpm_avg || 0)
        .filter(Boolean);
      return {
        season: s,
        avgHR: hrValues.length ? Math.round(avg(hrValues)) : 0,
      };
    });
  }, [filteredRecords]);

  const breathingTrend = useMemo(() => {
    const points = [];
    for (
      let i = 0;
      i < filteredRecords.length;
      i += Math.max(1, Math.floor(filteredRecords.length / 15))
    ) {
      const slice = filteredRecords.slice(i, i + 5);
      const rates = slice
        .map((r) => r?.respiration?.rate_avg || 0)
        .filter(Boolean);
      const d = parseTs(filteredRecords[i]?.timestamp);
      points.push({
        label: d
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `P${Math.floor(i / 5) + 1}`,
        rate: rates.length ? parseFloat(avg(rates).toFixed(1)) : 0,
      });
    }
    return points;
  }, [filteredRecords]);

  const tempTrend = useMemo(() => {
    const points = [];
    for (
      let i = 0;
      i < filteredRecords.length;
      i += Math.max(1, Math.floor(filteredRecords.length / 15))
    ) {
      const slice = filteredRecords.slice(i, i + 5);
      const temps = slice
        .map((r) => r?.temperature?.celsius || 0)
        .filter(Boolean);
      const d = parseTs(filteredRecords[i]?.timestamp);
      points.push({
        label: d ? `${d.getFullYear()}` : `P${Math.floor(i / 5) + 1}`,
        temp: temps.length ? parseFloat(avg(temps).toFixed(2)) : 0,
      });
    }
    return points;
  }, [filteredRecords]);

  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () =>
      Array(24)
        .fill(null)
        .map(() => ({ sum: 0, count: 0 })),
    );
    filteredRecords.forEach((r) => {
      const d = parseTs(r.timestamp);
      if (!d) return;
      const day = d.getDay();
      const hour = d.getHours();
      const mg = motionMag(r);
      grid[day][hour].sum += mg;
      grid[day][hour].count += 1;
    });
    let min = Infinity,
      max = -Infinity;
    const cells = [];
    grid.forEach((row, day) => {
      row.forEach((cell, hour) => {
        const val = cell.count ? cell.sum / cell.count : 0;
        cells.push({ day, hour, value: parseFloat(val.toFixed(2)) });
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });
    return {
      cells,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
    };
  }, [filteredRecords]);

  const sessions = useMemo(() => {
    const sessionList = [];
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    ids.forEach((id) => {
      const recs = allRecords[id] || [];
      if (!recs.length) return;
      let current = [recs[0]];
      for (let i = 1; i < recs.length; i++) {
        const prev = parseTs(recs[i - 1]?.timestamp);
        const curr = parseTs(recs[i]?.timestamp);
        const gap = prev && curr ? (curr - prev) / 60000 : 0;
        if (gap > 30) {
          sessionList.push({ id, records: current });
          current = [];
        }
        current.push(recs[i]);
      }
      if (current.length) sessionList.push({ id, records: current });
    });

    return sessionList
      .slice(-20)
      .reverse()
      .map((s, i) => {
        const hrs = s.records
          .map((r) => r?.heart_rate?.bpm_avg || 0)
          .filter(Boolean);
        const resps = s.records
          .map((r) => r?.respiration?.rate_avg || 0)
          .filter(Boolean);
        const temps = s.records
          .map((r) => r?.temperature?.celsius || 0)
          .filter(Boolean);
        const mgs = s.records.map((r) => motionMag(r));
        const steps = s.records.at(-1)?.motion?.step_count || 0;
        const meta = ATHLETE_META[s.id] || { name: s.id, sport: "Athlete" };
        const d = parseTs(s.records[0]?.timestamp);
        return {
          session: `Session ${sessionList.length - i}`,
          athlete: `${meta.name} - ${meta.sport}`,
          minHR: hrs.length ? Math.round(Math.min(...hrs)) : "--",
          maxHR: hrs.length ? Math.round(Math.max(...hrs)) : "--",
          avgSteps: Math.round(
            avg(s.records.map((r) => r?.motion?.step_count || 0)),
          ),
          avgResp: resps.length ? parseFloat(avg(resps).toFixed(0)) : "--",
          avgMotion: mgs.length ? parseFloat(avg(mgs).toFixed(1)) : "--",
          motionRate: mgs.length ? parseFloat(avg(mgs).toFixed(1)) : "--",
          intensity: mgs.length ? parseFloat((avg(mgs) * 10).toFixed(1)) : "--",
          date: d ? `${d.getDate()}/${d.getMonth() + 1}` : "--",
          _records: s.records,
        };
      });
  }, [allRecords, filterAthletes, athletes]);

  const [expandedRow, setExpandedRow] = useState(null);

  return (
    <main
      style={{
        flex: 1,
        overflow: "auto",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: t.text,
              letterSpacing: "0.02em",
            }}
          >
            Performance Analytics &amp; Trends
          </h1>
          <p style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
            {filteredRecords.length} records ·{" "}
            {filterAthletes.length || athletes.length} athlete(s) selected
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 99,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'DM Mono',monospace",
              background: wsConnected ? t.successBg : t.dangerBg,
              color: wsConnected ? t.success : t.danger,
              border: `1px solid ${wsConnected ? t.success + "30" : t.danger + "30"}`,
            }}
          >
            {wsConnected ? (
              <>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: t.success,
                    animation: "pulse 1.6s infinite",
                  }}
                />{" "}
                LIVE
              </>
            ) : (
              <>
                <WifiOff size={10} /> OFFLINE
              </>
            )}
          </span>
          {loading && (
            <span
              style={{
                fontSize: 10,
                color: t.muted,
                fontFamily: "'DM Mono',monospace",
              }}
            >
              Loading…
            </span>
          )}
        </div>
      </div>

      <div
        className="card-fadein"
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "1rem 1.25rem",
          boxShadow: t.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Filter size={13} color={t.muted} />
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              color: t.muted,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            Filters Panel
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Select
            label="Year (e.g., 2024)"
            options={[{ value: "all", label: "All Years" }, ...yearOptions]}
            value={filterYear}
            onChange={setFilterYear}
            multi={false}
            t={t}
          />
          <Select
            label="Month (e.g., All)"
            options={monthOptions}
            value={filterMonth}
            onChange={setFilterMonth}
            multi={false}
            t={t}
          />
          {isAdmin && <Select
            label="Athlete Multi-select"
            options={athletes.map((a) => ({
              value: a.id,
              label: `${ATHLETE_META[a.id]?.name || a.id}`,
            }))}
            value={filterAthletes}
            onChange={setFilterAthletes}
            multi={true}
            t={t}
          />}
          <button
            onClick={() => {
              setFilterYear(String(currentYear));
              setFilterMonth("all");
              setFilterAthletes(athletes.map((a) => a.id));
            }}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              cursor: "pointer",
              background: t.accent,
              border: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              boxShadow: `0 4px 12px ${t.accent}40`,
            }}
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilterYear("all");
              setFilterMonth("all");
              setFilterAthletes(athletes.map((a) => a.id));
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
              background: "transparent",
              border: `1px solid ${t.border}`,
              color: t.muted,
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <RefreshCw size={11} /> Reset
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Monthly Load Bar Chart" t={t}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={monthlyLoad}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Training Load",
                  angle: -90,
                  position: "insideLeft",
                  fill: t.faint,
                  fontSize: 8,
                  dx: -2,
                }}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Legend
                wrapperStyle={{
                  fontSize: 9,
                  fontFamily: "'DM Mono',monospace",
                }}
                iconType="circle"
                iconSize={7}
              />
              <Bar
                dataKey="Training Load"
                stackId="a"
                fill="#4f46e5"
                radius={[0, 0, 0, 0]}
              />
              <Bar dataKey="Steps (÷100)" stackId="a" fill="#f59e0b" />
              <Bar
                dataKey="Motion"
                stackId="a"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Seasonal HR Trend" t={t}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={seasonalHR}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="season"
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[80, 200]}
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <ReferenceLine
                y={175}
                stroke={`${t.danger}50`}
                strokeDasharray="4 3"
              />
              <Line
                type="monotone"
                dataKey="avgHR"
                name="Avg HR (bpm)"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ fill: "#ef4444", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Breathing Trend (Yearly)" t={t}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={breathingTrend}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 50]}
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Area
                type="monotone"
                dataKey="rate"
                name="Breathing Rate (br/min)"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#respGrad)"
                dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Temperature Trend (Yearly)" t={t}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={tempTrend}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[34, 41]}
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}°C`}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Area
                type="monotone"
                dataKey="temp"
                name="Skin Temp (°C)"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#tempGrad)"
                dot={{ fill: "#f59e0b", r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Intensity Heatmap (Motion Magnitude)" t={t}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 0, minWidth: 700 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-around",
                paddingTop: 20,
                paddingBottom: 4,
                paddingRight: 8,
                flexShrink: 0,
              }}
            >
              {DAYS.map((d) => (
                <span
                  key={d}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: t.muted,
                    fontFamily: "'DM Mono',monospace",
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", marginBottom: 2, paddingLeft: 0 }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 7,
                      color: t.faint,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {h % 3 === 0 ? `${String(h).padStart(2, "0")}:00` : ""}
                  </div>
                ))}
              </div>
              {DAYS.map((day, di) => (
                <div key={day} style={{ display: "flex", marginBottom: 2 }}>
                  {Array.from({ length: 24 }, (_, hi) => {
                    const cell = heatmapData.cells.find(
                      (c) => c.day === di && c.hour === hi,
                    );
                    const val = cell?.value || 0;
                    const bg =
                      val > 0
                        ? heatColor(val, heatmapData.min, heatmapData.max)
                        : t.surface2;
                    return (
                      <div
                        key={hi}
                        title={`${day} ${String(hi).padStart(2, "0")}:00 - ${val.toFixed(2)}g`}
                        style={{
                          flex: 1,
                          height: 22,
                          background: bg,
                          borderRadius: 2,
                          margin: "0 1px",
                          cursor: "default",
                          transition: "transform 0.1s",
                          border: `1px solid ${t.border}20`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingLeft: 12,
                paddingTop: 20,
                flexShrink: 0,
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  color: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {heatmapData.max.toFixed(1)}
              </span>
              <div
                style={{
                  width: 12,
                  height: 120,
                  borderRadius: 6,
                  background:
                    "linear-gradient(to bottom, #ef4444, #fbbf24, #93c5fd, #3b82f6)",
                }}
              />
              <span
                style={{
                  fontSize: 8,
                  color: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {heatmapData.min.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Session Comparison" t={t}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {[
                  "Session",
                  "Athlete",
                  "Min HR",
                  "Max HR",
                  "Avg Steps",
                  "Breathing Rate",
                  "Motion Magnitude",
                  "Motion Rate",
                  "Intensity",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: t.muted,
                      fontFamily: "'DM Mono',monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
                <th style={{ width: 80, padding: "8px 12px" }} />
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: t.muted,
                      fontSize: 12,
                    }}
                  >
                    No session data available
                  </td>
                </tr>
              ) : (
                sessions.map((s, i) => (
                  <React.Fragment key={s.session}>
                    <tr
                      onClick={() =>
                        setExpandedRow(expandedRow === i ? null : i)
                      }
                      style={{
                        borderBottom: `1px solid ${t.border}`,
                        background:
                          expandedRow === i
                            ? t.accentBg
                            : i % 2 === 0
                              ? t.surface + "60"
                              : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontWeight: 700,
                          color: t.accent,
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 11,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <ChevronRight
                            size={12}
                            color={t.muted}
                            style={{
                              transform:
                                expandedRow === i ? "rotate(90deg)" : "none",
                              transition: "transform 0.2s",
                            }}
                          />
                          {s.session}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: t.text,
                          fontWeight: 600,
                        }}
                      >
                        {s.athlete}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'DM Mono',monospace",
                          color: t.muted,
                        }}
                      >
                        {s.minHR} bpm
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'DM Mono',monospace",
                          color: t.danger,
                          fontWeight: 700,
                        }}
                      >
                        {s.maxHR} bpm
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'DM Mono',monospace",
                          color: t.muted,
                        }}
                      >
                        {s.avgSteps}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'DM Mono',monospace",
                          color: t.text,
                        }}
                      >
                        {s.avgResp} rpm
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'DM Mono',monospace",
                          color: t.accent,
                        }}
                      >
                        {s.avgMotion} g
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'DM Mono',monospace",
                          color: t.muted,
                        }}
                      >
                        {s.motionRate} g
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 800,
                            fontFamily: "'DM Mono',monospace",
                            background:
                              parseFloat(s.intensity) > 7
                                ? t.dangerBg
                                : parseFloat(s.intensity) > 4
                                  ? t.warningBg
                                  : t.successBg,
                            color:
                              parseFloat(s.intensity) > 7
                                ? t.danger
                                : parseFloat(s.intensity) > 4
                                  ? t.warning
                                  : t.success,
                          }}
                        >
                          {s.intensity}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 9,
                          color: t.faint,
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {s.date}
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr key={`${s.session}-exp`}>
                        <td
                          colSpan={10}
                          style={{
                            padding: "0 12px 12px 36px",
                            background: t.accentBg,
                          }}
                        >
                          <div style={{ paddingTop: 10 }}>
                            <p
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: t.muted,
                                fontFamily: "'DM Mono',monospace",
                                marginBottom: 8,
                              }}
                            >
                              Session detail - {s._records.length} readings
                            </p>
                            <ResponsiveContainer width="100%" height={80}>
                              <LineChart
                                data={s._records.map((r, ri) => ({
                                  i: ri,
                                  bpm: r?.heart_rate?.bpm_avg || null,
                                  temp: r?.temperature?.celsius || null,
                                }))}
                                margin={{
                                  top: 2,
                                  right: 8,
                                  bottom: 0,
                                  left: -20,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="2 2"
                                  stroke={t.chartGrid}
                                  vertical={false}
                                />
                                <XAxis dataKey="i" hide />
                                <YAxis
                                  yAxisId="hr"
                                  domain={[40, 220]}
                                  tick={{
                                    fontSize: 8,
                                    fill: t.faint,
                                    fontFamily: "'DM Mono',monospace",
                                  }}
                                  tickLine={false}
                                  axisLine={false}
                                  width={28}
                                />
                                <YAxis
                                  yAxisId="temp"
                                  orientation="right"
                                  domain={[34, 42]}
                                  tick={{
                                    fontSize: 8,
                                    fill: t.faint,
                                    fontFamily: "'DM Mono',monospace",
                                  }}
                                  tickLine={false}
                                  axisLine={false}
                                  width={28}
                                />
                                <Tooltip content={<ChartTip t={t} />} />
                                <Line
                                  yAxisId="hr"
                                  type="monotone"
                                  dataKey="bpm"
                                  name="HR"
                                  stroke="#ef4444"
                                  strokeWidth={1.5}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                                <Line
                                  yAxisId="temp"
                                  type="monotone"
                                  dataKey="temp"
                                  name="Temp"
                                  stroke="#f59e0b"
                                  strokeWidth={1.5}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
