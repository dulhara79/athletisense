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
  Bell,
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
          fontFamily: "'DM Sans', monospace",
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
            fontFamily: "'DM Sans', monospace",
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
          fontFamily: "'DM Sans', monospace",
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
              fontFamily: "'DM Sans', monospace",
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

function StatusCard({ athlete, wsConnected, steps, t }) {
  return (
    <div
      className="card-fadein"
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1rem 1.25rem",
        flex: 1,
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
          fontFamily: "'DM Sans', monospace",
        }}
      >
        Status
      </p>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {wsConnected ? (
              <Wifi size={13} color={t.success} />
            ) : (
              <WifiOff size={13} color={t.danger} />
            )}
            <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>
              Connection:
            </span>
            <span style={{ fontSize: 11, color: wsConnected ? t.success : t.danger, fontWeight: 700 }}>
              {wsConnected ? "Live (WS)" : "Offline"}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
  const cx = 80, cy = 110, r = 60;

  function pt(angleDeg, radius = r) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  function arc(start, end, radius = r) {
    if (end - start < 0.01) return "";
    const s = pt(start, radius), e = pt(end, radius);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const score = (anim * 10).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <svg viewBox="0 0 160 120" style={{ width: "100%", maxWidth: 220 }}>
        <defs>
          <linearGradient id="mgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d={arc(270, 450)} fill="none" stroke={t.surface} strokeWidth={14} strokeLinecap="round" />
        <path d={arc(270, 450)} fill="none" stroke="url(#mgGrad)" strokeWidth={14} strokeLinecap="round" opacity={0.12} />
        {anim > 0.005 && (
          <path d={arc(270, 270 + anim * 180)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" style={{ transition: "stroke 0.4s ease" }} />
        )}
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize="36" fontWeight="800" fill={color} style={{ fontVariantNumeric: "tabular-nums" }} fontFamily="'DM Sans', sans-serif" letterSpacing="-1">
          {score}
        </text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="9" fontWeight="700" fill={t.muted} fontFamily="'DM Sans', sans-serif" letterSpacing="0.08em">
          INTENSITY SCORE
        </text>
      </svg>
    </div>
  );
}

function HeartRateGauge({ value = 0, max = 220, isResting = false, t }) {
  const bpm = typeof value === "number" ? Math.round(value) : 0;
  
  const b = isResting 
    ? { vl: 40, l: 60, h: 80, vh: 100 } 
    : { vl: 60, l: 90, h: 130, vh: 160 };

  function getZone(hr) {
    if (hr < b.vl) return { color: "#ef4444", label: "VERY LOW", sublabel: "Risky" };
    if (hr < b.l) return { color: "#f59e0b", label: "LOW", sublabel: "Below Normal" };
    if (hr <= b.h) return { color: "#10b981", label: "NORMAL", sublabel: "Healthy" };
    if (hr <= b.vh) return { color: "#f59e0b", label: "HIGH", sublabel: "Elevated" };
    return { color: "#ef4444", label: "VERY HIGH", sublabel: "Risky" };
  }

  const zone = getZone(bpm);
  const cx = 80, cy = 110, r = 60;
  const totalArc = 180;
  const startAngle = 270;

  function pt(angleDeg, radius = r) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  function arc(start, end, radius = r) {
    if (end - start < 0.01) return "";
    const s = pt(start, radius), e = pt(end, radius);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const zones = [
    { frac: b.vl / max, color: "#ef4444" },
    { frac: b.l / max, color: "#f59e0b" },
    { frac: b.h / max, color: "#10b981" },
    { frac: b.vh / max, color: "#f59e0b" },
    { frac: 1, color: "#ef4444" },
  ];

  const pct = Math.min(bpm / max, 1);
  const needleAngle = startAngle + pct * totalArc;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <svg viewBox="0 0 160 120" style={{ width: "100%", maxWidth: 220 }}>
        {/* Background track */}
        <path d={arc(startAngle, startAngle + totalArc)} fill="none" stroke={t.surface} strokeWidth={14} strokeLinecap="round" />
        {/* colored zone segments */}
        {zones.map((z, i) => {
          const prevFrac = i === 0 ? 0 : zones[i - 1].frac;
          const segStart = startAngle + prevFrac * totalArc;
          const segEnd = startAngle + z.frac * totalArc;
          return (
            <path key={i} d={arc(segStart, segEnd)} fill="none" stroke={z.color} strokeWidth={14} opacity={0.18} />
          );
        })}
        {/* Active arc fill up to current BPM */}
        {pct > 0.005 && (
          <path d={arc(startAngle, needleAngle)} fill="none" stroke={zone.color} strokeWidth={14} strokeLinecap="round" style={{ transition: "stroke 0.4s ease" }} />
        )}
        {/* BPM value */}
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize="36" fontWeight="800" fill={zone.color} style={{ fontVariantNumeric: "tabular-nums" }} fontFamily="'DM Sans', monospace" letterSpacing="-1">
          {bpm || "--"}
        </text>
        {/* Zone label */}
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="9" fontWeight="700" fill={t.muted} fontFamily="'DM Sans', monospace" letterSpacing="0.08em">
          {zone.label} / {zone.sublabel}
        </text>
      </svg>
    </div>
  );
}


function getAlerts(latest, t) {
  if (!latest) return [];
  const out = [];
  const bpm = latest?.heart_rate?.bpm_avg ?? 0;
  const temp = latest?.temperature?.celsius ?? 0;
  const mg = motionMagnitude(latest);
  const leads = latest?.heart_rate?.leads_connected;

  const isMoving = mg > 1.2;

  if (isMoving) {
    if (bpm > 185) out.push({ id: `hr-c`, level: "critical", title: "Critical: Active HR Too High", msg: `${fmtBpm(bpm)} bpm - limit 185 bpm` });
    else if (bpm > 165) out.push({ id: `hr-w`, level: "warning", title: "Warning: High Active HR", msg: `${fmtBpm(bpm)} bpm - monitor intensity` });
    else if (bpm > 0 && bpm < 70 && mg > 3.0) out.push({ id: `hr-a`, level: "warning", title: "Anomaly: Low HR vs High Motion", msg: `${fmtBpm(bpm)} bpm despite activity` });

    if (temp > 38.5) out.push({ id: `tp-c`, level: "critical", title: "Critical: High Active Temp", msg: `${fmtTemp(temp)}°C - heat exhaustion risk` });
    else if (temp > 38.0) out.push({ id: `tp-w`, level: "warning", title: "Warning: Elevated Active Temp", msg: `${fmtTemp(temp)}°C - monitor cooling` });
  } else {
    if (bpm > 120) out.push({ id: `hr-c`, level: "critical", title: "Critical: Resting Tachycardia", msg: `${fmtBpm(bpm)} bpm while inactive` });
    else if (bpm > 100) out.push({ id: `hr-w`, level: "warning", title: "Warning: Elevated Resting HR", msg: `${fmtBpm(bpm)} bpm while inactive` });
    else if (bpm > 0 && bpm < 40) out.push({ id: `hr-br`, level: "warning", title: "Warning: Resting Bradycardia", msg: `Unusually low HR: ${fmtBpm(bpm)} bpm` });

    if (temp > 38.0) out.push({ id: `tp-c`, level: "critical", title: "Critical: High Resting Temp", msg: `${fmtTemp(temp)}°C - fever risk` });
    else if (temp > 37.5 && temp > 0) out.push({ id: `tp-w`, level: "warning", title: "Warning: Elevated Resting Temp", msg: `${fmtTemp(temp)}°C - possible illness` });
  }

  if (mg > 11) out.push({ id: `mg-w`, level: "warning", title: "Warning: High Impact Detected", msg: `Shock impact: ${mg.toFixed(1)}g` });
  if (leads === false) out.push({ id: `ld-w`, level: "warning", title: "Warning: ECG Leads Disconnected", msg: "Electrode contact lost - check strap placement" });
  if (!out.length) out.push({ id: `ok`, level: "info", title: "All Systems Normal", msg: "All biometric metrics within healthy ranges" });

  return out;
}

function AlertsPanel({ latest, t, dismissed, setDismissed }) {
  const alerts = useMemo(() => {
    return getAlerts(latest, t).filter((a) => !dismissed.has(a.id));
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
            fontFamily: "'DM Sans', monospace",
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
            fontFamily: "'DM Sans', monospace",
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

function NotificationBell({ history, dismissed, onDismiss, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeCount = history.filter(n => !dismissed.has(n.histId)).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: "8px",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.muted,
          transition: "all 0.2s"
        }}
      >
        <Bell size={18} />
        {activeCount > 0 && (
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
              border: `2px solid ${t.bg}`
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            boxShadow: t.shadowHover,
            zIndex: 1000,
            overflow: "hidden"
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: t.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent Alerts</p>
            <span style={{ fontSize: 10, color: t.faint }}>Latest 10</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {history.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: t.faint }}>No notification history</p>
              </div>
            ) : (
              history.map((n) => {
                const isDismissed = dismissed.has(n.histId);
                return (
                  <div
                    key={n.histId}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${t.border}`,
                      background: isDismissed ? "transparent" : t.accentBg,
                      opacity: isDismissed ? 0.6 : 1,
                      display: "flex",
                      gap: 12,
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onClick={() => {
                      document.getElementById('alerts-panel-section')?.scrollIntoView({ behavior: 'smooth' });
                      setOpen(false);
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 2 }}>{n.title}</p>
                      <p style={{ fontSize: 11, color: t.muted }}>{n.msg}</p>
                      <p style={{ fontSize: 9, color: t.faint, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{n.timestamp}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(n.histId);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: t.faint,
                        height: "fit-content"
                      }}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
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
          fontFamily: "'DM Sans', monospace",
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
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [notificationDismissed, setNotificationDismissed] = useState(new Set());
  const [alertsDismissed, setAlertsDismissed] = useState(new Set());
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

  // Update Notification History
  useEffect(() => {
    if (!latest) return;
    const currentActive = getAlerts(latest, t).filter(a => a.level !== 'info');
    if (currentActive.length === 0) return;

    setNotificationHistory(prev => {
      let updated = [...prev];
      let changed = false;

      currentActive.forEach(alert => {
        // Create a unique-ish ID for this specific occurrence in history
        const histId = `${alert.id}-${latest.timestamp}`;
        if (!updated.some(n => n.histId === histId)) {
          updated.unshift({
            ...alert,
            histId,
            timestamp: new Date().toLocaleTimeString()
          });
          changed = true;
        }
      });

      return changed ? updated.slice(0, 10) : prev;
    });
  }, [latest, t]);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: "'Syne', sans-serif", letterSpacing: "0.02em" }}>LIVE MONITORING</h2>
          <p style={{ fontSize: 11, color: t.muted }}>Real-time biometric data stream</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotificationBell
            history={notificationHistory}
            dismissed={notificationDismissed}
            onDismiss={(id) => setNotificationDismissed(prev => new Set([...prev, id]))}
            t={t}
          />
        </div>
      </div>
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
          fontFamily: "'DM Sans', monospace",
        }}
      >
        {isAdmin ? 'Athlete Select' : 'Connection Sync'}
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
              fontFamily: "'DM Sans', monospace",
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
                    fontFamily: "'DM Sans', monospace",
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
                      fontFamily: "'DM Sans', monospace",
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

        <SessionTimer t={t} />
        <StatusCard athlete={latest} wsConnected={wsConnected} steps={steps} t={t} />
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
          sub={`Range: ${chartData.length ? fmtTemp(Math.min(...chartData.filter(d => d.temp).map(d => d.temp))) : "--"} - ${chartData.length ? fmtTemp(Math.max(...chartData.filter(d => d.temp).map(d => d.temp))) : "--"}°C`}
          color="#f59e0b"
          icon={Thermometer}
          sparkData={chartData}
          sparkKey="temp"
          t={t}
        />
        <StatCard
          title="Steps"
          value={steps ?? "--"}
          unit="steps"
          sub={`Max: ${chartData.length ? Math.max(...chartData.map((d) => d.steps || 0)) : "--"}`}
          color="#8b5cf6"
          icon={Activity}
          sparkData={chartData}
          sparkKey="steps"
          t={t}
        />
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
              fontFamily: "'DM Sans', monospace",
            }}
          >
            HR Gauge
          </p>
          <HeartRateGauge value={bpm} max={220} isResting={mg < 1.2} t={t} />
        </div>

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
                fontFamily: "'DM Sans', monospace",
              }}
            >
              Motion Live Chart
            </p>
            <span
              style={{
                fontSize: 9,
                color: t.faint,
                fontFamily: "'DM Sans', monospace",
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
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mgArea2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
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
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Sans', monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 9,
                  fill: t.faint,
                  fontFamily: "'DM Sans', monospace",
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
                  fontFamily: "'DM Sans', monospace",
                }}
              />
              <Area
                type="monotone"
                dataKey="mg"
                name="Acceleration"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#mgAreaGrad)"
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
              fontFamily: "'DM Sans', monospace",
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
              fontFamily: "'DM Sans', monospace",
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
                  fontFamily: "'DM Sans', monospace",
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
                  fontFamily: "'DM Sans', monospace",
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
                  fontFamily: "'DM Sans', monospace",
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
                  fontFamily: "'DM Sans', monospace",
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
                  fontFamily: "'DM Sans', monospace",
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
                fontFamily: "'DM Sans', monospace",
              }}
            >
              Breathing Rate Live
            </p>
            <span
              style={{
                fontSize: 9,
                color: t.faint,
                fontFamily: "'DM Sans', monospace",
              }}
            >
              Normal: 12-20 rpm
            </span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="brLiveGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fontFamily: "'DM Sans', monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 50]}
                tick={{
                  fontSize: 8,
                  fill: t.faint,
                  fontFamily: "'DM Sans', monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={28}
                label={{
                  value: "br/min",
                  angle: -90,
                  position: "insideLeft",
                  fill: t.faint,
                  fontSize: 8,
                  dx: -8,
                }}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <ReferenceLine
                y={12}
                stroke="#10b98150"
                strokeDasharray="4 3"
                label={{ value: "Low", position: "right", fontSize: 7, fill: "#10b981", fontFamily: "'DM Sans', monospace" }}
              />
              <ReferenceLine
                y={20}
                stroke="#10b98150"
                strokeDasharray="4 3"
                label={{ value: "Normal", position: "right", fontSize: 7, fill: "#10b981", fontFamily: "'DM Sans', monospace" }}
              />
              <ReferenceLine
                y={30}
                stroke="#f59e0b50"
                strokeDasharray="4 3"
                label={{ value: "High", position: "right", fontSize: 7, fill: "#f59e0b", fontFamily: "'DM Sans', monospace" }}
              />
              <Area
                type="monotone"
                dataKey="resp"
                name="Breathing Rate"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#brLiveGrad)"
                dot={false}
                isAnimationActive={false}
                unit=" rpm"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        id="alerts-panel-section"
        className="card-fadein"
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: "1.25rem",
          boxShadow: t.shadow,
        }}
      >
        <AlertsPanel 
          latest={latest} 
          t={t} 
          dismissed={alertsDismissed}
          setDismissed={(d) => setAlertsDismissed(new Set([...alertsDismissed, ...d]))}
        />
      </div>
    </main>
  );
}
