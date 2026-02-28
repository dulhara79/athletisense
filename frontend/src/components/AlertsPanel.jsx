import { AlertTriangle, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

function generateAlerts(athleteId, latest) {
  if (!latest) return [];
  const alerts = [];
  const ts = new Date().toLocaleTimeString();

  if (latest.MAX30102_Heart_Rate_bpm > 175) {
    alerts.push({
      id: `hr-${ts}`, level: 'critical',
      title: 'Critical: HR Threshold Exceeded',
      message: `Current: ${latest.MAX30102_Heart_Rate_bpm.toFixed(0)} bpm  ·  Limit: 175 bpm`,
      time: ts, athleteId
    });
  } else if (latest.MAX30102_Heart_Rate_bpm > 155) {
    alerts.push({
      id: `hr-warn-${ts}`, level: 'warning',
      title: 'Warning: Elevated Heart Rate',
      message: `${latest.MAX30102_Heart_Rate_bpm.toFixed(0)} bpm — approaching threshold`,
      time: ts, athleteId
    });
  }

  if (latest.Motion_Magnitude > 11) {
    alerts.push({
      id: `motion-${ts}`, level: 'warning',
      title: 'Warning: High Impact Detected',
      message: `Motion magnitude: ${latest.Motion_Magnitude.toFixed(2)}g`,
      time: ts, athleteId
    });
  }

  if (latest.DS18B20_Skin_Temperature_C > 38) {
    alerts.push({
      id: `temp-${ts}`, level: 'warning',
      title: 'Warning: High Skin Temperature',
      message: `${latest.DS18B20_Skin_Temperature_C.toFixed(1)}°C — heat risk present`,
      time: ts, athleteId
    });
  }

  if (latest.Fatigue_Index > 0.7) {
    alerts.push({
      id: `fatigue-${ts}`, level: 'critical',
      title: 'Critical: High Fatigue Index',
      message: `${(latest.Fatigue_Index * 100).toFixed(0)}% — consider rest protocol`,
      time: ts, athleteId
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `ok-${ts}`, level: 'info',
      title: 'All Systems Normal',
      message: 'All biometric metrics within healthy range — session active',
      time: ts, athleteId
    });
  }

  return alerts;
}

const ICON_MAP = { critical: AlertCircle, warning: AlertTriangle, info: Info };

const LEVEL_CONFIG = {
  critical: {
    wrapperClass: 'alert-critical',
    iconColor: 'var(--accent-rose)',
    dotClass: 'bg-rose-500',
    badgeClass: 'badge-danger',
    label: 'CRITICAL',
    pulse: true,
  },
  warning: {
    wrapperClass: 'alert-warning',
    iconColor: 'var(--accent-amber)',
    dotClass: 'bg-amber-500',
    badgeClass: 'badge-warning',
    label: 'WARNING',
    pulse: true,
  },
  info: {
    wrapperClass: 'alert-info',
    iconColor: 'var(--accent-indigo)',
    dotClass: 'bg-indigo-500',
    badgeClass: 'badge-primary',
    label: 'INFO',
    pulse: false,
  },
};

function AlertItem({ alert, onDismiss, index }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const config = LEVEL_CONFIG[alert.level];
  const Icon = ICON_MAP[alert.level];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(alert.id), 280);
  };

  return (
    <div
      className={`${config.wrapperClass} rounded-2xl overflow-hidden`}
      style={{
        opacity: visible ? (exiting ? 0 : 1) : 0,
        transform: visible ? (exiting ? 'translateX(12px) scale(0.97)' : 'translateX(0) scale(1)') : 'translateX(-10px) scale(0.97)',
        transition: 'opacity 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.175,0.885,0.32,1.275)',
        boxShadow: alert.level === 'critical'
          ? '0 4px 20px rgba(225,29,72,0.12), 0 1px 4px rgba(225,29,72,0.08)'
          : alert.level === 'warning'
          ? '0 4px 20px rgba(217,119,6,0.10), 0 1px 4px rgba(217,119,6,0.08)'
          : '0 2px 12px rgba(79,70,229,0.08)',
      }}
    >
      {/* Accent bar left */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: alert.level === 'critical'
            ? 'linear-gradient(to bottom, var(--accent-rose), rgba(225,29,72,0.4))'
            : alert.level === 'warning'
            ? 'linear-gradient(to bottom, var(--accent-amber), rgba(217,119,6,0.4))'
            : 'linear-gradient(to bottom, var(--accent-indigo), rgba(79,70,229,0.4))',
          borderRadius: '0 3px 3px 0',
        }}
      />

      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        {/* Dot + Icon */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClass}`}
            style={config.pulse ? { animation: 'live-blink 1.6s ease-in-out infinite' } : {}}
          />
          <Icon size={16} style={{ color: config.iconColor, flexShrink: 0 }} strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md ${config.badgeClass}`}
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {config.label}
            </span>
          </div>
          <p
            className="text-xs font-bold mb-0.5"
            style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {alert.title}
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {alert.message}
          </p>
        </div>

        {/* Time + Dismiss */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-faint)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,29,72,0.10)'; e.currentTarget.style.color = 'var(--accent-rose)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
            aria-label="Dismiss alert"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, fontWeight: 500,
              color: 'var(--text-faint)',
              background: 'var(--bg-surface-alt)',
              padding: '2px 6px', borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap',
            }}
          >
            {alert.time}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPanel({ athleteId, latest }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  const alerts = generateAlerts(athleteId, latest).filter(a => !dismissed.has(a.id));

  useEffect(() => { setMounted(true); }, []);

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  return (
    <div
      className="card"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4" style={{ gap: '0.75rem' }}>
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 30, height: 30, borderRadius: 9,
              background: criticalCount > 0
                ? 'rgba(225,29,72,0.12)'
                : warningCount > 0
                ? 'rgba(217,119,6,0.12)'
                : 'rgba(79,70,229,0.10)',
              border: `1px solid ${criticalCount > 0
                ? 'rgba(225,29,72,0.22)'
                : warningCount > 0
                ? 'rgba(217,119,6,0.22)'
                : 'rgba(79,70,229,0.18)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ShieldAlert
              size={15}
              style={{
                color: criticalCount > 0
                  ? 'var(--accent-rose)'
                  : warningCount > 0
                  ? 'var(--accent-amber)'
                  : 'var(--accent-indigo)',
              }}
              strokeWidth={2.5}
            />
          </div>
          <div>
            <p className="metric-label">Alerts Panel</p>
          </div>
        </div>

        {/* Counts */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {criticalCount > 0 && (
            <span className="badge-danger" style={{ fontSize: 10, padding: '3px 9px', borderRadius: 8, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}>
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="badge-warning" style={{ fontSize: 10, padding: '3px 9px', borderRadius: 8, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}>
              {warningCount} warning
            </span>
          )}
          {alerts.length === 0 && (
            <span className="badge-success" style={{ fontSize: 10, padding: '3px 9px', borderRadius: 8, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}>
              all clear
            </span>
          )}
        </div>
      </div>

      {/* Alerts list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.length === 0 ? (
          <div
            style={{
              textAlign: 'center', padding: '2rem 1rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              borderRadius: 14,
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <Info size={20} style={{ margin: '0 auto 8px', color: 'var(--accent-indigo)', opacity: 0.5 }} />
            <p style={{ fontSize: 12, fontWeight: 600 }}>No active alerts</p>
            <p style={{ fontSize: 11, marginTop: 3, color: 'var(--text-faint)' }}>All metrics within normal range</p>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              index={i}
              onDismiss={id => setDismissed(d => new Set([...d, id]))}
            />
          ))
        )}
      </div>
    </div>
  );
}
