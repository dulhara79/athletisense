import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  Wifi,
  WifiOff,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Pause,
  Play,
  Battery,
  Signal,
  X,
  Shield,
} from "lucide-react";

const API_BASE = "http://localhost:3001";
const WS_URL = "ws://localhost:3001";
const MAX_HISTORY_POINTS = 60;

const ATHLETE_META = {
  ATH_001: { name: "Marcus Thorne", sport: "Elite Runner", avatar: "MT" },
  ATH_002: { name: "Sarah Chen", sport: "Cyclist", avatar: "SC" },
  ATH_003: { name: "Diego Ramirez", sport: "Swimmer", avatar: "DR" },
  ATH_004: { name: "Aisha Patel", sport: "Sprinter", avatar: "AP" },
};

function motionMagnitude(rec) {
  if (!rec?.motion) return 0;
  const { accel_x: ax = 0, accel_y: ay = 0, accel_z: az = 0 } = rec.motion;
  return Math.sqrt(ax * ax + ay * ay + az * az) / 16384;
}

function timeLabel(ts) {
  if (!ts) return "--:--";
  const parts = ts.split(" ");
  return parts[1]?.slice(0, 5) || "--:--";
}

function fmtBpm(v) {
  return typeof v === "number" ? v.toFixed(0) : "--";
}
function fmtTemp(v) {
  return typeof v === "number" ? v.toFixed(1) : "--";
}
function fmtResp(v) {
  return typeof v === "number" ? v.toFixed(0) : "--";
}

function LiveDot({ t }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: t.success,
        marginRight: 5,
        animation: "pulse-dot 1.6s ease-in-out infinite",
      }}
    />
  );
}

function StatCard({
  title,
  value,
  unit,
  sub,
  color,
  icon: Icon,
  sparkData,
  sparkKey,
  t,
}) {
  const gradStart = color + "30";
  return (
    <div
      className="card-fadein"
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1.25rem",
        flex: 1,
        minWidth: 0,
        boxShadow: t.shadow,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}, ${color}40)`,
        }}
      />
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.muted,
          marginBottom: 6,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {title}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1,
            color,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "-2px",
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: t.muted,
            marginBottom: 4,
          }}
        >
          {unit}
        </span>
        {sparkData?.length > 1 && (
          <div style={{ flex: 1, height: 36, marginBottom: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparkData}
                margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`sg-${sparkKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={sparkKey}
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#sg-${sparkKey})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {sub && (
        <p style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>{sub}</p>
      )}
    </div>
  );
}

function SessionTimer({ t }) {
  const { timerSecs, setTimerSecs, timerRunning, setTimerRunning } = useAuth();
  
  const h = String(Math.floor(timerSecs / 3600)).padStart(2, "0");
  const m = String(Math.floor((timerSecs % 3600) / 60)).padStart(2, "0");
  const s = String(timerSecs % 60).padStart(2, "0");
  return (
    <div
      className="card-fadein"
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1rem 1.5rem",
        flex: "0 0 auto",
        boxShadow: t.shadow,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.muted,
          marginBottom: 6,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        Session Timer
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: t.text,
            letterSpacing: "-1px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {h}:{m}:{s}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setTimerRunning((r) => !r)}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              color: t.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {timerRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => { setTimerRunning(false); setTimerSecs(0); }}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              color: t.muted,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            RST
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ athlete, wsConnected, t }) {
  return (
    <div
      className="card-fadein"
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1rem 1.25rem",
        flex: "0 0 auto",
        boxShadow: t.shadow,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.muted,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        Status
      </p>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={13} color={t.accent} />
            <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>
              Training:
            </span>
            <span style={{ fontSize: 11, color: t.text, fontWeight: 700 }}>
              Cardio
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Battery size={13} color={t.success} />
            <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>
              Batt:
            </span>
            <span style={{ fontSize: 11, color: t.success, fontWeight: 700 }}>
              85%
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {wsConnected ? (
              <Wifi size={13} color={t.success} />
            ) : (
              <WifiOff size={13} color={t.danger} />
            )}
            <span style={{ fontSize: 11, color: t.text, fontWeight: 700 }}>
              {wsConnected ? "Live" : "Offline"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Signal size={13} color={t.accent} />
            <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>
              RSSI:
            </span>
            <span style={{ fontSize: 11, color: t.text, fontWeight: 700 }}>
              {athlete?.system?.wifi_rssi ?? "--"} dBm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MotionGauge({ value = 0, max = 15, t }) {
  const pct = Math.min(value / max, 1);
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnim(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const color = anim < 0.33 ? "#10b981" : anim < 0.66 ? "#f59e0b" : "#ef4444";
  const cx = 80,
    cy = 85,
    r = 55;
  const angle = (p, offset = 135) => offset + p * 270;

  function pt(angleDeg, radius = r) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  function arc(start, end, radius = r) {
    if (end - start < 0.01) return "";
    const s = pt(start, radius),
      e = pt(end, radius);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const score = (anim * 10).toFixed(1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <svg viewBox="0 0 160 155" style={{ width: "100%", maxWidth: 220 }}>
        <defs>
          <linearGradient id="mgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d={arc(135, 405)}
          fill="none"
          stroke={t.surface}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={arc(135, 405)}
          fill="none"
          stroke="url(#mgGrad)"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={0.12}
        />
        {anim > 0.005 && (
          <path
            d={arc(135, 135 + anim * 270)}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            style={{ transition: "stroke 0.4s ease, d 0.6s ease" }}
          />
        )}
        {[
          ["LOW", "#10b981", 20, 115],
          ["MED", "#f59e0b", 80, 28],
          ["HIGH", "#ef4444", 140, 115],
        ].map(([l, c, x, y]) => (
          <text
            key={l}
            x={x}
            y={y}
            fill={c}
            fontSize="7.5"
            fontWeight="800"
            fontFamily="'DM Mono', monospace"
            textAnchor="middle"
          >
            {l}
          </text>
        ))}
        <g
          transform={`rotate(${angle(anim) - 90}, ${cx}, ${cy})`}
          style={{
            transition: "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - 46}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill={t.card}
          stroke={color}
          strokeWidth={2.5}
        />
        <circle cx={cx} cy={cy} r={3} fill={color} />
        <text
          x={cx}
          y={cy + 32}
          fill={color}
          fontSize="24"
          fontWeight="700"
          fontFamily="'DM Mono', monospace"
          textAnchor="middle"
          letterSpacing="-1"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 47}
          fill={t.muted}
          fontSize="7"
          fontWeight="700"
          fontFamily="'DM Mono', monospace"
          textAnchor="middle"
          letterSpacing="0.08em"
        >
          INTENSITY SCORE
        </text>
        <text
          x={cx}
          y={cy + 58}
          fill={t.faint}
          fontSize="7"
          fontFamily="'DM Mono', monospace"
          textAnchor="middle"
        >
          {value.toFixed(2)}g / {max}g max
        </text>
      </svg>
    </div>
  );
}

function HeartRateGauge({ value = 0, max = 220, t }) {
  const pct = Math.min(value / max, 1);
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnim(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const color = anim < 0.5 ? "#10b981" : anim < 0.85 ? "#f59e0b" : "#ef4444";
  const cx = 80, cy = 85, r = 55;
  const angle = (p, offset = 135) => offset + p * 270;

  function pt(angleDeg, radius = r) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  function arc(start, end, radius = r) {
    if (end - start < 0.01) return "";
    const s = pt(start, radius),
      e = pt(end, radius);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const score = Math.round(anim * max);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <svg viewBox="0 0 160 155" style={{ width: "100%", maxWidth: 220 }}>
        <defs>
          <linearGradient id="hrgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d={arc(135, 405)}
          fill="none"
          stroke={t.surface}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={arc(135, 405)}
          fill="none"
          stroke="url(#hrgGrad)"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={0.12}
        />
        {anim > 0.005 && (
          <path
            d={arc(135, 135 + anim * 270)}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            style={{ transition: "stroke 0.4s ease, d 0.6s ease" }}
          />
        )}
        {[
          ["REST", "#10b981", 20, 115],
          ["AERO", "#f59e0b", 80, 28],
          ["MAX", "#ef4444", 140, 115],
        ].map(([l, c, x, y]) => (
          <text
            key={l}
            x={x}
            y={y}
            fill={c}
            fontSize="7.5"
            fontWeight="800"
            fontFamily="'DM Mono', monospace"
            textAnchor="middle"
          >
            {l}
          </text>
        ))}
        <text
          x={cx}
          y={cy + 15}
          textAnchor="middle"
          fontSize="28"
          fontWeight="800"
          fill={color}
          fontFamily="'DM Mono', monospace"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 35}
          textAnchor="middle"
          fontSize="8"
          fontWeight="800"
          letterSpacing="1px"
          fill={t.text}
          fontFamily="'DM Mono', monospace"
        >
          HEART RATE
        </text>
        <text
          x={cx}
          y={cy + 48}
          textAnchor="middle"
          fontSize="7"
          fill={t.faint}
          fontFamily="'DM Mono', monospace"
        >
          {max} bpm max
        </text>
      </svg>
    </div>
  );
}

function AlertsPanel({ latest, t }) {
  const [dismissed, setDismissed] = useState(new Set());

  const alerts = useMemo(() => {
    if (!latest) return [];
    const out = [];
    const bpm = latest?.heart_rate?.bpm_avg ?? 0;
    const temp = latest?.temperature?.celsius ?? 0;
    const mg = motionMagnitude(latest);
    const leads = latest?.heart_rate?.leads_connected;

    if (bpm > 175)
      out.push({
        id: `hr-c`,
        level: "critical",
        title: "Critical: HR Threshold Exceeded",
        msg: `${fmtBpm(bpm)} bpm — limit 175 bpm`,
      });
    else if (bpm > 155)
      out.push({
        id: `hr-w`,
        level: "warning",
        title: "Warning: Elevated Heart Rate",
        msg: `${fmtBpm(bpm)} bpm — approaching threshold`,
      });
    if (mg > 11)
      out.push({
        id: `mg-w`,
        level: "warning",
        title: "Warning: High Impact Detected",
        msg: `Motion: ${mg.toFixed(2)}g`,
      });
    if (temp > 38)
      out.push({
        id: `tp-w`,
        level: "warning",
        title: "Warning: High Skin Temperature",
        msg: `${fmtTemp(temp)}°C — heat risk present`,
      });
    if (leads === false)
      out.push({
        id: `ld-w`,
        level: "warning",
        title: "Warning: ECG Leads Disconnected",
        msg: "Electrode contact lost — check strap placement",
      });
    if (!out.length)
      out.push({
        id: `ok`,
        level: "info",
        title: "All Systems Normal",
        msg: "All biometric metrics within healthy range",
      });
    return out.filter((a) => !dismissed.has(a.id));
  }, [latest, dismissed]);

  const colors = {
    critical: {
      bg: t.dangerBg,
      border: `rgba(225,29,72,0.2)`,
      text: t.danger,
      Icon: AlertCircle,
    },
    warning: {
      bg: t.warningBg,
      border: `rgba(217,119,6,0.2)`,
      text: t.warning,
      Icon: AlertTriangle,
    },
    info: {
      bg: t.accentBg,
      border: `rgba(79,70,229,0.2)`,
      text: t.accent,
      Icon: Info,
    },
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Shield size={14} color={t.accent} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: t.muted,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          Alerts Panel
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 6,
            background: t.accentBg,
            color: t.accent,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {alerts.length} active
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {alerts.map((a) => {
          const c = colors[a.level];
          const { Icon } = c;
          return (
            <div
              key={a.id}
              style={{
                flex: "1 1 280px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                background: c.bg,
                border: `1px solid ${c.border}`,
                position: "relative",
              }}
            >
              <Icon
                size={14}
                color={c.text}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: t.text,
                    marginBottom: 2,
                  }}
                >
                  {a.title}
                </p>
                <p style={{ fontSize: 10, color: t.muted }}>{a.msg}</p>
              </div>
              <button
                onClick={() => setDismissed((d) => new Set([...d, a.id]))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: t.faint,
                  padding: 0,
                  marginTop: 1,
                  flexShrink: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
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
      }}
    >
      <p
        style={{
          fontSize: 10,
          color: t.muted,
          marginBottom: 4,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          style={{ fontSize: 11, color: p.color, fontWeight: 700 }}
        >
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          {p.unit ?? ""}
        </p>
      ))}
    </div>
  );
}

export default function AthletiSenseDashboard({ t }) {
  const [athletes, setAthletes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [liveLatest, setLiveLatest] = useState({});
  const [history, setHistory] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const wsRef = useRef(null);

  // Role-based filtering
  const { user, connectedCoaches = [] } = useAuth();
  const isAdmin = user?.role === 'admin';
  const myAthleteId = user?.athleteId;

  useEffect(() => {
    fetch(`${API_BASE}/api/athletes`)
      .then((r) => r.json())
      .then(({ athletes: list }) => {
        // Role-based filter: athletes only see their own data
        const filtered = (!isAdmin && myAthleteId)
          ? (list || []).filter(a => a.id === myAthleteId)
          : (list || []);
        setAthletes(filtered);
        if (filtered.length) {
          const first = filtered[0];
          setSelectedId(first.id);
          const latestMap = {};
          filtered.forEach((a) => {
            if (a.latest) latestMap[a.id] = a.latest;
          });
          setLiveLatest(latestMap);
        }
      })
      .catch((err) => console.error("[REST] athletes:", err));
  }, []);

  useEffect(() => {
    if (!selectedId || history[selectedId]?.length) return;
    fetch(`${API_BASE}/api/athletes/${selectedId}/history?limit=60`)
      .then((r) => r.json())
      .then((data) => {
        if (data.readings) {
          setHistory((h) => ({ ...h, [selectedId]: data.readings.reverse() }));
        }
      })
      .catch((err) => console.error("[REST] history:", err));
  }, [selectedId]);

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
          if (msg.type === "snapshot") {
            const latestMap = {};
            msg.athletes?.forEach((a) => {
              if (a.latest) latestMap[a.id] = a.latest;
            });
            setLiveLatest((prev) => ({ ...prev, ...latestMap }));
          }
          if (msg.type === "live_update") {
            const { athlete_id: id, data } = msg;
            if (!id || !data) return;
            setLiveLatest((prev) => ({ ...prev, [id]: data }));
            setHistory((prev) => {
              const existing = prev[id] || [];
              const updated = [...existing, data].slice(-MAX_HISTORY_POINTS);
              return { ...prev, [id]: updated };
            });
          }
        } catch (e) {}
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  const latest = liveLatest[selectedId] ?? null;
  const records = history[selectedId] ?? [];

  const chartData = useMemo(
    () =>
      records.map((r) => ({
        time: timeLabel(r.timestamp),
        bpm: r?.heart_rate?.bpm_avg ?? null,
        resp: r?.respiration?.rate_avg ?? null,
        temp: r?.temperature?.celsius ?? null,
        mg: parseFloat(motionMagnitude(r).toFixed(2)),
        steps: r?.motion?.step_count ?? null,
      })),
    [records],
  );

  const currentAthlete = athletes.find((a) => a.id === selectedId);
  const meta = ATHLETE_META[selectedId] ?? {
    name: selectedId,
    sport: "Athlete",
    avatar: "?",
  };
  const bpm = latest?.heart_rate?.bpm_avg ?? null;
  const resp = latest?.respiration?.rate_avg ?? null;
  const temp = latest?.temperature?.celsius ?? null;
  const mg = motionMagnitude(latest ?? {});
  const steps = latest?.motion?.step_count ?? null;

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
          gap: 12,
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
    <div
      className="card-fadein"
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1rem 1.25rem",
        flex: "0 0 auto",
        boxShadow: t.shadow,
        position: "relative",
        minWidth: 240,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: t.muted,
          marginBottom: 8,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {isAdmin ? 'Athlete Select' : 'Coach Sync'}
      </p>

      {isAdmin ? (
        // Admin View: Athlete Dropdown
        <button
          onClick={() => setDropOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${t.accent}30, ${t.accent}15)`,
              border: `1px solid ${t.accent}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              color: t.accent,
              fontFamily: "'DM Mono', monospace",
              flexShrink: 0,
            }}
          >
            {meta.avatar}
          </div>
          <div style={{ textAlign: "left", flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              {meta.name}
            </p>
            <p style={{ fontSize: 10, color: t.muted }}>{meta.sport}</p>
          </div>
          <ChevronDown size={14} color={t.muted} />
        </button>
      ) : (
        // Athlete View: Coach Display
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", background: t.surface,
          border: `1px solid ${t.border}`, borderRadius: 10,
          padding: "8px 12px",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: connectedCoaches.length ? `linear-gradient(135deg, ${t.accent}30, ${t.accent}15)` : t.bg,
            border: `1px solid ${t.accent}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: t.accent, flexShrink: 0,
          }}>
            {connectedCoaches.length ? <Shield size={14} /> : '💪'}
          </div>
          <div style={{ textAlign: "left", flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              {connectedCoaches.length 
                ? connectedCoaches.map(c => c.name).join(', ') 
                : "You are your own Coach!"}
            </p>
            <p style={{ fontSize: 10, color: t.muted }}>
              {connectedCoaches.length ? "Monitoring active" : "Independent Athlete Yay!"}
            </p>
          </div>
        </div>
      )}

      {isAdmin && dropOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            marginTop: 4,
            boxShadow: t.shadowHover,
            overflow: "hidden",
          }}
        >
          {athletes.map((a) => {
            const m = ATHLETE_META[a.id] ?? {
              name: a.id,
              sport: "Athlete",
              avatar: "?",
            };
            return (
              <button
                key={a.id}
                onClick={() => {
                  setSelectedId(a.id);
                  setDropOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 14px",
                  background:
                    a.id === selectedId ? t.accentBg : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: `linear-gradient(135deg, ${t.accent}25, ${t.accent}10)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: t.accent,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {m.avatar}
                </div>
                <div style={{ textAlign: "left" }}>
                  <p
                    style={{ fontSize: 12, fontWeight: 600, color: t.text }}
                  >
                    {m.name}
                  </p>
                  <p style={{ fontSize: 10, color: t.muted }}>
                    {a.id} · {m.sport}
                  </p>
                </div>
                {wsConnected && (
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 9,
                      color: t.success,
                      fontFamily: "'DM Mono', monospace",
                      fontWeight: 700,
                    }}
                  >
                    <LiveDot t={t} /> LIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>

        {/* --- Removed the other parts of StatusCard that were manually extracted, they belong here --- */}

        <SessionTimer t={t} />
        <StatusCard athlete={latest} wsConnected={wsConnected} t={t} />

        <div
          className="card-fadein"
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1rem 1.25rem",
            flex: "0 0 auto",
            boxShadow: t.shadow,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: t.muted,
              marginBottom: 8,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Mode
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {wsConnected ? (
                <Wifi size={13} color={t.success} />
              ) : (
                <WifiOff size={13} color={t.faint} />
              )}
              <span style={{ fontSize: 10, color: t.muted, fontWeight: 600 }}>
                Connection:
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: wsConnected ? t.success : t.faint,
                  fontWeight: 700,
                }}
              >
                {wsConnected ? "Stable (WS)" : "Offline"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Signal size={13} color={t.accent} />
              <span style={{ fontSize: 10, color: t.muted, fontWeight: 600 }}>
                Steps:
              </span>
              <span style={{ fontSize: 10, color: t.text, fontWeight: 700 }}>
                {steps ?? "--"}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              background: wsConnected ? t.successBg : t.dangerBg,
              color: wsConnected ? t.success : t.danger,
              border: `1px solid ${wsConnected ? t.success : t.danger}30`,
            }}
          >
            {wsConnected ? (
              <>
                <LiveDot t={t} />
                LIVE
              </>
            ) : (
              <>
                <WifiOff size={11} />
                OFFLINE
              </>
            )}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <StatCard
          title="Heart Rate"
          value={fmtBpm(bpm)}
          unit="bpm"
          sub={`Max: ${chartData.length ? Math.max(...chartData.map((d) => d.bpm || 0)).toFixed(0) : "--"}`}
          color="#ef4444"
          icon={Heart}
          sparkData={chartData}
          sparkKey="bpm"
          t={t}
        />
        <StatCard
          title="Breathing Rate"
          value={fmtResp(resp)}
          unit="rpm"
          sub={`Avg: ${chartData.length ? (chartData.reduce((s, d) => s + (d.resp || 0), 0) / Math.max(chartData.length, 1)).toFixed(0) : "--"}`}
          color="#3b82f6"
          icon={Wind}
          sparkData={chartData}
          sparkKey="resp"
          t={t}
        />
        <StatCard
          title="Temperature"
          value={fmtTemp(temp)}
          unit="°C"
          sub={`Skin Temp: ${fmtTemp(temp)}°C`}
          color="#f59e0b"
          icon={Thermometer}
          sparkData={chartData}
          sparkKey="temp"
          t={t}
        />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div
          className="card-fadein"
          style={{
            flex: 3,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1.25rem",
            boxShadow: t.shadow,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: t.muted,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Motion Live Chart
            </p>
            <span
              style={{
                fontSize: 9,
                color: t.faint,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              last {chartData.length} readings
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="mgAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mgArea2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={30}
                label={{
                  value: "Magnitude (g)",
                  angle: -90,
                  position: "insideLeft",
                  fill: t.faint,
                  fontSize: 8,
                  dx: -8,
                }}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Legend
                wrapperStyle={{
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                }}
              />
              <Area
                type="monotone"
                dataKey="mg"
                name="Acceleration"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#mgAreaGrad)"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="resp"
                name="Resp rate (÷10)"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#mgArea2)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="card-fadein"
          style={{
            flex: 1,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1.25rem",
            boxShadow: t.shadow,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: t.muted,
              marginBottom: 8,
              alignSelf: "flex-start",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            HR Gauge
          </p>
          <HeartRateGauge value={bpm} max={220} t={t} />
        </div>

        <div
          className="card-fadein"
          style={{
            flex: 1,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1.25rem",
            boxShadow: t.shadow,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: t.muted,
              marginBottom: 8,
              alignSelf: "flex-start",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Motion Gauge
          </p>
          <MotionGauge value={mg} max={15} t={t} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div
          className="card-fadein"
          style={{
            flex: 1,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1.25rem",
            boxShadow: t.shadow,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: t.muted,
              marginBottom: 12,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            HR vs Motion
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="hr"
                domain={[40, 220]}
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <YAxis
                yAxisId="mg"
                orientation="right"
                domain={[0, 15]}
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(v) => `${v}g`}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Legend
                wrapperStyle={{
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                }}
              />
              <ReferenceLine
                yAxisId="hr"
                y={175}
                stroke={`${t.danger}60`}
                strokeDasharray="4 3"
                label={{
                  value: "Max HR",
                  position: "right",
                  fontSize: 8,
                  fill: t.danger,
                  fontFamily: "'DM Mono', monospace",
                }}
              />
              <Area
                yAxisId="hr"
                type="monotone"
                dataKey="bpm"
                name="Heart Rate"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#hrGrad)"
                dot={false}
                isAnimationActive={false}
                unit=" bpm"
              />
              <Line
                yAxisId="mg"
                type="monotone"
                dataKey="mg"
                name="Motion magnitude"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                unit="g"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div
          className="card-fadein"
          style={{
            flex: 1,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1.25rem",
            boxShadow: t.shadow,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: t.muted,
              marginBottom: 12,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Breathing vs Motion
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, bottom: 0, left: 0 }}
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
                dataKey="time"
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="resp"
                domain={[0, 50]}
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <YAxis
                yAxisId="mg"
                orientation="right"
                domain={[0, 15]}
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Mono', monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(v) => `${v}g`}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Legend
                wrapperStyle={{
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                }}
              />
              <Area
                yAxisId="resp"
                type="monotone"
                dataKey="resp"
                name="Breathing Rate"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#respGrad)"
                dot={false}
                isAnimationActive={false}
                unit=" br/min"
              />
              <Line
                yAxisId="mg"
                type="monotone"
                dataKey="mg"
                name="Motion magnitude"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                unit="g"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="card-fadein"
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: "1.25rem",
          boxShadow: t.shadow,
        }}
      >
        <AlertsPanel latest={latest} t={t} />
      </div>
    </main>
  );
}
