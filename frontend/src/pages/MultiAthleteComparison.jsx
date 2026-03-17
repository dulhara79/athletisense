import React, { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  Filter,
  WifiOff,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

const API_BASE = "http://localhost:3001";
const WS_URL = "ws://localhost:3001";

const ATHLETE_META = {
  ATH_001: {
    name: "Marcus Thorne",
    sport: "Elite Runner",
    color: "#4f46e5",
    short: "A1",
    avatar: "MT",
  },
  ATH_002: {
    name: "Sarah Chen",
    sport: "Cyclist",
    color: "#f59e0b",
    short: "A2",
    avatar: "SC",
  },
  ATH_003: {
    name: "Diego Ramirez",
    sport: "Swimmer",
    color: "#10b981",
    short: "A3",
    avatar: "DR",
  },
  ATH_004: {
    name: "Aisha Patel",
    sport: "Sprinter",
    color: "#ef4444",
    short: "A4",
    avatar: "AP",
  },
};

function motionMag(r) {
  if (!r?.motion) return 0;
  const { accel_x: ax = 0, accel_y: ay = 0, accel_z: az = 0 } = r.motion;
  return parseFloat(
    (Math.sqrt(ax * ax + ay * ay + az * az) / 16384).toFixed(3),
  );
}
function parseTs(ts) {
  if (!ts) return null;
  const [d, tp] = ts.split(" ");
  if (!d) return null;
  const [dd, mm, yyyy] = d.split("/");
  return new Date(`${yyyy}-${mm}-${dd}T${tp || "00:00:00"}`);
}
function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function pearson(xs, ys) {
  if (xs.length < 2) return 0;
  const mx = avg(xs),
    my = avg(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
      ys.reduce((s, y) => s + (y - my) ** 2, 0),
  );
  return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
}
function normalize(val, min, max) {
  if (max === min) return 50;
  return parseFloat((((val - min) / (max - min)) * 100).toFixed(1));
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
        fontFamily: "'DM Mono',monospace",
        zIndex: 50,
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

function Card({ title, children, t, right, fullWidth }) {
  return (
    <div
      className="card-fadein"
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "1.125rem 1.25rem",
        boxShadow: t.shadow,
        ...(fullWidth ? { gridColumn: "1/-1" } : {}),
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
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {title}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Dropdown({ label, options, value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const display = options.find((o) => o.value === value)?.label || label;
  return (
    <div
      ref={ref}
      style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}
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
          fontFamily: "'Plus Jakarta Sans',sans-serif",
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
            overflow: "hidden",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "9px 14px",
                background: value === opt.value ? t.accentBg : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: value === opt.value ? 700 : 500,
                color: value === opt.value ? t.accent : t.text,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                transition: "background 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelect({ label, options, value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const display =
    value.length === 0
      ? label
      : value.length === options.length
        ? "All Athletes"
        : `${value.length} athletes`;
  return (
    <div
      ref={ref}
      style={{ position: "relative", flex: "1 1 220px", minWidth: 190 }}
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
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}
      >
        <span>{display}</span>
        <ChevronDown
          size={13}
          color={t.muted}
          style={{
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
            overflow: "hidden",
          }}
        >
          {options.map((opt) => {
            const sel = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() =>
                  onChange(
                    sel
                      ? value.filter((v) => v !== opt.value)
                      : [...value, opt.value],
                  )
                }
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
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  transition: "background 0.15s",
                }}
              >
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
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: opt.color || t.muted,
                    flexShrink: 0,
                  }}
                />
                <span>{opt.label}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    color: t.faint,
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function corrColor(r) {
  if (r >= 0) {
    const t = r;
    return `rgb(${Math.round(255)},${Math.round(255 * (1 - t))},${Math.round(255 * (1 - t))})`;
  } else {
    const t = -r;
    return `rgb(${Math.round(255 * (1 - t))},${Math.round(255 * (1 - t))},255)`;
  }
}

export default function MultiAthleteComparison({ t }) {
  const [athletes, setAthletes] = useState([]);
  const [allRecords, setAllRecords] = useState({});
  const [liveLatest, setLiveLatest] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const [filterAthletes, setFilterAthletes] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [compMode, setCompMode] = useState("head");

  const [sortKey, setSortKey] = useState("maxHR");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Role-based filtering
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const myAthleteId = user?.athleteId;

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
        const latMap = {};
        list?.forEach((a) => {
          if (a.latest) latMap[a.id] = a.latest;
        });
        setLiveLatest(latMap);

        const hists = await Promise.all(
          (list || []).map((a) =>
            fetch(`${API_BASE}/api/athletes/${a.id}/history?limit=200`)
              .then((r) => r.json())
              .then((d) => ({
                id: a.id,
                readings: (d.readings || []).reverse(),
              }))
              .catch(() => ({ id: a.id, readings: [] })),
          ),
        );
        const rec = {};
        hists.forEach((h) => {
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
              const ex = p[id] || [];
              return { ...p, [id]: [...ex, data].slice(-200) };
            });
          }
        } catch (e) {}
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  const cutoff = useMemo(() => {
    if (timeFilter === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(timeFilter));
    return d;
  }, [timeFilter]);

  const athleteStats = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    return ids
      .map((id) => {
        let recs = allRecords[id] || [];
        if (cutoff)
          recs = recs.filter((r) => {
            const d = parseTs(r.timestamp);
            return d && d >= cutoff;
          });
        if (!recs.length) return null;

        const hrs = recs
          .map((r) => r?.heart_rate?.bpm_avg || 0)
          .filter(Boolean);
        const resps = recs
          .map((r) => r?.respiration?.rate_avg || 0)
          .filter(Boolean);
        const temps = recs
          .map((r) => r?.temperature?.celsius || 0)
          .filter(Boolean);
        const mgs = recs.map((r) => motionMag(r));
        const steps = recs.map((r) => r?.motion?.step_count || 0);

        const maxHR = hrs.length ? Math.round(Math.max(...hrs)) : 0;
        const avgHR = hrs.length ? Math.round(avg(hrs)) : 0;
        const avgResp = resps.length ? parseFloat(avg(resps).toFixed(1)) : 0;
        const avgTemp = temps.length ? parseFloat(avg(temps).toFixed(1)) : 0;
        const avgMg = mgs.length ? parseFloat(avg(mgs).toFixed(2)) : 0;
        const maxSteps = steps.length ? Math.max(...steps) : 0;
        const load = Math.round(avgHR * 0.5 + avgMg * 50 + avgResp * 2);

        const cv = avgHR > 0 ? (stdDev(hrs) / avgHR) * 100 : 50;
        const consistency = Math.round(Math.max(0, Math.min(100, 100 - cv)));
        const avgPace =
          avgHR > 0 ? parseFloat((60 / (avgHR / 80)).toFixed(2)) : 0;

        const weeklyC = [];
        for (let i = 0; i < Math.min(recs.length, 80); i += 5) {
          const sl = recs
            .slice(i, i + 5)
            .map((r) => r?.heart_rate?.bpm_avg || 0)
            .filter(Boolean);
          const slCv =
            sl.length > 1 && avg(sl) > 0 ? (stdDev(sl) / avg(sl)) * 100 : 20;
          weeklyC.push(Math.round(Math.max(0, Math.min(100, 100 - slCv))));
        }

        const rawHR = hrs;
        const rawResp = recs
          .slice(0, hrs.length)
          .map((r) => r?.respiration?.rate_avg || 0);
        const rawMg = mgs.slice(0, hrs.length);
        const rawLoad = hrs.map(
          (h, i) => h * 0.5 + (mgs[i] || 0) * 50 + (rawResp[i] || 0) * 2,
        );

        return {
          id,
          maxHR,
          avgHR,
          avgResp,
          avgTemp,
          avgMg,
          maxSteps,
          load,
          consistency,
          avgPace,
          weeklyConsistency: weeklyC,
          raw: { hr: rawHR, resp: rawResp, mg: rawMg, load: rawLoad },
          recordCount: recs.length,
          name: ATHLETE_META[id]?.name || id,
          sport: ATHLETE_META[id]?.sport || "Athlete",
          color: ATHLETE_META[id]?.color || "#6366f1",
          short: ATHLETE_META[id]?.short || id,
        };
      })
      .filter(Boolean);
  }, [allRecords, filterAthletes, athletes, cutoff]);

  const radarDataPerAthlete = useMemo(() => {
    if (!athleteStats.length) return [];
    const keys = [
      "maxHR",
      "avgResp",
      "avgMg",
      "load",
      "consistency",
      "avgPace",
    ];
    const ranges = {};
    keys.forEach((k) => {
      const vals = athleteStats.map((a) => a[k] || 0);
      ranges[k] = { min: Math.min(...vals), max: Math.max(...vals) };
    });

    return athleteStats.map((a) => ({
      ...a,
      radarPoints: [
        {
          metric: "Max HR",
          value: normalize(a.maxHR, ranges.maxHR.min, ranges.maxHR.max),
        },
        {
          metric: "Avg Speed",
          value: normalize(a.avgResp, ranges.avgResp.min, ranges.avgResp.max),
        },
        {
          metric: "Motion",
          value: normalize(a.avgMg, ranges.avgMg.min, ranges.avgMg.max),
        },
        {
          metric: "Load",
          value: normalize(a.load, ranges.load.min, ranges.load.max),
        },
        {
          metric: "Consistency",
          value: normalize(
            a.consistency,
            ranges.consistency.min,
            ranges.consistency.max,
          ),
        },
        {
          metric: "Total Distance",
          value: normalize(
            a.maxSteps,
            0,
            Math.max(1, ...athleteStats.map((s) => s.maxSteps)),
          ),
        },
      ],
    }));
  }, [athleteStats]);

  const rankingData = useMemo(() => {
    const metrics = ["Max HR", "Avg Resp", "Avg Motion", "Load", "Consistency"];
    return metrics.map((metric) => {
      const row = { metric };
      athleteStats.forEach((a) => {
        const val =
          metric === "Max HR"
            ? a.maxHR
            : metric === "Avg Resp"
              ? a.avgResp
              : metric === "Avg Motion"
                ? parseFloat((a.avgMg * 100).toFixed(1))
                : metric === "Load"
                  ? a.load
                  : a.consistency;
        row[a.id] = val;
      });
      return row;
    });
  }, [athleteStats]);

  const corrMatrix = useMemo(() => {
    if (!athleteStats.length) return { labels: [], matrix: [] };
    const merged = {
      HR: athleteStats.flatMap((a) => a.raw.hr),
      Resp: athleteStats.flatMap((a) => a.raw.resp),
      Motion: athleteStats.flatMap((a) => a.raw.mg),
      Load: athleteStats.flatMap((a) => a.raw.load),
    };
    const labels = Object.keys(merged);
    const n = Math.min(...Object.values(merged).map((v) => v.length));
    const trimmed = {};
    labels.forEach((k) => {
      trimmed[k] = merged[k].slice(0, n);
    });
    const matrix = labels.map((r) =>
      labels.map((c) => pearson(trimmed[r], trimmed[c])),
    );
    return { labels, matrix };
  }, [athleteStats]);

  const consistencyTrend = useMemo(() => {
    if (!athleteStats.length) return [];
    const maxLen = Math.max(
      ...athleteStats.map((a) => a.weeklyConsistency.length),
    );
    return Array.from({ length: maxLen }, (_, i) => {
      const row = { week: i + 1 };
      athleteStats.forEach((a) => {
        row[a.id] = a.weeklyConsistency[i] ?? null;
      });
      return row;
    });
  }, [athleteStats]);

  const tableRows = useMemo(() => {
    const rows = athleteStats.map((a) => ({
      id: a.id,
      athlete: a.short,
      name: a.name,
      sport: a.sport,
      color: a.color,
      maxHR: a.maxHR,
      avgPace: a.avgPace,
      totalDist: a.maxSteps,
      load: a.load,
      avgResp: a.avgResp,
      motionRate: parseFloat((a.avgMg * 100).toFixed(1)),
      consistency: a.consistency,
      records: a.recordCount,
    }));
    return [...rows].sort((a, b) => {
      const av = a[sortKey] || 0,
        bv = b[sortKey] || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [athleteStats, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const ids = filterAthletes.length
    ? filterAthletes
    : athletes.map((a) => a.id);

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
            Multi-Athlete Comparison
          </h1>
          <p style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
            {ids.length} athlete(s) ·{" "}
            {athleteStats.reduce((s, a) => s + a.recordCount, 0)} records
          </p>
        </div>
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
          <MultiSelect
            label="Athlete Multi-Select"
            options={athletes.map((a) => ({
              value: a.id,
              label: `${ATHLETE_META[a.id]?.name || a.id}`,
              color: ATHLETE_META[a.id]?.color,
              sub: `${ATHLETE_META[a.id]?.short || a.id}`,
            }))}
            value={filterAthletes}
            onChange={setFilterAthletes}
            t={t}
          />
          <Dropdown
            label="Time Filter"
            options={[
              { value: "all", label: "All Time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last Month" },
              { value: "90", label: "Last 3 Months" },
              { value: "365", label: "Last Year" },
            ]}
            value={timeFilter}
            onChange={setTimeFilter}
            t={t}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 10,
              background: t.surface,
              border: `1px solid ${t.border}`,
            }}
          >
            <input
              type="checkbox"
              id="cmpMode"
              checked={compMode === "aggregate"}
              onChange={(e) =>
                setCompMode(e.target.checked ? "aggregate" : "head")
              }
              style={{ cursor: "pointer" }}
            />
            <label
              htmlFor="cmpMode"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: t.text,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                lineHeight: 1.3,
              }}
            >
              Comparison Mode Toggle
              <br />
              <span style={{ fontSize: 10, color: t.muted, fontWeight: 500 }}>
                {compMode === "head" ? "Head-to-Head" : "Aggregate"}
              </span>
            </label>
          </div>
          <button
            onClick={() => {
              setFilterAthletes(athletes.map((a) => a.id));
              setTimeFilter("all");
              setCompMode("head");
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
              setFilterAthletes(athletes.map((a) => a.id));
              setTimeFilter("all");
              setCompMode("head");
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
        <Card
          title="Athlete Performance Radar Chart"
          t={t}
          right={
            <div style={{ display: "flex", gap: 8 }}>
              {ids.map((id) => {
                const meta = ATHLETE_META[id];
                return (
                  <span
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 9,
                      color: t.muted,
                      fontFamily: "'DM Mono',monospace",
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: meta?.color || t.accent,
                      }}
                    />
                    {meta?.short || id}
                  </span>
                );
              })}
            </div>
          }
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {radarDataPerAthlete.map((a) => (
              <div
                key={a.id}
                style={{ flex: "1 1 120px", maxWidth: 160, minWidth: 110 }}
              >
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textAlign: "center",
                    color: a.color,
                    fontFamily: "'DM Mono',monospace",
                    marginBottom: 2,
                  }}
                >
                  {a.short}
                </p>
                <ResponsiveContainer width="100%" height={130}>
                  <RadarChart
                    data={a.radarPoints}
                    cx="50%"
                    cy="50%"
                    outerRadius="65%"
                    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <PolarGrid stroke={t.chartGrid} gridType="polygon" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{
                        fontSize: 7,
                        fill: t.muted,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    />
                    <Radar
                      dataKey="value"
                      name={a.short}
                      stroke={a.color}
                      fill={a.color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ))}
            {radarDataPerAthlete.length >= 2 && (
              <div style={{ flex: "1 1 120px", maxWidth: 160, minWidth: 110 }}>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textAlign: "center",
                    color: t.muted,
                    fontFamily: "'DM Mono',monospace",
                    marginBottom: 2,
                  }}
                >
                  Combined
                </p>
                <ResponsiveContainer width="100%" height={130}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="65%"
                    data={radarDataPerAthlete[0].radarPoints}
                    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <PolarGrid stroke={t.chartGrid} gridType="polygon" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{
                        fontSize: 7,
                        fill: t.muted,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    />
                    {radarDataPerAthlete.map((a) => (
                      <Radar
                        key={a.id}
                        dataKey="value"
                        name={a.short}
                        stroke={a.color}
                        fill={a.color}
                        fillOpacity={0.15}
                        strokeWidth={1.5}
                        data={a.radarPoints}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Ranking Bar Chart"
          t={t}
          right={
            <div style={{ display: "flex", gap: 8 }}>
              {ids.map((id) => (
                <span
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 9,
                    color: t.muted,
                    fontFamily: "'DM Mono',monospace",
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: ATHLETE_META[id]?.color || t.accent,
                    }}
                  />
                  {ATHLETE_META[id]?.short || id}
                </span>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={rankingData}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="metric"
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
                  value: "Total Load/Distance",
                  angle: -90,
                  position: "insideLeft",
                  fill: t.faint,
                  fontSize: 8,
                  dx: -4,
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
              {ids.map((id) => (
                <Bar
                  key={id}
                  dataKey={id}
                  name={ATHLETE_META[id]?.short || id}
                  fill={ATHLETE_META[id]?.color || t.accent}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Correlation Matrix Heatmap" t={t}>
          {corrMatrix.labels.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: t.muted,
                fontSize: 12,
              }}
            >
              Insufficient data for correlation
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "6px 8px",
                        fontSize: 9,
                        color: t.faint,
                        fontFamily: "'DM Mono',monospace",
                        fontWeight: 700,
                      }}
                    />
                    {corrMatrix.labels.map((l) => (
                      <th
                        key={l}
                        style={{
                          padding: "6px 8px",
                          fontSize: 9,
                          color: t.muted,
                          fontFamily: "'DM Mono',monospace",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrMatrix.labels.map((rowL, ri) => (
                    <tr key={rowL}>
                      <td
                        style={{
                          padding: "4px 8px",
                          fontSize: 9,
                          color: t.muted,
                          fontFamily: "'DM Mono',monospace",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rowL}
                      </td>
                      {corrMatrix.matrix[ri].map((val, ci) => (
                        <td
                          key={ci}
                          title={`${rowL} vs ${corrMatrix.labels[ci]}: ${val}`}
                          style={{ padding: "0", textAlign: "center" }}
                        >
                          <div
                            style={{
                              width: 56,
                              height: 32,
                              background: corrColor(val),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                              color:
                                val === 1
                                  ? "#fff"
                                  : Math.abs(val) > 0.6
                                    ? "#fff"
                                    : t.text,
                              fontFamily: "'DM Mono',monospace",
                              margin: "1px",
                              borderRadius: 4,
                              transition: "transform 0.15s",
                              cursor: "default",
                            }}
                          >
                            {val.toFixed(2)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: t.faint,
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  -1
                </span>
                <div
                  style={{
                    width: 80,
                    height: 8,
                    borderRadius: 4,
                    background:
                      "linear-gradient(to right,#4444ff,#ffffff,#ff4444)",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: t.faint,
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  +1
                </span>
              </div>
            </div>
          )}
        </Card>

        <Card
          title="Consistency Trend (Weekly)"
          t={t}
          right={
            <div style={{ display: "flex", gap: 8 }}>
              {ids.map((id) => (
                <span
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 9,
                    color: t.muted,
                    fontFamily: "'DM Mono',monospace",
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: ATHLETE_META[id]?.color || t.accent,
                    }}
                  />
                  {ATHLETE_META[id]?.short || id}
                </span>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={210}>
            <LineChart
              data={consistencyTrend}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Consistency",
                  angle: -90,
                  position: "insideLeft",
                  fill: t.faint,
                  fontSize: 8,
                  dx: -4,
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
              {ids.map((id) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={ATHLETE_META[id]?.short || id}
                  stroke={ATHLETE_META[id]?.color || t.accent}
                  strokeWidth={2}
                  dot={{
                    fill: ATHLETE_META[id]?.color || t.accent,
                    r: 3,
                    strokeWidth: 0,
                  }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Detailed Comparison Table" t={t} fullWidth>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              minWidth: 900,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {[
                  { key: "name", label: "Athlete" },
                  { key: "athlete", label: "ID" },
                  { key: "maxHR", label: "Max HR" },
                  { key: "avgPace", label: "Avg Pace" },
                  { key: "totalDist", label: "Total Steps" },
                  { key: "load", label: "Load" },
                  { key: "avgResp", label: "Avg Resp" },
                  { key: "motionRate", label: "Motion Rate" },
                  { key: "consistency", label: "Consistency" },
                ].map((col) => (
                  <th
                    key={col.key}
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
                      background:
                        sortKey === col.key ? t.accentBg : "transparent",
                    }}
                  >
                    <button
                      onClick={() => toggleSort(col.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: sortKey === col.key ? t.accent : t.muted,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontFamily: "'DM Mono',monospace",
                        padding: "2px 4px",
                        borderRadius: 4,
                      }}
                    >
                      {col.label}{" "}
                      <ArrowUpDown
                        size={9}
                        color={sortKey === col.key ? t.accent : t.faint}
                      />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: t.muted,
                      fontSize: 12,
                    }}
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                tableRows.map((row, i) => {
                  const expanded = expandedRows.has(row.id);
                  const statRow = athleteStats.find((a) => a.id === row.id);
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() =>
                          setExpandedRows((prev) => {
                            const next = new Set(prev);
                            expanded ? next.delete(row.id) : next.add(row.id);
                            return next;
                          })
                        }
                        style={{
                          borderBottom: `1px solid ${t.border}`,
                          cursor: "pointer",
                          background: expanded
                            ? t.accentBg
                            : i % 2 === 0
                              ? t.surface + "50"
                              : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <ChevronRight
                              size={12}
                              color={t.muted}
                              style={{
                                transform: expanded ? "rotate(90deg)" : "none",
                                transition: "transform 0.2s",
                              }}
                            />
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 7,
                                background: `${row.color}20`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 800,
                                color: row.color,
                                fontFamily: "'DM Mono',monospace",
                              }}
                            >
                              {row.athlete}
                            </div>
                            <div>
                              <p
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: t.text,
                                }}
                              >
                                {row.name}
                              </p>
                              <p style={{ fontSize: 9, color: t.faint }}>
                                {row.sport}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "'DM Mono',monospace",
                            fontWeight: 700,
                            color: row.color,
                          }}
                        >
                          {row.athlete}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "'DM Mono',monospace",
                            color: t.danger,
                            fontWeight: 700,
                          }}
                        >
                          {row.maxHR} bpm
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "'DM Mono',monospace",
                            color: t.muted,
                          }}
                        >
                          {row.avgPace.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "'DM Mono',monospace",
                            color: t.text,
                          }}
                        >
                          {row.totalDist.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "'DM Mono',monospace",
                            color: t.accent,
                            fontWeight: 700,
                          }}
                        >
                          {row.load}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "'DM Mono',monospace",
                            color: t.text,
                          }}
                        >
                          {row.avgResp} rpm
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "'DM Mono',monospace",
                            color: t.muted,
                          }}
                        >
                          {row.motionRate} g×100
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: 5,
                                borderRadius: 99,
                                background: t.surface2,
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: 99,
                                  width: `${row.consistency}%`,
                                  background:
                                    row.consistency > 70
                                      ? t.success
                                      : row.consistency > 40
                                        ? t.warning
                                        : t.danger,
                                  transition: "width 0.4s",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                fontFamily: "'DM Mono',monospace",
                                color:
                                  row.consistency > 70
                                    ? t.success
                                    : row.consistency > 40
                                      ? t.warning
                                      : t.danger,
                                minWidth: 28,
                              }}
                            >
                              {row.consistency}%
                            </span>
                          </div>
                        </td>
                      </tr>
                      {expanded && statRow && (
                        <tr key={`${row.id}-exp`}>
                          <td
                            colSpan={9}
                            style={{
                              padding: "0 12px 14px 52px",
                              background: t.accentBg,
                              borderBottom: `1px solid ${t.border}`,
                            }}
                          >
                            <div
                              style={{
                                paddingTop: 10,
                                display: "flex",
                                gap: 16,
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ flex: "2 1 280px" }}>
                                <p
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: t.muted,
                                    fontFamily: "'DM Mono',monospace",
                                    marginBottom: 6,
                                  }}
                                >
                                  HR trend - last{" "}
                                  {Math.min(statRow.raw.hr.length, 30)} readings
                                </p>
                                <ResponsiveContainer width="100%" height={70}>
                                  <LineChart
                                    data={statRow.raw.hr
                                      .slice(-30)
                                      .map((h, i) => ({
                                        i,
                                        hr: h,
                                        resp: statRow.raw.resp[i],
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
                                        fontSize: 7,
                                        fill: t.faint,
                                        fontFamily: "'DM Mono',monospace",
                                      }}
                                      tickLine={false}
                                      axisLine={false}
                                      width={26}
                                    />
                                    <Tooltip content={<ChartTip t={t} />} />
                                    <Line
                                      yAxisId="hr"
                                      type="monotone"
                                      dataKey="hr"
                                      name="HR"
                                      stroke={row.color}
                                      strokeWidth={2}
                                      dot={false}
                                      isAnimationActive={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                              <div
                                style={{
                                  flex: "1 1 200px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 6,
                                  justifyContent: "center",
                                }}
                              >
                                {[
                                  ["Records", row.records, ""],
                                  ["Avg HR", statRow.avgHR, " bpm"],
                                  ["Avg Temp", statRow.avgTemp, "°C"],
                                  ["Avg Motion", statRow.avgMg, "g"],
                                ].map(([label, val, unit]) => (
                                  <div
                                    key={label}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      padding: "4px 10px",
                                      borderRadius: 7,
                                      background: t.surface,
                                      border: `1px solid ${t.border}`,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: t.muted,
                                        fontFamily: "'DM Mono',monospace",
                                      }}
                                    >
                                      {label}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: row.color,
                                        fontFamily: "'DM Mono',monospace",
                                      }}
                                    >
                                      {typeof val === "number"
                                        ? Number.isInteger(val)
                                          ? val
                                          : val.toFixed(2)
                                        : val}
                                      {unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
