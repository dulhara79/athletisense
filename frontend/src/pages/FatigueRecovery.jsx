import React, { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  Filter,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Zap,
} from "lucide-react";

const API_BASE = "http://localhost:3001";
const WS_URL = "ws://localhost:3001";

const ATHLETE_META = {
  ATH_001: {
    name: "Marcus Thorne",
    sport: "Elite Runner",
    color: "#ef4444",
    avatar: "MT",
  },
  ATH_002: {
    name: "Sarah Chen",
    sport: "Cyclist",
    color: "#3b82f6",
    avatar: "SC",
  },
  ATH_003: {
    name: "Diego Ramirez",
    sport: "Swimmer",
    color: "#10b981",
    avatar: "DR",
  },
  ATH_004: {
    name: "Aisha Patel",
    sport: "Sprinter",
    color: "#f59e0b",
    avatar: "AP",
  },
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

// ─── Helpers ──────────────────────────────────────────────────
function motionMag(r) {
  if (!r?.motion) return 0;
  const { accel_x: ax = 0, accel_y: ay = 0, accel_z: az = 0 } = r.motion;
  return parseFloat(
    (Math.sqrt(ax * ax + ay * ay + az * az) / 16384).toFixed(3),
  );
}

/**
 * FIX 1 — parseTs
 * ─────────────────────────────────────────────────────────────
 * The original assumed "DD/MM/YYYY HH:MM:SS" format exactly, but
 * Firebase records coming back from the backend sometimes arrive as
 * ISO strings (from Date.toISOString) or with missing time portions.
 * An unparseable string silently produced an Invalid Date whose
 * .getMonth() returns NaN — which when used as an array index gives
 * undefined, causing "Cannot set properties of undefined".
 *
 * Fix: handle both slash-delimited and ISO formats, and return null
 * for anything that doesn't produce a valid Date.
 */
function parseTs(ts) {
  if (!ts || typeof ts !== "string") return null;
  let d;
  if (ts.includes("/")) {
    const [datePart, timePart] = ts.split(" ");
    if (!datePart) return null;
    const parts = datePart.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    d = new Date(
      `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${timePart || "00:00:00"}`,
    );
  } else {
    d = new Date(ts); // ISO 8601 and anything the browser can natively parse
  }
  // isNaN guard — rejects Invalid Date before it reaches any index operation
  return isNaN(d.getTime()) ? null : d;
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function rollingAvg(arr, window = 7) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1);
    return parseFloat(avg(slice).toFixed(1));
  });
}

// ─── Shared UI ────────────────────────────────────────────────
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

function Card({ title, children, t, right }) {
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
        : `${value.length} selected`;

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
            maxHeight: 220,
            overflowY: "auto",
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
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateRangeSelect({ value, onChange, t }) {
  const opts = [
    { value: "all", label: "All Time" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "365d", label: "Last year" },
  ];
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const display = opts.find((o) => o.value === value)?.label || "Date Range";

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
          {opts.map((opt) => (
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

function RecoveryGauge({ score, t }) {
  const clamp = Math.max(0, Math.min(100, score));
  const color = clamp > 70 ? "#10b981" : clamp > 40 ? "#f59e0b" : "#ef4444";
  const label = clamp > 70 ? "GOOD" : clamp > 40 ? "MODERATE" : "NEEDS REST";
  const cx = 90,
    cy = 90,
    r = 62;

  function pt(deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arc(start, end) {
    if (Math.abs(end - start) < 0.01) return "";
    const s = pt(start),
      e = pt(end);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${Math.abs(end - start) > 180 ? 1 : 0} ${end > start ? 1 : 0} ${e.x} ${e.y}`;
  }

  const START = -60,
    END = 240;
  const filledEnd = START + (clamp / 100) * (END - START);
  const needleDeg = START + (clamp / 100) * (END - START);
  const zones = [
    { pct: 0.4, c: "#ef4444" },
    { pct: 0.7, c: "#f59e0b" },
    { pct: 1.0, c: "#10b981" },
  ];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <svg viewBox="0 0 180 140" style={{ width: "100%", maxWidth: 220 }}>
        {(() => {
          let prev = START;
          return zones.map((z) => {
            const end = START + z.pct * (END - START);
            const el = (
              <path
                key={z.c}
                d={arc(prev, end)}
                fill="none"
                stroke={z.c}
                strokeWidth={14}
                strokeLinecap="butt"
                opacity={0.25}
              />
            );
            prev = end;
            return el;
          });
        })()}
        <path
          d={arc(START, END)}
          fill="none"
          stroke={t.surface2}
          strokeWidth={14}
          strokeLinecap="round"
          opacity={0.4}
        />
        {clamp > 0 && (
          <path
            d={arc(START, filledEnd)}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            style={{ transition: "stroke 0.4s" }}
          />
        )}
        <text
          x={22}
          y={118}
          fill="#ef4444"
          fontSize="8"
          fontWeight="800"
          fontFamily="'DM Mono',monospace"
          textAnchor="middle"
        >
          0
        </text>
        <text
          x={158}
          y={118}
          fill="#10b981"
          fontSize="8"
          fontWeight="800"
          fontFamily="'DM Mono',monospace"
          textAnchor="middle"
        >
          100
        </text>
        <g
          style={{
            transform: `rotate(${needleDeg - 90}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 0.8s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 8}
            stroke={t.muted}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
        <circle
          cx={cx}
          cy={cy}
          r={7}
          fill={t.card}
          stroke={t.border}
          strokeWidth={2}
        />
        <circle cx={cx} cy={cy} r={3} fill={color} />
        <text
          x={cx}
          y={cy + 28}
          fill={color}
          fontSize="30"
          fontWeight="800"
          fontFamily="'DM Mono',monospace"
          textAnchor="middle"
          letterSpacing="-1"
        >
          {clamp.toFixed(0)}
        </text>
        <text
          x={cx}
          y={cy + 44}
          fill={t.muted}
          fontSize="8"
          fontWeight="700"
          fontFamily="'DM Mono',monospace"
          textAnchor="middle"
          letterSpacing="0.1em"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function FatigueRecovery({ t }) {
  const [athletes, setAthletes] = useState([]);
  const [allRecords, setAllRecords] = useState({});
  const [liveLatest, setLiveLatest] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const [filterAthletes, setFilterAthletes] = useState([]);
  const [dateRange, setDateRange] = useState("all");

  // Role-based filtering
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const myAthleteId = user?.athleteId;

  // Fetch athletes + histories
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

  /**
   * FIX 2 — WebSocket StrictMode double-invoke crash
   * ─────────────────────────────────────────────────
   * React 18 StrictMode mounts → unmounts → re-mounts every component
   * in development.  The original code called wsRef.current?.close()
   * in the cleanup, but then the setTimeout inside onclose fired and
   * called connect() again on the already-destroyed instance, producing
   * "WebSocket is closed before the connection is established".
   *
   * Fix: use a `destroyed` boolean captured by the closure.  Every
   * async callback checks it before touching state or re-connecting.
   */
  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!destroyed) setWsConnected(true);
      };
      ws.onclose = () => {
        if (!destroyed) {
          setWsConnected(false);
          setTimeout(connect, 3000);
        }
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (evt) => {
        if (destroyed) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "live_update" && msg.athlete_id && msg.data) {
            const { athlete_id: id, data } = msg;
            setLiveLatest((p) => ({ ...p, [id]: data }));
            setAllRecords((p) => ({
              ...p,
              [id]: [...(p[id] || []), data].slice(-200),
            }));
          }
        } catch (_) {}
      };
    }

    connect();
    return () => {
      destroyed = true;
      wsRef.current?.close();
    };
  }, []);

  const cutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const days = parseInt(dateRange);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [dateRange]);

  const filteredRecords = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    return ids.flatMap((id) =>
      (allRecords[id] || [])
        .filter((r) => {
          if (!cutoff) return true;
          const d = parseTs(r.timestamp);
          return d && d >= cutoff;
        })
        .map((r) => ({ ...r, _id: id })),
    );
  }, [allRecords, filterAthletes, athletes, cutoff]);

  // Recovery curve
  const recoveryCurveData = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    const BUCKETS = 8;
    const labels = [
      "start",
      "1 hr",
      "2 hr",
      "3 hr",
      "4 hr",
      "5 hr",
      "6 hr",
      "7 hr",
    ];
    return labels.map((label, b) => {
      const bucket = { label };
      ids.forEach((id) => {
        const recs = (allRecords[id] || []).slice(-BUCKETS * 4);
        if (!recs.length) {
          bucket[id] = null;
          return;
        }
        const s = Math.floor((recs.length * b) / BUCKETS);
        const e = Math.floor((recs.length * (b + 1)) / BUCKETS);
        const hrVals = recs
          .slice(s, e)
          .map((r) => r?.heart_rate?.bpm_avg || 0)
          .filter(Boolean);
        bucket[id] = hrVals.length ? Math.round(avg(hrVals)) : null;
      });
      return bucket;
    });
  }, [allRecords, filterAthletes, athletes]);

  // Recovery score
  const recoveryScore = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    if (!ids.length) return 0;
    const scores = ids.map((id) => {
      const lat = liveLatest[id];
      if (!lat) return 50;
      const hr = lat?.heart_rate?.bpm_avg || 70;
      const temp = lat?.temperature?.celsius || 36;
      const mg = motionMag(lat);
      return (
        Math.max(0, 100 - (hr - 60) * 0.7) * 0.5 +
        Math.max(0, 100 - Math.abs(temp - 33) * 12) * 0.3 +
        Math.max(0, 100 - mg * 8) * 0.2
      );
    });
    return Math.round(avg(scores));
  }, [liveLatest, filterAthletes, athletes]);

  // Scatter
  const scatterData = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    return ids.map((id) => ({
      id,
      color: ATHLETE_META[id]?.color || "#6366f1",
      name: ATHLETE_META[id]?.name || id,
      points: (allRecords[id] || [])
        .slice(-60)
        .map((r) => ({
          hr: r?.heart_rate?.bpm_avg || null,
          resp: r?.respiration?.rate_avg || null,
        }))
        .filter((p) => p.hr && p.resp),
    }));
  }, [allRecords, filterAthletes, athletes]);

  /**
   * FIX 3 — loadAccumulation "Cannot set properties of undefined"
   * ─────────────────────────────────────────────────────────────
   * Three issues in the original:
   *
   * a) parseTs returned Invalid Date for some records → .getMonth()
   *    returned NaN → buckets[NaN] is undefined → property write crashed.
   *    Fixed in parseTs (FIX 1 above); also added an explicit range
   *    guard here as a second safety net.
   *
   * b) The denominator used a nested filteredRecords.filter() inside
   *    the outer forEach — O(n²) and it re-scanned filteredRecords for
   *    every single record.  Replaced with a per-(athlete,month) counter
   *    array that is O(n) total.
   *
   * c) Removed the stray console.log that was printing every record.
   */
  const loadAccumulation = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);

    // 12 plain objects, one per month — always exactly 12 entries
    const buckets = MONTHS.map((m) => ({ month: m }));
    const cumul = {}; // cumulative load per athlete
    const counts = {}; // record count per athlete per month

    ids.forEach((id) => {
      cumul[id] = 0;
      counts[id] = new Array(12).fill(0);
    });

    filteredRecords.forEach((r) => {
      const d = parseTs(r.timestamp);
      if (!d) return; // invalid timestamp → skip

      const mi = d.getMonth();
      if (mi < 0 || mi > 11) return; // out-of-range month → skip

      const id = r._id;
      if (!ids.includes(id)) return;

      const load = (r?.heart_rate?.bpm_avg || 0) + motionMag(r) * 20;
      cumul[id] += load;
      counts[id][mi] += 1;

      // buckets[mi] is guaranteed to exist — MONTHS always has 12 entries
      buckets[mi][id] = Math.round(cumul[id] / counts[id][mi]);
    });

    return buckets;
  }, [filteredRecords, filterAthletes, athletes]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    const merged = filteredRecords
      .filter((r) => r?.heart_rate?.bpm_avg)
      .slice(-60)
      .map((r, i) => {
        const d = parseTs(r.timestamp);
        return {
          label: d
            ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : `${i}`,
          load: Math.round((r?.heart_rate?.bpm_avg || 0) + motionMag(r) * 10),
          resp: r?.respiration?.rate_avg || null,
        };
      });
    const rolling = rollingAvg(
      merged.map((m) => m.load),
      7,
    );
    return merged.map((m, i) => ({ ...m, rolling: rolling[i] }));
  }, [filteredRecords]);

  // Fatigue risk
  const fatigueRisk = useMemo(() => {
    const ids = filterAthletes.length
      ? filterAthletes
      : athletes.map((a) => a.id);
    return ids.map((id) => {
      const lat = liveLatest[id];
      if (!lat)
        return {
          id,
          level: "low",
          score: 0,
          hr: 0,
          temp: "0.0",
          mg: "0.00",
          name: ATHLETE_META[id]?.name || id,
        };

      const hr = lat?.heart_rate?.bpm_avg || 70;
      const temp = lat?.temperature?.celsius || 36;
      const mg = motionMag(lat);
      const recs = allRecords[id] || [];
      const recentHrs = recs
        .slice(-10)
        .map((r) => r?.heart_rate?.bpm_avg || 0)
        .filter(Boolean);
      const hrTrend =
        recentHrs.length > 1 ? recentHrs.at(-1) - recentHrs[0] : 0;

      let score = 0;
      if (hr > 160) score += 30;
      else if (hr > 140) score += 15;
      if (temp > 38) score += 25;
      else if (temp > 37.5) score += 12;
      if (mg > 10) score += 20;
      else if (mg > 7) score += 10;
      if (hrTrend > 15) score += 25;

      return {
        id,
        score,
        level: score > 50 ? "high" : score > 25 ? "moderate" : "low",
        hr,
        temp: temp.toFixed(1),
        mg: mg.toFixed(2),
        name: ATHLETE_META[id]?.name || id,
      };
    });
  }, [liveLatest, allRecords, filterAthletes, athletes]);

  const worstRisk = useMemo(
    () =>
      fatigueRisk.length
        ? fatigueRisk.reduce((a, b) => (a.score > b.score ? a : b))
        : null,
    [fatigueRisk],
  );

  const ids = filterAthletes.length
    ? filterAthletes
    : athletes.map((a) => a.id);

  // ─── Render ──────────────────────────────────────────────────
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
      {/* Header */}
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
            Fatigue &amp; Recovery Analysis
          </h1>
          <p style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
            {filteredRecords.length} records · {ids.length} athlete(s)
            {loading && " · loading…"}
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

      {/* Filters */}
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
          {isAdmin && <MultiSelect
            label="Athlete Multi-select"
            options={athletes.map((a) => ({
              value: a.id,
              label: ATHLETE_META[a.id]?.name || a.id,
              color: ATHLETE_META[a.id]?.color,
            }))}
            value={filterAthletes}
            onChange={setFilterAthletes}
            t={t}
          />}
          <DateRangeSelect value={dateRange} onChange={setDateRange} t={t} />
          <button
            onClick={() => {
              setFilterAthletes(athletes.map((a) => a.id));
              setDateRange("all");
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
              setDateRange("all");
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

      {/* Recovery Curve + Gauge */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14 }}
      >
        <Card
          title="Recovery Curve (HR)"
          t={t}
          right={
            <span
              style={{
                fontSize: 9,
                color: t.faint,
                fontFamily: "'DM Mono',monospace",
              }}
            >
              BPM over session progression
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={recoveryCurveData}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[60, 180]}
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
              {ids.map((id, idx) => {
                const color = ATHLETE_META[id]?.color || "#6366f1";
                return (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={ATHLETE_META[id]?.name || id}
                    stroke={color}
                    strokeWidth={idx === 0 ? 2.5 : 1.5}
                    dot={{ fill: color, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    strokeDasharray={idx === 0 ? undefined : "4 3"}
                    connectNulls
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div
          className="card-fadein"
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: "1.125rem 1.25rem",
            boxShadow: t.shadow,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: 200,
            justifyContent: "space-between",
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
              alignSelf: "flex-start",
            }}
          >
            Recovery Score
          </p>
          <RecoveryGauge score={recoveryScore} t={t} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[
              ["#10b981", "Good"],
              ["#f59e0b", "Mod."],
              ["#ef4444", "Low"],
            ].map(([c, l]) => (
              <span
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  color: t.muted,
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: c,
                  }}
                />
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scatter + Load Accumulation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="HR vs Breathing (Scatter)" t={t}>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
              <XAxis
                type="number"
                dataKey="hr"
                name="HR"
                domain={[40, 220]}
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "HR (bpm)",
                  position: "insideBottom",
                  offset: -2,
                  fill: t.faint,
                  fontSize: 8,
                }}
              />
              <YAxis
                type="number"
                dataKey="resp"
                name="Resp"
                domain={[0, 50]}
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis range={[20, 20]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: t.muted }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
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
                      }}
                    >
                      <p style={{ color: t.muted, marginBottom: 3 }}>
                        HR:{" "}
                        <b style={{ color: t.text }}>{d?.hr?.toFixed(0)} bpm</b>
                      </p>
                      <p style={{ color: t.muted }}>
                        Resp:{" "}
                        <b style={{ color: t.text }}>
                          {d?.resp?.toFixed(1)} br/min
                        </b>
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 9,
                  fontFamily: "'DM Mono',monospace",
                }}
                iconType="circle"
                iconSize={8}
              />
              {scatterData.map((s) => (
                <Scatter
                  key={s.id}
                  name={s.name}
                  data={s.points}
                  fill={s.color}
                  opacity={0.7}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Load Accumulation" t={t}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={loadAccumulation}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <defs>
                {ids.map((id) => {
                  const color = ATHLETE_META[id]?.color || "#6366f1";
                  return (
                    <linearGradient
                      key={id}
                      id={`laGrad${id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  );
                })}
              </defs>
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
              {ids.map((id) => {
                const color = ATHLETE_META[id]?.color || "#6366f1";
                return (
                  <Area
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={ATHLETE_META[id]?.name || id}
                    stackId="load"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#laGrad${id})`}
                    isAnimationActive={false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Weekly Load Trend */}
      <Card title="Weekly Load Trend (Rolling Average)" t={t}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart
            data={weeklyTrend}
            margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
          >
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
              interval={Math.max(1, Math.floor(weeklyTrend.length / 12))}
            />
            <YAxis
              domain={[0, 200]}
              tick={{
                fontSize: 9,
                fill: t.faint,
                fontFamily: "'DM Mono',monospace",
              }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTip t={t} />} />
            <Legend
              wrapperStyle={{ fontSize: 9, fontFamily: "'DM Mono',monospace" }}
              iconType="circle"
              iconSize={7}
            />
            <Line
              type="monotone"
              dataKey="load"
              name="Raw load"
              stroke={t.muted}
              strokeWidth={1}
              dot={false}
              strokeDasharray="3 2"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="rolling"
              name="7-pt rolling avg"
              stroke={t.accent}
              strokeWidth={2.5}
              dot={{ fill: t.accent, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="resp"
              name="Breathing rate"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Fatigue Risk Indicator */}
      {worstRisk && (
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
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              color: t.muted,
              marginBottom: 14,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            Fatigue Risk Indicator
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              padding: "14px 18px",
              borderRadius: 12,
              marginBottom: 14,
              background:
                worstRisk.level === "high"
                  ? t.dangerBg
                  : worstRisk.level === "moderate"
                    ? t.warningBg
                    : t.successBg,
              border: `1px solid ${
                worstRisk.level === "high"
                  ? t.danger + "30"
                  : worstRisk.level === "moderate"
                    ? t.warning + "30"
                    : t.success + "30"
              }`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                flexShrink: 0,
                background:
                  worstRisk.level === "high"
                    ? "#ef4444"
                    : worstRisk.level === "moderate"
                      ? "#f59e0b"
                      : "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 12px ${
                  worstRisk.level === "high"
                    ? "#ef444460"
                    : worstRisk.level === "moderate"
                      ? "#f59e0b60"
                      : "#10b98160"
                }`,
              }}
            >
              {worstRisk.level === "high" ? (
                <AlertTriangle size={22} color="#fff" strokeWidth={2.5} />
              ) : worstRisk.level === "moderate" ? (
                <Zap size={22} color="#fff" strokeWidth={2.5} />
              ) : (
                <CheckCircle size={22} color="#fff" strokeWidth={2.5} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: t.text,
                  marginBottom: 4,
                }}
              >
                {worstRisk.level === "high"
                  ? `High Fatigue Risk — ${worstRisk.name}`
                  : worstRisk.level === "moderate"
                    ? `Moderate Fatigue Load — ${worstRisk.name}`
                    : "All Athletes Within Safe Recovery Range"}
              </p>
              <p style={{ fontSize: 11, color: t.muted, lineHeight: 1.6 }}>
                {worstRisk.level === "high"
                  ? `Composite risk index elevated. HR: ${worstRisk.hr} bpm · Temp: ${worstRisk.temp}°C · Motion: ${worstRisk.mg}g. Reduce intensity by 25% and monitor next 15 min.`
                  : worstRisk.level === "moderate"
                    ? `Moderate load. HR: ${worstRisk.hr} bpm · Temp: ${worstRisk.temp}°C. Avoid escalation; hydrate.`
                    : `All metrics within healthy bounds. Recovery score: ${recoveryScore}/100.`}
              </p>
            </div>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 800,
                fontFamily: "'DM Mono',monospace",
                background:
                  worstRisk.level === "high"
                    ? t.danger
                    : worstRisk.level === "moderate"
                      ? t.warning
                      : t.success,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {worstRisk.level.toUpperCase()}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {fatigueRisk.map((r) => {
              const color =
                r.level === "high"
                  ? t.danger
                  : r.level === "moderate"
                    ? t.warning
                    : t.success;
              const bg =
                r.level === "high"
                  ? t.dangerBg
                  : r.level === "moderate"
                    ? t.warningBg
                    : t.successBg;
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: bg,
                    border: `1px solid ${color}25`,
                    flex: "1 1 200px",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {ATHLETE_META[r.id]?.avatar || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: t.text }}>
                      {r.name}
                    </p>
                    <p
                      style={{
                        fontSize: 9,
                        color: t.muted,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      HR:{r.hr} · Temp:{r.temp}°C · Mg:{r.mg}g
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: color,
                      color: "#fff",
                      fontFamily: "'DM Mono',monospace",
                      flexShrink: 0,
                    }}
                  >
                    {r.level.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
