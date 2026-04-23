// src/components/shared.jsx
// ─────────────────────────────────────────────────────────────
// Consolidates: MetricCard, MotionGauge, AlertsPanel
// Import individually: import { MetricCard, MotionGauge, AlertsPanel } from './shared'
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";

// ── MetricCard ────────────────────────────────────────────────
export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  color = "primary",
  sub,
  trend,
  t,
}) {
  const palette = {
    primary: { text: t.accent, bg: t.accentBg, border: t.border },
    success: { text: t.success, bg: t.successBg, border: t.border },
    warning: { text: t.warning, bg: t.warningBg, border: t.border },
    danger: { text: t.danger, bg: t.dangerBg, border: t.border },
    purple: { text: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: t.border },
  };
  const c = palette[color] || palette.primary;

  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "1rem 1.25rem",
        boxShadow: t.shadow,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Top accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${c.text}80, transparent)`,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: t.muted,
          }}
        >
          {label}
        </p>
        {Icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={16} color={c.text} />
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 28,
            fontWeight: 900,
            color: c.text,
            letterSpacing: "-1px",
          }}
        >
          {typeof value === "number"
            ? value.toFixed(value > 100 ? 0 : 1)
            : (value ?? "--")}
        </span>
        {unit && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: t.muted,
              marginBottom: 4,
            }}
          >
            {unit}
          </span>
        )}
        {trend !== undefined && (
          <span
            style={{
              marginLeft: "auto",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 2,
              fontSize: 12,
              fontWeight: 700,
              color: trend >= 0 ? t.success : t.danger,
            }}
          >
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          </span>
        )}
      </div>

      {sub && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: t.muted,
            background: t.surface,
            borderRadius: 6,
            padding: "2px 8px",
            display: "inline-block",
            border: `1px solid ${t.border}`,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ── MotionGauge ───────────────────────────────────────────────
export function MotionGauge({ value = 0, max = 15, t }) {
  const pct = Math.min(value / max, 1);
  const color = pct < 0.33 ? "#10b981" : pct < 0.66 ? "#f59e0b" : "#ef4444";
  const score = (pct * 10).toFixed(1);

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: t.muted,
          marginBottom: 4,
          alignSelf: "flex-start",
          marginLeft: 16,
        }}
      >
        Motion Gauge
      </p>
      <svg viewBox="0 0 160 120" style={{ width: "100%", maxWidth: 200 }}>
        <path
          d={arc(270, 450)}
          fill="none"
          stroke={t.surface2 || "#e2e8f0"}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={arc(270, 270 + pct * 180)}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            style={{ transition: "all 0.8s cubic-bezier(0.4,0,0.2,1)" }}
          />
        )}
        <text
          x="80"
          y="100"
          fill={color}
          fontSize="36"
          fontWeight="900"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          textAnchor="middle"
        >
          {score}
        </text>
        <text
          x="80"
          y="115"
          fill={t.muted}
          fontSize="9"
          fontWeight="800"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          textAnchor="middle"
          letterSpacing="1"
        >
          INTENSITY
        </text>
      </svg>
    </div>
  );
}

// ── AlertsPanel ───────────────────────────────────────────────
function generateAlerts(athleteId, latest) {
  if (!latest) return [];
  const ts = new Date().toLocaleTimeString();
  const bpm = latest.AD8232_Heart_Rate_bpm || 0;
  const mg = latest.Motion_Magnitude || 0;
  const temp = latest.DS18B20_Skin_Temperature_C || 0;
  const fat = latest.Fatigue_Index || 0;
  const isMoving = mg > 1.2;
  const alerts = [];

  if (isMoving) {
    if (bpm > 185)
      alerts.push({
        level: "critical",
        message: `CRITICAL: Active HR Above Limit — ${bpm.toFixed(0)} bpm`,
      });
    else if (bpm > 165)
      alerts.push({
        level: "warning",
        message: `WARNING: High Active HR — ${bpm.toFixed(0)} bpm`,
      });
    else if (bpm > 0 && bpm < 70 && mg > 3)
      alerts.push({
        level: "warning",
        message: `ANOMALY: Low HR vs High Motion — ${bpm.toFixed(0)} bpm`,
      });
    if (temp > 38.5)
      alerts.push({
        level: "critical",
        message: `CRITICAL: High Active Skin Temp — ${temp.toFixed(1)} °C`,
      });
    else if (temp > 38.0)
      alerts.push({
        level: "warning",
        message: `WARNING: Elevated Active Temp — ${temp.toFixed(1)} °C`,
      });
  } else {
    if (bpm > 120)
      alerts.push({
        level: "critical",
        message: `CRITICAL: Resting Tachycardia — ${bpm.toFixed(0)} bpm`,
      });
    else if (bpm > 100)
      alerts.push({
        level: "warning",
        message: `WARNING: Elevated Resting HR — ${bpm.toFixed(0)} bpm`,
      });
    else if (bpm > 0 && bpm < 40)
      alerts.push({
        level: "warning",
        message: `WARNING: Resting Bradycardia — ${bpm.toFixed(0)} bpm`,
      });
    if (temp > 38.0)
      alerts.push({
        level: "critical",
        message: `CRITICAL: Fever Temp — ${temp.toFixed(1)} °C`,
      });
    else if (temp > 37.5)
      alerts.push({
        level: "warning",
        message: `WARNING: Elevated Resting Temp — ${temp.toFixed(1)} °C`,
      });
  }

  if (mg > 11)
    alerts.push({
      level: "warning",
      message: `WARNING: High Impact Detected — ${mg.toFixed(2)} g`,
    });
  if (fat > 0.7)
    alerts.push({
      level: "critical",
      message: `CRITICAL: High Fatigue Index — ${(fat * 100).toFixed(0)}%`,
    });
  if (!alerts.length)
    alerts.push({
      level: "info",
      message: "INFO: All metrics within normal range",
    });

  return alerts.map((a, i) => ({
    ...a,
    id: `${athleteId}-${a.level}-${i}-${ts}`,
    time: ts,
    athleteId,
  }));
}

const ALERT_ICON = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function AlertsPanel({ athleteId, latest, t }) {
  const [dismissed, setDismissed] = useState(new Set());
  const alerts = generateAlerts(athleteId, latest).filter(
    (a) => !dismissed.has(a.id),
  );

  const bgFor = (lvl) =>
    lvl === "critical"
      ? t.dangerBg
      : lvl === "warning"
        ? t.warningBg
        : t.accentBg;
  const clFor = (lvl) =>
    lvl === "critical" ? t.danger : lvl === "warning" ? t.warning : t.accent;

  return (
    <div
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
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: t.muted,
          }}
        >
          Alerts Panel
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: t.muted,
            background: t.surface,
            borderRadius: 6,
            padding: "2px 8px",
            border: `1px solid ${t.border}`,
          }}
        >
          {alerts.length} active
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((alert) => {
          const Icon = ALERT_ICON[alert.level];
          const col = clFor(alert.level);
          return (
            <div
              key={alert.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background: bgFor(alert.level),
                border: `1px solid ${col}25`,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: col,
                  flexShrink: 0,
                  animation: "pulse-dot 1.6s ease-in-out infinite",
                }}
              />
              <Icon size={14} color={col} style={{ flexShrink: 0 }} />
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 700,
                  color: t.text,
                }}
              >
                {alert.message}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: t.muted,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {alert.time}
              </span>
              <button
                onClick={() => setDismissed((d) => new Set([...d, alert.id]))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  opacity: 0.5,
                  color: t.muted,
                }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
