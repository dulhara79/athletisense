// src/pages/AthletiSenseDashboard.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useAthleteData } from "../hooks/useAthleteData";
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Heart,
  Wind,
  Thermometer,
  Activity,
  Wifi,
  WifiOff,
  Signal,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Shield,
  Bell,
  Pause,
  Play,
  ChevronDown,
} from "lucide-react";
import {
  timeLabel,
  getBpm,
  getTemp,
  getResp,
  getMag,
  getSteps,
  getRssi,
  fmtBpm,
  fmtTemp,
  fmtResp,
  initials,
  athleteColor,
} from "../utils/dataHelpers";

/* ── Shared chart tooltip ─────────────────────────────────────── */
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
          fontFamily: "'DM Mono',monospace",
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

/* ── StatCard with sparkline ──────────────────────────────────── */
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
  return (
    <div
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
          background: `linear-gradient(90deg,${color},${color}40)`,
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
          fontFamily: "'DM Mono',monospace",
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
            fontFamily: "'DM Mono',monospace",
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

/* ── Session Timer ────────────────────────────────────────────── */
function SessionTimer({ t }) {
  const { timerSecs, setTimerSecs, timerRunning, setTimerRunning } = useAuth();
  const h = String(Math.floor(timerSecs / 3600)).padStart(2, "0");
  const m = String(Math.floor((timerSecs % 3600) / 60)).padStart(2, "0");
  const s = String(timerSecs % 60).padStart(2, "0");
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1rem 1.5rem",
        flex: 1,
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
          fontFamily: "'DM Mono',monospace",
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
            fontFamily: "'DM Mono',monospace",
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
            }}
          >
            {timerRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => {
              setTimerRunning(false);
              setTimerSecs(0);
            }}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              color: t.muted,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            RST
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── HR Gauge ─────────────────────────────────────────────────── */
function HRGauge({ bpm = 0, isResting = false, t }) {
  const b = isResting
    ? { vl: 40, l: 60, h: 80, vh: 100 }
    : { vl: 60, l: 90, h: 130, vh: 160 };
  const zone =
    bpm < b.vl
      ? { color: "#ef4444", label: "VERY LOW" }
      : bpm < b.l
        ? { color: "#f59e0b", label: "LOW" }
        : bpm <= b.h
          ? { color: "#10b981", label: "NORMAL" }
          : bpm <= b.vh
            ? { color: "#f59e0b", label: "HIGH" }
            : { color: "#ef4444", label: "VERY HIGH" };
  const pct = Math.min(bpm / 220, 1);
  const cx = 80,
    cy = 110,
    r = 60;
  const pt = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (s, e) => {
    if (e - s < 0.01) return "";
    const sp = pt(s),
      ep = pt(e);
    return `M ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y}`;
  };
  return (
    <svg viewBox="0 0 160 120" style={{ width: "100%", maxWidth: 220 }}>
      <path
        d={arc(270, 450)}
        fill="none"
        stroke={t.surface}
        strokeWidth={14}
        strokeLinecap="round"
      />
      {pct > 0.005 && (
        <path
          d={arc(270, 270 + pct * 180)}
          fill="none"
          stroke={zone.color}
          strokeWidth={14}
          strokeLinecap="round"
        />
      )}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fontSize="36"
        fontWeight="800"
        fill={zone.color}
        fontFamily="'DM Mono',monospace"
        letterSpacing="-1"
      >
        {bpm || "--"}
      </text>
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill={t.muted}
        fontFamily="'DM Mono',monospace"
        letterSpacing="0.08em"
      >
        {zone.label}
      </text>
    </svg>
  );
}

/* ── Motion Gauge ─────────────────────────────────────────────── */
function MotionGaugeViz({ value = 0, t }) {
  const pct = Math.min(value / 15, 1);
  const color = pct < 0.33 ? "#10b981" : pct < 0.66 ? "#f59e0b" : "#ef4444";
  const cx = 80,
    cy = 110,
    r = 60;
  const pt = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (s, e) => {
    if (e - s < 0.01) return "";
    const sp = pt(s),
      ep = pt(e);
    return `M ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y}`;
  };
  return (
    <svg viewBox="0 0 160 120" style={{ width: "100%", maxWidth: 220 }}>
      <path
        d={arc(270, 450)}
        fill="none"
        stroke={t.surface}
        strokeWidth={14}
        strokeLinecap="round"
      />
      {pct > 0.005 && (
        <path
          d={arc(270, 270 + pct * 180)}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
        />
      )}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fontSize="36"
        fontWeight="800"
        fill={color}
        fontFamily="'DM Mono',monospace"
      >
        {(pct * 10).toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill={t.muted}
        fontFamily="'DM Mono',monospace"
        letterSpacing="0.08em"
      >
        INTENSITY
      </text>
    </svg>
  );
}

/* ── Alerts ───────────────────────────────────────────────────── */
function getAlerts(latest) {
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
  if (!out.length)
    out.push({
      id: "ok",
      level: "info",
      title: "All Systems Normal",
      msg: "All biometrics within healthy ranges",
    });
  return out;
}

function AlertsPanel({ latest, t }) {
  const [dismissed, setDismissed] = useState(new Set());
  const alerts = useMemo(
    () => getAlerts(latest).filter((a) => !dismissed.has(a.id)),
    [latest, dismissed],
  );
  const cfg = {
    critical: {
      bg: t.dangerBg,
      border: "rgba(225,29,72,0.2)",
      text: t.danger,
      Icon: AlertCircle,
    },
    warning: {
      bg: t.warningBg,
      border: "rgba(217,119,6,0.2)",
      text: t.warning,
      Icon: AlertTriangle,
    },
    info: {
      bg: t.accentBg,
      border: "rgba(79,70,229,0.2)",
      text: t.accent,
      Icon: Info,
    },
  };
  return (
    <div>
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
            fontFamily: "'DM Mono',monospace",
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
          }}
        >
          {alerts.length} active
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {alerts.map((a) => {
          const c = cfg[a.level];
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
              }}
            >
              <Icon
                size={14}
                color={c.text}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
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

/* ── Bell notification ────────────────────────────────────────── */
function NotificationBell({ history, t }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const count = history.filter((n) => !dismissed.has(n.histId)).length;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: 8,
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          color: t.muted,
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: t.danger,
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${t.bg}`,
            }}
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 300,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            boxShadow: t.shadowHover,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: t.text }}>
              Recent Alerts
            </p>
            <span style={{ fontSize: 10, color: t.faint }}>Latest 10</span>
          </div>
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {history.length === 0 ? (
              <p
                style={{
                  padding: 24,
                  textAlign: "center",
                  fontSize: 12,
                  color: t.faint,
                }}
              >
                No alerts yet
              </p>
            ) : (
              history.map((n) => (
                <div
                  key={n.histId}
                  style={{
                    padding: "10px 16px",
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex",
                    gap: 10,
                    background: dismissed.has(n.histId)
                      ? "transparent"
                      : t.accentBg,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: 11, color: t.muted }}>{n.msg}</p>
                    <p
                      style={{
                        fontSize: 9,
                        color: t.faint,
                        marginTop: 2,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {n.timestamp}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setDismissed((d) => new Set([...d, n.histId]))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: t.faint,
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────── */
export default function AthletiSenseDashboard({ t }) {
  const { user, connectedCoaches = [], connectedAthletes = [] } = useAuth();
  const { athletes, liveData, connected, loading, getAthleteData, getLatest } =
    useAthleteData();
  const isAdmin = user?.role === "admin";
  const myAthleteId = user?.athleteId;
  const connectedAthleteIds = isAdmin ? connectedAthletes.map(a => a.athleteId) : [];

  // Role-filter: athletes only see themselves
  const visible = isAdmin
    ? athletes.filter(a => connectedAthleteIds.includes(a.id))
    : athletes.filter((a) => a.id === myAthleteId);
    
  const allIds = visible.map((a) => a.id);
  const [selectedId, setSelectedId] = useState(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [notifHist, setNotifHist] = useState([]);

  // Auto-select first visible athlete
  useEffect(() => {
    if (!selectedId && visible.length) setSelectedId(visible[0].id);
  }, [visible.length]);

  const latest = getLatest(selectedId);
  const records = getAthleteData(selectedId);

  // Notification history
  useEffect(() => {
    if (!latest) return;
    const active = getAlerts(latest).filter((a) => a.level !== "info");
    if (!active.length) return;
    setNotifHist((prev) => {
      const next = [...prev];
      let changed = false;
      active.forEach((a) => {
        const histId = `${a.id}-${latest.timestamp}`;
        if (!next.some((n) => n.histId === histId)) {
          next.unshift({
            ...a,
            histId,
            timestamp: new Date().toLocaleTimeString(),
          });
          changed = true;
        }
      });
      return changed ? next.slice(0, 10) : prev;
    });
  }, [latest]);

  const chartData = useMemo(
    () =>
      records.map((r) => ({
        time: timeLabel(r.timestamp),
        bpm: getBpm(r),
        resp: getResp(r),
        temp: getTemp(r),
        mg: parseFloat((getMag(r) ?? 0).toFixed(2)),
        steps: getSteps(r),
      })),
    [records],
  );

  const bpm = getBpm(latest);
  const temp = getTemp(latest);
  const resp = getResp(latest);
  const mag = getMag(latest) ?? 0;
  const steps = getSteps(latest);
  const rssi = getRssi(latest);

  // Athlete meta from live data
  const selectedAthlete = athletes.find((a) => a.id === selectedId);
  const athleteName = selectedAthlete?.name || selectedId || "—";
  const athleteSport = selectedAthlete?.sport || "Athlete";
  const avatar = initials(athleteName);
  const color = athleteColor(selectedId, allIds);

  if (loading)
    return (
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: t.muted, fontSize: 13 }}>Connecting to Firebase…</p>
      </main>
    );

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
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: t.text,
              fontFamily: "'Bebas Neue','Syne',sans-serif",
              letterSpacing: "0.06em",
            }}
          >
            LIVE MONITORING
          </h2>
          <p style={{ fontSize: 11, color: t.muted }}>
            Real-time biometric data stream · {records.length} readings
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {connected ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: t.success,
                background: t.successBg,
                padding: "4px 10px",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: t.success,
                  animation: "pulse-dot 1.6s ease-in-out infinite",
                }}
              />
              LIVE
            </span>
          ) : (
            <span style={{ fontSize: 10, color: t.muted }}>Offline</span>
          )}
          <NotificationBell history={notifHist} t={t} />
        </div>
      </div>

      {/* ── Athlete selector + timer + status ── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        {/* Selector */}
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1rem 1.25rem",
            flex: 1,
            boxShadow: t.shadow,
            position: "relative",
            minWidth: 200,
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
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {isAdmin ? "Athlete Select" : "Viewing As"}
          </p>
          {isAdmin ? (
            <>
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
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color,
                    flexShrink: 0,
                  }}
                >
                  {avatar}
                </div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                    {athleteName}
                  </p>
                  <p style={{ fontSize: 10, color: t.muted }}>
                    {athleteSport} · {selectedId}
                  </p>
                </div>
                <ChevronDown size={14} color={t.muted} />
              </button>
              {dropOpen && (
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
                  {visible.map((a) => {
                    const c = athleteColor(a.id, allIds);
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
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 7,
                            background: `${c}20`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 800,
                            color: c,
                          }}
                        >
                          {initials(a.name)}
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: t.text,
                            }}
                          >
                            {a.name}
                          </p>
                          <p style={{ fontSize: 10, color: t.muted }}>
                            {a.id} · {a.sport}
                          </p>
                        </div>
                        {connected && (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: 9,
                              color: t.success,
                              fontWeight: 700,
                            }}
                          >
                            ● LIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${color}20`,
                  border: `1px solid ${color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color,
                }}
              >
                {avatar}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                  {athleteName}
                </p>
                <p style={{ fontSize: 10, color: t.muted }}>
                  {connectedCoaches.length
                    ? `Coached by ${connectedCoaches.map((c) => c.name).join(", ")}`
                    : "Independent Athlete"}
                </p>
              </div>
            </div>
          )}
        </div>
        <SessionTimer t={t} />
        {/* Status */}
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1rem 1.25rem",
            flex: 1,
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
              fontFamily: "'DM Mono',monospace",
            }}
          >
            Status
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {connected ? (
                <Wifi size={13} color={t.success} />
              ) : (
                <WifiOff size={13} color={t.danger} />
              )}
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>
                Connection:
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: connected ? t.success : t.danger,
                  fontWeight: 700,
                }}
              >
                {connected ? "Firebase Live" : "Offline"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Signal size={13} color={t.accent} />
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>
                RSSI:
              </span>
              <span style={{ fontSize: 11, color: t.text, fontWeight: 700 }}>
                {rssi ?? "--"} dBm
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} color={t.accent} />
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>
                Steps:
              </span>
              <span style={{ fontSize: 11, color: t.text, fontWeight: 700 }}>
                {steps ?? "--"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metric cards ── */}
      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <StatCard
          title="Heart Rate"
          value={fmtBpm(bpm)}
          unit="bpm"
          sub={
            chartData.length
              ? `Max: ${Math.max(...chartData.map((d) => d.bpm || 0)).toFixed(0)} bpm`
              : null
          }
          color="#ef4444"
          icon={Heart}
          sparkData={chartData}
          sparkKey="bpm"
          t={t}
        />
        <StatCard
          title="Breathing Rate"
          value={fmtResp(resp)}
          unit="br/min"
          sub={
            chartData.length
              ? `Avg: ${(chartData.reduce((s, d) => s + (d.resp || 0), 0) / chartData.length).toFixed(0)} br/min`
              : null
          }
          color="#3b82f6"
          icon={Wind}
          sparkData={chartData}
          sparkKey="resp"
          t={t}
        />
        <StatCard
          title="Skin Temperature"
          value={fmtTemp(temp)}
          unit="°C"
          sub={
            chartData.filter((d) => d.temp).length
              ? `Range: ${Math.min(...chartData.filter((d) => d.temp).map((d) => d.temp)).toFixed(1)}–${Math.max(...chartData.filter((d) => d.temp).map((d) => d.temp)).toFixed(1)} °C`
              : null
          }
          color="#f59e0b"
          icon={Thermometer}
          sparkData={chartData}
          sparkKey="temp"
          t={t}
        />
        <StatCard
          title="Step Count"
          value={steps ?? "--"}
          unit="steps"
          sub={
            chartData.length
              ? `Max: ${Math.max(...chartData.map((d) => d.steps || 0))} steps`
              : null
          }
          color="#8b5cf6"
          icon={Activity}
          sparkData={chartData}
          sparkKey="steps"
          t={t}
        />
      </div>

      {/* ── Gauges + Motion chart ── */}
      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <div
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
              fontFamily: "'DM Mono',monospace",
            }}
          >
            HR Gauge
          </p>
          <HRGauge bpm={bpm || 0} isResting={mag < 1.2} t={t} />
        </div>
        <div
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
                fontFamily: "'DM Mono',monospace",
              }}
            >
              Motion Chart
            </p>
            <span
              style={{
                fontSize: 9,
                color: t.faint,
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {chartData.length} readings
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="mgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
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
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Area
                type="monotone"
                dataKey="mg"
                name="Accel (g)"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#mgGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div
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
              fontFamily: "'DM Mono',monospace",
            }}
          >
            Motion Gauge
          </p>
          <MotionGaugeViz value={mag} t={t} />
        </div>
      </div>

      {/* ── HR vs Motion + Breathing ── */}
      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <div
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
              fontFamily: "'DM Mono',monospace",
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
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="hr"
                domain={[40, 220]}
                tick={{ fontSize: 8, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <YAxis
                yAxisId="mg"
                orientation="right"
                domain={[0, 15]}
                tick={{ fontSize: 8, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(v) => `${v}g`}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <ReferenceLine
                yAxisId="hr"
                y={175}
                stroke={`${t.danger}60`}
                strokeDasharray="4 3"
                label={{
                  value: "Max",
                  position: "right",
                  fontSize: 8,
                  fill: t.danger,
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
                name="Motion"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                unit="g"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            flex: 1,
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
                fontFamily: "'DM Mono',monospace",
              }}
            >
              Breathing Rate
            </p>
            <span style={{ fontSize: 9, color: t.faint }}>
              Normal: 12–20 br/min
            </span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="brGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fontFamily: "'DM Mono',monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 50]}
                tick={{ fontSize: 8, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <ReferenceLine
                y={12}
                stroke="#10b98150"
                strokeDasharray="4 3"
                label={{
                  value: "Low",
                  position: "right",
                  fontSize: 7,
                  fill: "#10b981",
                }}
              />
              <ReferenceLine
                y={20}
                stroke="#10b98150"
                strokeDasharray="4 3"
                label={{
                  value: "Normal",
                  position: "right",
                  fontSize: 7,
                  fill: "#10b981",
                }}
              />
              <ReferenceLine
                y={30}
                stroke="#f59e0b50"
                strokeDasharray="4 3"
                label={{
                  value: "High",
                  position: "right",
                  fontSize: 7,
                  fill: "#f59e0b",
                }}
              />
              <Area
                type="monotone"
                dataKey="resp"
                name="Breathing"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#brGrad)"
                dot={false}
                isAnimationActive={false}
                unit=" br/min"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Alerts ── */}
      <div
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
