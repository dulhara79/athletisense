import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

function generateAlerts(athleteId, latest) {
  if (!latest) return [];
  const alerts = [];
  const ts = new Date().toLocaleTimeString();

  if (latest.MAX30102_Heart_Rate_bpm > 175) {
    alerts.push({
      id: `hr-${ts}`, level: 'critical',
      message: `CRITICAL: HR Above Threshold (175bpm) — Current: ${latest.MAX30102_Heart_Rate_bpm.toFixed(0)}bpm`,
      time: ts, athleteId
    });
  } else if (latest.MAX30102_Heart_Rate_bpm > 155) {
    alerts.push({
      id: `hr-warn-${ts}`, level: 'warning',
      message: `WARNING: Elevated Heart Rate — ${latest.MAX30102_Heart_Rate_bpm.toFixed(0)}bpm`,
      time: ts, athleteId
    });
  }

  if (latest.Motion_Magnitude > 11) {
    alerts.push({
      id: `motion-${ts}`, level: 'warning',
      message: `WARNING: High Impact Detected — Motion: ${latest.Motion_Magnitude.toFixed(2)}g`,
      time: ts, athleteId
    });
  }

  if (latest.DS18B20_Skin_Temperature_C > 38) {
    alerts.push({
      id: `temp-${ts}`, level: 'warning',
      message: `WARNING: High Skin Temperature — ${latest.DS18B20_Skin_Temperature_C.toFixed(1)}°C`,
      time: ts, athleteId
    });
  }

  if (latest.Fatigue_Index > 0.7) {
    alerts.push({
      id: `fatigue-${ts}`, level: 'critical',
      message: `CRITICAL: High Fatigue Index — ${(latest.Fatigue_Index * 100).toFixed(0)}%`,
      time: ts, athleteId
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `ok-${ts}`, level: 'info',
      message: `INFO: All metrics within normal range — Session active`,
      time: ts, athleteId
    });
  }

  return alerts;
}

const icons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

// These map to updated index.css classes
const styles = {
  critical: 'alert-critical',
  warning: 'alert-warning',
  info: 'alert-info'
};

const dotColors = {
  critical: 'bg-accent-danger',
  warning: 'bg-accent-warning',
  info: 'bg-accent-primary'
};

export default function AlertsPanel({ athleteId, latest }) {
  const [dismissed, setDismissed] = useState(new Set());
  const alerts = generateAlerts(athleteId, latest).filter(a => !dismissed.has(a.id));

  return (
    <div className="card bg-card shadow-sm border-premium-200">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-premium-500">Alerts Panel</p>
        <span className="text-xs font-bold font-mono text-premium-400 bg-surface-muted px-2 py-0.5 rounded-md">{alerts.length} active</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {alerts.map(alert => {
          const Icon = icons[alert.level];
          return (
            <div key={alert.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full shadow-sm hover:shadow transition-shadow ${styles[alert.level]}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[alert.level]} animate-pulse`} />
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1 text-premium-900 font-bold">{alert.message}</span>
              <span className="text-premium-500 font-mono font-bold text-xs whitespace-nowrap bg-card/50 px-2 py-1 rounded-md">{alert.time}</span>
              <button onClick={() => setDismissed(d => new Set([...d, alert.id]))}
                className="opacity-40 hover:opacity-100 hover:text-accent-danger transition-all flex-shrink-0 p-1 hover:bg-card/50 rounded-md">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
