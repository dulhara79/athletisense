import { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import MetricCard from '../components/MetricCard';
import MotionGauge from '../components/MotionGauge';
import AlertsPanel from '../components/AlertsPanel';
import { Heart, Wind, Thermometer, Zap, Timer, Activity } from 'lucide-react';

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

export default function MonitoringView({ athleteId, athleteName, athleteSport, getAthleteData, getLatest, sessionSeconds }) {
  const [zoomWindow] = useState(30);
  const records = getAthleteData(athleteId);
  const latest = getLatest(athleteId);

  const chartData = useMemo(() => {
    return records.slice(-zoomWindow).map(r => ({
      time: r.Timestamp?.slice(11, 19) || '',
      hr: +r.MAX30102_Heart_Rate_bpm?.toFixed(1),
      motion: +r.Motion_Magnitude?.toFixed(2),
      temp: +r.DS18B20_Skin_Temperature_C?.toFixed(2),
      force: +r.StrainGauge_Force_N?.toFixed(1),
      fatigue: +(r.Fatigue_Index * 100)?.toFixed(1),
      gyroX: +r.BMI160_Gyro_X?.toFixed(1),
      gyroY: +r.BMI160_Gyro_Y?.toFixed(1),
      gyroZ: +r.BMI160_Gyro_Z?.toFixed(1),
      accX: +r.BMI160_Acc_X?.toFixed(2),
      accY: +r.BMI160_Acc_Y?.toFixed(2),
      accZ: +r.BMI160_Acc_Z?.toFixed(2),
    }));
  }, [records, zoomWindow]);

  const maxHR = records.length ? Math.max(...records.map(r => r.MAX30102_Heart_Rate_bpm)) : 0;
  const avgHR = records.length ? records.reduce((s, r) => s + r.MAX30102_Heart_Rate_bpm, 0) / records.length : 0;

  const sessionTime = new Date(sessionSeconds * 1000).toISOString().slice(11, 19);

  if (!latest) {
    return (
      <div className="flex items-center justify-center h-64 text-premium-400">
        <div className="text-center">
          <Activity size={48} className="mx-auto mb-4 text-premium-300 animate-pulse" />
          <p className="font-mono text-sm font-bold tracking-widest uppercase">Waiting for data stream...</p>
        </div>
      </div>
    );
  }

  // Define light theme chart colors
  const chartColors = {
    grid: '#e2e8f0', // slate-200
    text: '#64748b', // slate-500
    hr: '#ef4444', // red-500
    motion: '#6366f1', // indigo-500
    temp: '#f59e0b', // amber-500
    force: '#10b981', // emerald-500
    gyroX: '#8b5cf6', // violet-500
    gyroY: '#0ea5e9', // sky-500
    gyroZ: '#14b8a6', // teal-500
    accZ: '#10b981' // emerald-500
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 card py-3 bg-card border-premium-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-0.5">Athlete</p>
            <p className="text-premium-900 font-bold">{athleteName} <span className="text-premium-400 font-medium text-sm">· {athleteSport}</span></p>
          </div>
          <div className="h-8 w-px bg-premium-200" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-0.5">Session Timer</p>
            <p className="font-mono text-xl text-accent-primary font-black">{sessionTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-0.5 text-right">Status</p>
            <div className="flex items-center gap-1.5 text-accent-success text-sm font-bold bg-surface-success px-2.5 py-0.5 rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Training · Cardio
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-0.5 text-right">Mode</p>
            <p className="text-premium-600 text-sm font-mono font-bold">MQTT · Stable</p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Heart Rate"
          value={latest.MAX30102_Heart_Rate_bpm}
          unit="bpm"
          icon={Heart}
          color={latest.MAX30102_Heart_Rate_bpm > 175 ? 'danger' : latest.MAX30102_Heart_Rate_bpm > 150 ? 'warning' : 'primary'}
          sub={`Max: ${maxHR.toFixed(0)} · Avg: ${avgHR.toFixed(0)}`}
        />
        <MetricCard
          label="Skin Temperature"
          value={latest.DS18B20_Skin_Temperature_C}
          unit="°C"
          icon={Thermometer}
          color={latest.DS18B20_Skin_Temperature_C > 37.5 ? 'warning' : 'success'}
          sub={`PPG: ${latest.MAX30102_PPG_Signal?.toFixed(0)}`}
        />
        <MetricCard
          label="Motion Magnitude"
          value={latest.Motion_Magnitude}
          unit="g"
          icon={Zap}
          color="primary"
          sub={`Force: ${latest.StrainGauge_Force_N?.toFixed(1)}N`}
        />
        <MetricCard
          label="Fatigue Index"
          value={(latest.Fatigue_Index * 100)}
          unit="%"
          icon={Activity}
          color={latest.Fatigue_Index > 0.7 ? 'danger' : latest.Fatigue_Index > 0.4 ? 'warning' : 'success'}
          sub={`Raw: ${latest.Fatigue_Index?.toFixed(3)}`}
        />
      </div>

      {/* Motion Live Chart + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card lg:col-span-2 bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Motion Live Chart</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="motionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.motion} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColors.motion} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.accZ} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={chartColors.accZ} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="time" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.grid, strokeWidth: 2, strokeDasharray: '4 4' }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
              <Area type="monotone" dataKey="motion" stroke={chartColors.motion} fill="url(#motionGrad)"
                strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: chartColors.motion }} name="Motion Magnitude" />
              <Area type="monotone" dataKey="accZ" stroke={chartColors.accZ} fill="url(#accGrad)"
                strokeWidth={2} dot={false} name="Acc Z" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card bg-card shadow-sm border-premium-200 flex flex-col justify-center">
          <MotionGauge value={latest.Motion_Magnitude} max={15} />
        </div>
      </div>

      {/* HR vs Motion | Breathing vs Motion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">HR vs Motion</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="time" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="hr" tick={{ fill: chartColors.hr, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis yAxisId="motion" orientation="right" tick={{ fill: chartColors.motion, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.grid, strokeWidth: 2, strokeDasharray: '4 4' }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
              <Line yAxisId="hr" type="monotone" dataKey="hr" stroke={chartColors.hr}
                strokeWidth={3} dot={false} activeDot={{ r: 5, fill: chartColors.hr, strokeWidth: 0 }} name="Heart Rate" />
              <Line yAxisId="motion" type="monotone" dataKey="motion" stroke={chartColors.motion}
                strokeWidth={2} dot={false} name="Motion" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card bg-card shadow-sm border-premium-200">
          <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Temperature & Force</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="time" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="temp" tick={{ fill: chartColors.temp, fontSize: 10, fontWeight: 600 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis yAxisId="force" orientation="right" tick={{ fill: chartColors.force, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.grid, strokeWidth: 2, strokeDasharray: '4 4' }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
              <Line yAxisId="temp" type="monotone" dataKey="temp" stroke={chartColors.temp}
                strokeWidth={3} dot={false} activeDot={{ r: 5, fill: chartColors.temp, strokeWidth: 0 }} name="Skin Temp (°C)" />
              <Line yAxisId="force" type="monotone" dataKey="force" stroke={chartColors.force}
                strokeWidth={2} dot={false} name="Force (N)" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gyroscope chart */}
      <div className="card bg-card shadow-sm border-premium-200">
        <p className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-4">Gyroscope Data (X / Y / Z)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="time" tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.grid, strokeWidth: 2, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
            <Line type="monotone" dataKey="gyroX" stroke={chartColors.gyroX} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Gyro X" />
            <Line type="monotone" dataKey="gyroY" stroke={chartColors.gyroY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Gyro Y" />
            <Line type="monotone" dataKey="gyroZ" stroke={chartColors.gyroZ} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Gyro Z" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts */}
      <AlertsPanel athleteId={athleteId} latest={latest} />
    </div>
  );
}
