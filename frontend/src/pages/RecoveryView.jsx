import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

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

function RecoveryScore({ value }) {
  const color = value > 70 ? '#10b981' : value > 40 ? '#f59e0b' : '#ef4444'; // emerald, amber, red
  const label = value > 70 ? 'GOOD' : value > 40 ? 'MODERATE' : 'NEEDS REST';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="card flex flex-col items-center py-6 bg-card shadow-sm border-premium-200 hover:shadow-premium-hover transition-shadow duration-300">
      <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-6">Recovery Score</p>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-black tracking-tighter" style={{ color }}>{value.toFixed(0)}</span>
          <span className="text-[10px] font-bold text-premium-400">/ 100</span>
        </div>
      </div>
      <p className="mt-5 text-sm font-black tracking-widest" style={{ color }}>{label}</p>
    </div>
  );
}

export default function RecoveryView({ athleteId, getAthleteData, getLatest }) {
  const records = getAthleteData(athleteId);
  const latest = getLatest(athleteId);

  const recoveryScore = useMemo(() => {
    if (!latest) return 0;
    const hr = latest.MAX30102_Heart_Rate_bpm;
    const temp = latest.DS18B20_Skin_Temperature_C;
    const fatigue = latest.Fatigue_Index;
    const motion = latest.Motion_Magnitude;

    const hrScore = Math.max(0, 100 - (hr - 60) * 0.6);
    const tempScore = Math.max(0, 100 - Math.abs(temp - 33) * 15);
    const fatigueScore = (1 - fatigue) * 100;
    const motionScore = Math.max(0, 100 - motion * 5);

    return (hrScore * 0.4 + tempScore * 0.2 + fatigueScore * 0.3 + motionScore * 0.1);
  }, [latest]);

  const chartData = useMemo(() => {
    return records.slice(-30).map((r, i) => ({
      sample: i + 1,
      fatigue: +(r.Fatigue_Index * 100).toFixed(1),
      temp: +r.DS18B20_Skin_Temperature_C.toFixed(2),
      hr: +r.MAX30102_Heart_Rate_bpm.toFixed(0),
      ppg: +(r.MAX30102_PPG_Signal / 1000).toFixed(2)
    }));
  }, [records]);

  const recommendations = useMemo(() => {
    if (!latest) return [];
    const recs = [];
    if (latest.MAX30102_Heart_Rate_bpm > 160) recs.push({ icon: '❤️', text: 'Heart rate elevated — reduce intensity or take a 5-min rest', bg: 'bg-surface-danger', border: 'border-rose-100', textc: 'text-accent-danger' });
    if (latest.DS18B20_Skin_Temperature_C > 37.5) recs.push({ icon: '🌡️', text: 'Skin temp rising — hydrate and consider cooling', bg: 'bg-amber-50', border: 'border-amber-100', textc: 'text-accent-warning' });
    if (latest.Fatigue_Index > 0.6) recs.push({ icon: '😴', text: 'High fatigue — consider reducing load by 20%', bg: 'bg-surface-primary', border: 'border-indigo-100', textc: 'text-accent-primary' });
    if (latest.Motion_Magnitude > 11) recs.push({ icon: '⚡', text: 'High impact loading — monitor joint strain closely', bg: 'bg-violet-50', border: 'border-violet-100', textc: 'text-accent-purple' });
    if (recs.length === 0) recs.push({ icon: '✅', text: 'All metrics within healthy recovery range — continue session', bg: 'bg-surface-success', border: 'border-emerald-100', textc: 'text-accent-success' });
    return recs;
  }, [latest]);

  // Define light theme chart colors
  const chartColors = {
    grid: '#e2e8f0', // slate-200
    text: '#64748b', // slate-500
    hr: '#ef4444', // red-500
    ppg: '#10b981', // emerald-500
    fatigue: '#8b5cf6', // violet-500
  };

  if (!latest) return (
    <div className="flex items-center justify-center h-64 text-premium-400 font-mono text-sm font-bold tracking-widest uppercase bg-card rounded-2xl border border-premium-200 border-dashed">
      No recovery data available
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <RecoveryScore value={recoveryScore} />

        {/* HRV-like analysis */}
        <div className="card lg:col-span-2 bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">PPG Signal & Heart Rate Variability (approx.)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ left: -20, right: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="sample" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="ppg" tick={{ fill: chartColors.ppg, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis yAxisId="hr" orientation="right" tick={{ fill: chartColors.hr, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.grid, strokeWidth: 2, strokeDasharray: '4 4' }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
              <Line yAxisId="ppg" type="monotone" dataKey="ppg" stroke={chartColors.ppg}
                strokeWidth={3} dot={false} activeDot={{ r: 5, fill: chartColors.ppg, strokeWidth: 0 }} name="PPG (kHz)" />
              <Line yAxisId="hr" type="monotone" dataKey="hr" stroke={chartColors.hr}
                strokeWidth={2} dot={false} name="HR (bpm)" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fatigue trend */}
      <div className="card bg-card shadow-sm border-premium-200">
        <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Fatigue Progression</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ left: -20, right: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="fatigueGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.fatigue} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.fatigue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="sample" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} domain={[0, 100]} axisLine={false} tickLine={false} tickMargin={10} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.grid, strokeWidth: 2, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="fatigue" stroke={chartColors.fatigue} fill="url(#fatigueGrad2)"
              strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: chartColors.fatigue }} name="Fatigue %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendations */}
      <div className="card bg-card shadow-sm border-premium-200">
        <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Recovery Recommendations</p>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className={`flex items-center gap-4 ${rec.bg} border ${rec.border} rounded-xl px-4 py-3 shadow-sm hover:shadow transition-shadow`}>
              <div className="text-2xl bg-card/50 p-2 rounded-lg">{rec.icon}</div>
              <span className={`font-bold text-sm ${rec.textc}`}>{rec.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
