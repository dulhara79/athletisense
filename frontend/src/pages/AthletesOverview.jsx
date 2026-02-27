import { useMemo, useState } from 'react';
import { Activity, Heart, Thermometer, Zap, Users } from 'lucide-react';

function StatusBadge({ value, thresholds, unit }) {
  const [warn, crit] = thresholds;
  const status = value > crit ? 'critical' : value > warn ? 'warning' : 'normal';
  const styles = {
    critical: 'bg-rose-50 text-accent-danger border border-rose-200',
    warning: 'bg-amber-50 text-accent-warning border border-amber-200',
    normal: 'bg-emerald-50 text-accent-success border border-emerald-200'
  };
  return (
    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${styles[status]}`}>
      {typeof value === 'number' ? value.toFixed(1) : value}{unit}
    </span>
  );
}

export default function AthletesOverview({ summary, liveData, onSelectAthlete }) {
  const [filter, setFilter] = useState('');

  const filteredSummary = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return summary;
    return summary.filter(s => {
      const id = (s.id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      const sport = (s.sport || '').toLowerCase();
      return id.includes(q) || name.includes(q) || sport.includes(q);
    });
  }, [summary, filter]);

  const athletes = filteredSummary.map(s => s.id);

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card text-center bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-1">Active Athletes</p>
          <p className="font-mono text-3xl font-black text-accent-primary">{athletes.length}</p>
        </div>
        <div className="card text-center bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-1">Alerts</p>
          <p className="font-mono text-3xl font-black text-accent-warning">
            {summary.filter(s => s.latestHR > 175 || s.latestFatigue > 0.7).length}
          </p>
        </div>
        <div className="card text-center bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-1">Avg Team HR</p>
          <p className="font-mono text-3xl font-black text-accent-danger">
            {summary.length ? (summary.reduce((a, s) => a + s.latestHR, 0) / summary.length).toFixed(0) : '--'}
            <span className="text-sm text-premium-400 ml-1 font-semibold">bpm</span>
          </p>
        </div>
        <div className="card text-center bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-1">Avg Fatigue</p>
          <p className="font-mono text-3xl font-black text-accent-purple">
            {summary.length ? (summary.reduce((a, s) => a + s.latestFatigue, 0) / summary.length * 100).toFixed(1) : '--'}
            <span className="text-sm text-premium-400 ml-1 font-semibold">%</span>
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter athletes by name, ID or sport"
          className="w-full max-w-sm bg-surface border border-premium-200 rounded-xl px-4 py-2 text-sm text-premium-700 placeholder-premium-400 focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
        />
      </div>

      {/* Athlete cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {athletes.map(id => {
          const s = summary.find(x => x.id === id) || {};
          const records = liveData[id] || [];
          const latest = records[records.length - 1] || s.latestRecord || null;
          const info = { name: s.name || id, sport: s.sport || 'Athlete', avatar: (s.name || id).split(' ').map(p => p[0]).slice(0, 2).join('') };

          return (
            <div key={id}
              className="card bg-card shadow-sm border-premium-200 hover:border-accent-primary/50 hover:shadow-premium-hover transition-all duration-300 cursor-pointer group"
              onClick={() => onSelectAthlete(id)}>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface-primary border border-indigo-100 flex items-center justify-center text-sm font-black text-accent-primary font-mono shadow-sm group-hover:bg-accent-primary group-hover:text-white transition-colors duration-300">
                  {info.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-premium-900 group-hover:text-accent-primary transition-colors">{info.name} {s.dataPoints === 0 && (<span className="text-xs font-medium text-premium-400 ml-2">(no data)</span>)}</p>
                  <p className="text-xs font-medium text-premium-500">{id} · {info.sport}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-success px-2.5 py-1 rounded-full border border-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold tracking-wider text-accent-success font-mono uppercase">LIVE</span>
                </div>
              </div>

              {/* Metrics grid */}
              {latest ? (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-surface border border-premium-100 rounded-xl p-2.5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-1.5 flex items-center gap-1">
                      <Heart size={12} className="text-accent-danger" /> Heart Rate
                    </p>
                    <StatusBadge value={latest.MAX30102_Heart_Rate_bpm} thresholds={[150, 175]} unit="bpm" />
                  </div>
                  <div className="bg-surface border border-premium-100 rounded-xl p-2.5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-1.5 flex items-center gap-1">
                      <Thermometer size={12} className="text-accent-warning" /> Skin Temp
                    </p>
                    <StatusBadge value={latest.DS18B20_Skin_Temperature_C} thresholds={[37, 38]} unit="°C" />
                  </div>
                  <div className="bg-surface border border-premium-100 rounded-xl p-2.5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-1.5 flex items-center gap-1">
                      <Zap size={12} className="text-accent-primary" /> Motion
                    </p>
                    <StatusBadge value={latest.Motion_Magnitude} thresholds={[9, 12]} unit="g" />
                  </div>
                  <div className="bg-surface border border-premium-100 rounded-xl p-2.5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-1.5 flex items-center gap-1">
                      <Activity size={12} className="text-accent-purple" /> Fatigue
                    </p>
                    <StatusBadge value={latest.Fatigue_Index * 100} thresholds={[40, 70]} unit="%" />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-premium-400 font-mono py-4 text-center font-medium bg-surface rounded-xl mb-4 border border-premium-100 border-dashed">Awaiting data...</div>
              )}

              {/* Mini bar indicators */}
              {s && (
                <div className="space-y-2">
                  {[
                    { label: 'HR', value: s.latestHR, max: 200, color: '#ef4444', bg: 'bg-rose-100' },
                    { label: 'Motion', value: s.latestMotion * 6.67, max: 100, color: '#4f46e5', bg: 'bg-indigo-100' },
                    { label: 'Fatigue', value: s.latestFatigue * 100, max: 100, color: '#8b5cf6', bg: 'bg-violet-100' }
                  ].map(bar => (
                    <div key={bar.label} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-premium-500 w-12 text-right">{bar.label}</span>
                      <div className={`flex-1 ${bar.bg} rounded-full h-2 overflow-hidden`}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (bar.value / bar.max) * 100)}%`,
                            backgroundColor: bar.color
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-black font-mono text-premium-700 w-10 text-right">
                        {bar.value.toFixed(0)}{bar.label === 'Motion' ? 'g' : '%'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs font-bold text-premium-400 mt-4 group-hover:text-accent-primary transition-colors text-right flex items-center justify-end gap-1">
                View Full Dashboard <span className="group-hover:translate-x-1 transition-transform">→</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
