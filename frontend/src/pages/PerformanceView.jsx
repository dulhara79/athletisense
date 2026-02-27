import { useMemo } from 'react';
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, AreaChart, Area
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-premium-200 rounded-xl p-3 text-xs shadow-premium-hover relative z-50">
      <p className="text-premium-500 font-bold mb-1.5 font-mono tracking-wider">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-bold flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
          {p.name}: <span className="text-premium-900 ml-auto">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function PerformanceView({ athleteId, getAthleteData }) {
  const records = getAthleteData(athleteId);

  const stats = useMemo(() => {
    if (!records.length) return null;
    const hrs = records.map(r => r.MAX30102_Heart_Rate_bpm);
    const motions = records.map(r => r.Motion_Magnitude);
    const temps = records.map(r => r.DS18B20_Skin_Temperature_C);
    const forces = records.map(r => r.StrainGauge_Force_N);
    const fatigues = records.map(r => r.Fatigue_Index * 100);

    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const max = arr => Math.max(...arr);
    const min = arr => Math.min(...arr);

    return {
      hr: { avg: avg(hrs), max: max(hrs), min: min(hrs) },
      motion: { avg: avg(motions), max: max(motions), min: min(motions) },
      temp: { avg: avg(temps), max: max(temps), min: min(temps) },
      force: { avg: avg(forces), max: max(forces), min: min(forces) },
      fatigue: { avg: avg(fatigues), max: max(fatigues), min: min(fatigues) }
    };
  }, [records]);

  // Define light theme chart colors
  const chartColors = {
    grid: '#e2e8f0', // slate-200
    text: '#64748b', // slate-500
    hr: '#ef4444', // red-500
    hrMax: '#f59e0b', // amber-500 (used for Max HR previously) - actually let's stick to the roles
    motion: '#6366f1', // indigo-500
    temp: '#f59e0b', // amber-500
    force: '#10b981', // emerald-500
    fatigue: '#8b5cf6', // violet-500
  };

  const hrZones = useMemo(() => {
    if (!records.length) return [];
    const zones = [
      { name: 'Rest\n<100', count: 0, color: '#10b981' }, // emerald-500
      { name: 'Warm\n100-120', count: 0, color: '#0ea5e9' }, // sky-500
      { name: 'Aerobic\n120-140', count: 0, color: '#f59e0b' }, // amber-500
      { name: 'Threshold\n140-160', count: 0, color: '#f97316' }, // orange-500
      { name: 'Max\n>160', count: 0, color: '#ef4444' } // red-500
    ];
    records.forEach(r => {
      const hr = r.MAX30102_Heart_Rate_bpm;
      if (hr < 100) zones[0].count++;
      else if (hr < 120) zones[1].count++;
      else if (hr < 140) zones[2].count++;
      else if (hr < 160) zones[3].count++;
      else zones[4].count++;
    });
    return zones;
  }, [records]);

  const radarData = useMemo(() => {
    if (!stats) return [];
    return [
      { metric: 'HR Endurance', value: Math.min(100, (1 - stats.hr.avg / 200) * 100) },
      { metric: 'Motion Output', value: Math.min(100, (stats.motion.avg / 15) * 100) },
      { metric: 'Stability', value: Math.min(100, 100 - stats.fatigue.avg) },
      { metric: 'Temperature Ctrl', value: Math.min(100, (1 - (stats.temp.avg - 32) / 8) * 100) },
      { metric: 'Force Output', value: Math.min(100, (stats.force.avg / 100) * 100) }
    ];
  }, [stats]);

  const trendData = useMemo(() => {
    return records.slice(-30).map((r, i) => ({
      sample: i + 1,
      fatigue: +(r.Fatigue_Index * 100).toFixed(1),
      hr: +r.MAX30102_Heart_Rate_bpm.toFixed(0),
      motion: +r.Motion_Magnitude.toFixed(2)
    }));
  }, [records]);

  if (!stats) return (
    <div className="flex items-center justify-center h-64 text-premium-400 font-mono text-sm font-bold tracking-widest uppercase bg-card rounded-2xl border border-premium-200 border-dashed">
      No performance data available
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Avg HR', value: stats.hr.avg.toFixed(0), unit: 'bpm', color: chartColors.hr },
          { label: 'Max HR', value: stats.hr.max.toFixed(0), unit: 'bpm', color: '#f97316' }, // orange
          { label: 'Avg Motion', value: stats.motion.avg.toFixed(2), unit: 'g', color: chartColors.motion },
          { label: 'Peak Force', value: stats.force.max.toFixed(1), unit: 'N', color: chartColors.force },
          { label: 'Max Fatigue', value: stats.fatigue.max.toFixed(1), unit: '%', color: chartColors.fatigue }
        ].map(s => (
          <div key={s.label} className="card text-center bg-card shadow-sm border-premium-200 hover:shadow-premium-hover transition-all duration-300 transform hover:-translate-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-1">{s.label}</p>
            <p className="font-mono text-2xl font-black tracking-tight" style={{ color: s.color }}>
              {s.value}<span className="text-xs font-bold text-premium-400 ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* HR Zones + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Heart Rate Zone Distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hrZones} margin={{ left: -20, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: chartColors.grid, opacity: 0.4 }} />
              <Bar dataKey="count" name="Records" radius={[6, 6, 0, 0]} maxBarSize={50}>
                {hrZones.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Performance Radar</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
              <PolarGrid stroke={chartColors.grid} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} />
              <Radar name="Athlete" dataKey="value" stroke={chartColors.motion} fill={chartColors.motion} fillOpacity={0.2} strokeWidth={3} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fatigue trend */}
      <div className="card bg-card shadow-sm border-premium-200">
        <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Fatigue & HR Trend Over Session</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trendData} margin={{ left: -20, right: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.fatigue} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.fatigue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="sample" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis yAxisId="fatigue" tick={{ fill: chartColors.fatigue, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis yAxisId="hr" orientation="right" tick={{ fill: chartColors.hr, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.grid, strokeWidth: 2, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
            <Area yAxisId="fatigue" type="monotone" dataKey="fatigue" stroke={chartColors.fatigue}
              fill="url(#fatigueGrad)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: chartColors.fatigue }} name="Fatigue %" />
            <Area yAxisId="hr" type="monotone" dataKey="hr" stroke={chartColors.hr}
              fill="none" strokeWidth={2} dot={false} name="HR (bpm)" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats table */}
      <div className="card bg-card shadow-sm border-premium-200 overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Statistical Summary</p>
        <table className="w-full text-sm font-medium">
          <thead>
            <tr className="border-b border-premium-100 bg-surface/50">
              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-premium-500 rounded-tl-lg">Metric</th>
              <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-premium-500">Min</th>
              <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-premium-500">Avg</th>
              <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-premium-500 rounded-tr-lg">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-premium-100">
            {[
              { name: 'Heart Rate (bpm)', s: stats.hr, color: chartColors.hr },
              { name: 'Motion Magnitude (g)', s: stats.motion, color: chartColors.motion },
              { name: 'Skin Temp (°C)', s: stats.temp, color: chartColors.temp },
              { name: 'Strain Force (N)', s: stats.force, color: chartColors.force },
              { name: 'Fatigue Index (%)', s: stats.fatigue, color: chartColors.fatigue }
            ].map(row => (
              <tr key={row.name} className="hover:bg-surface/50 transition-colors">
                <td className="py-3 px-4 font-bold flex items-center gap-2" style={{ color: row.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }}></span>
                  {row.name}
                </td>
                <td className="text-right py-3 px-4 text-premium-500 font-mono">{row.s.min.toFixed(2)}</td>
                <td className="text-right py-3 px-4 text-premium-900 font-bold font-mono text-base">{row.s.avg.toFixed(2)}</td>
                <td className="text-right py-3 px-4 text-premium-500 font-mono">{row.s.max.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
