import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

function generateAlerts(athleteId, latest) {
  if (!latest) return [];
  const alerts = [];
  const ts = new Date().toLocaleTimeString();

  const bpm = latest.AD8232_Heart_Rate_bpm || 0;
  const mg = latest.Motion_Magnitude || 0;
  const temp = latest.DS18B20_Skin_Temperature_C || 0;

  const isMoving = mg > 1.2;

  if (isMoving) {
    if (bpm > 185) alerts.push({ id: `hr-c-${ts}`, level: 'critical', message: `CRITICAL: Active HR Above Limit - ${bpm.toFixed(0)}bpm`, time: ts, athleteId });
    else if (bpm > 165) alerts.push({ id: `hr-w-${ts}`, level: 'warning', message: `WARNING: High Active HR - ${bpm.toFixed(0)}bpm`, time: ts, athleteId });
    else if (bpm > 0 && bpm < 70 && mg > 3.0) alerts.push({ id: `hr-a-${ts}`, level: 'warning', message: `ANOMALY: Low HR vs High Motion - ${bpm.toFixed(0)}bpm`, time: ts, athleteId });

    if (temp > 38.5) alerts.push({ id: `tp-c-${ts}`, level: 'critical', message: `CRITICAL: High Active Skin Temp - ${temp.toFixed(1)}°C`, time: ts, athleteId });
    else if (temp > 38.0) alerts.push({ id: `tp-w-${ts}`, level: 'warning', message: `WARNING: Elevated Active Temp - ${temp.toFixed(1)}°C`, time: ts, athleteId });
  } else {
    if (bpm > 120) alerts.push({ id: `hr-c-${ts}`, level: 'critical', message: `CRITICAL: Resting Tachycardia - ${bpm.toFixed(0)}bpm`, time: ts, athleteId });
    else if (bpm > 100) alerts.push({ id: `hr-w-${ts}`, level: 'warning', message: `WARNING: Elevated Resting HR - ${bpm.toFixed(0)}bpm`, time: ts, athleteId });
    else if (bpm > 0 && bpm < 40) alerts.push({ id: `hr-br-${ts}`, level: 'warning', message: `WARNING: Resting Bradycardia - ${bpm.toFixed(0)}bpm`, time: ts, athleteId });

    if (temp > 38.0) alerts.push({ id: `tp-c-${ts}`, level: 'critical', message: `CRITICAL: High Resting Fever Temp - ${temp.toFixed(1)}°C`, time: ts, athleteId });
    else if (temp > 37.5 && temp > 0) alerts.push({ id: `tp-w-${ts}`, level: 'warning', message: `WARNING: Elevated Resting Temp - ${temp.toFixed(1)}°C`, time: ts, athleteId });
  }

  if (mg > 11) alerts.push({ id: `motion-${ts}`, level: 'warning', message: `WARNING: High Impact Detected - Motion: ${mg.toFixed(2)}g`, time: ts, athleteId });
  if (latest.Fatigue_Index > 0.7) alerts.push({ id: `fatigue-${ts}`, level: 'critical', message: `CRITICAL: High Fatigue Index - ${(latest.Fatigue_Index * 100).toFixed(0)}%`, time: ts, athleteId });

  if (alerts.length === 0) alerts.push({ id: `ok-${ts}`, level: 'info', message: `INFO: All metrics within normal range - Session active`, time: ts, athleteId });

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
