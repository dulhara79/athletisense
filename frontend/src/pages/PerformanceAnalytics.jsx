// src/pages/PerformanceAnalytics.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useAthleteData } from "../hooks/useAthleteData";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Filter, RefreshCw, ChevronDown, WifiOff } from "lucide-react";
import {
  getBpm,
  getTemp,
  getResp,
  getMag,
  getSteps,
  timeLabel,
  parseTs,
  avg,
  rollingAvg,
  athleteColor,
  initials,
} from "../utils/dataHelpers";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
        fontSize: 11,
        fontFamily: "'DM Mono',monospace",
      }}
    >
      <p style={{ color: t.muted, marginBottom: 5, fontWeight: 700 }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color || p.stroke,
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          {p.name}:{" "}
          <span style={{ color: t.text }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function Card({ title, children, t, right }) {
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "1.125rem 1.25rem",
        boxShadow: t.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: t.muted,
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {title}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Dropdown({ label, options, value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const display = options.find((o) => o.value === value)?.label || label;
  return (
    <div
      ref={ref}
      style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          padding: "8px 12px",
          borderRadius: 10,
          background: t.surface,
          border: `1px solid ${t.border}`,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: t.text,
        }}
      >
        <span>{display}</span>
        <ChevronDown
          size={13}
          color={t.muted}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 200,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            boxShadow: t.shadowHover,
            overflow: "hidden",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "9px 14px",
                background: value === opt.value ? t.accentBg : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: value === opt.value ? 700 : 500,
                color: value === opt.value ? t.accent : t.text,
                textAlign: "left",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PerformanceAnalytics({ t }) {
  const { user, connectedAthletes = [] } = useAuth();
  const { athletes, liveData, connected, loading, getAthleteData } =
    useAthleteData();
  const isAdmin = user?.role === "admin";
  const connectedAthleteIds = isAdmin ? connectedAthletes.map(a => a.athleteId) : [];
  
  const visibleAthletes = isAdmin 
    ? athletes.filter(a => connectedAthleteIds.includes(a.id))
    : athletes.filter((a) => a.id === user?.athleteId);

  const allIds = visibleAthletes.map((a) => a.id);

  const [selectedId, setSelectedId] = useState(null);
  const [metric, setMetric] = useState("hr");

  useEffect(() => {
    if (!selectedId && visibleAthletes.length) {
      setSelectedId(visibleAthletes[0]?.id);
    }
  }, [visibleAthletes.length]);

  const records = getAthleteData(selectedId);

  // Build chart-ready data from real records
  const chartData = useMemo(
    () =>
      records.map((r) => ({
        time: timeLabel(r.timestamp),
        bpm: getBpm(r),
        temp: getTemp(r),
        resp: getResp(r),
        mg: parseFloat((getMag(r) ?? 0).toFixed(2)),
        steps: getSteps(r),
      })),
    [records],
  );

  // Rolling 5-point average
  const hrVals = chartData.map((d) => d.bpm).filter(Number.isFinite);
  const tmpVals = chartData.map((d) => d.temp).filter(Number.isFinite);
  const respVals = chartData.map((d) => d.resp).filter(Number.isFinite);

  const rollingHR = rollingAvg(hrVals, 5);
  const rollingTemp = rollingAvg(tmpVals, 5);

  const trendData = chartData.map((d, i) => ({
    ...d,
    hrRolling: rollingHR[i] ?? null,
    tempRolling: rollingTemp[i] ?? null,
  }));

  // Monthly bucket from real timestamps
  const monthlyData = useMemo(() => {
    const buckets = {};
    records.forEach((r) => {
      const d = parseTs(r.timestamp);
      if (!d) return;
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!buckets[key])
        buckets[key] = { label: key, hr: [], temp: [], resp: [], count: 0 };
      const bpm = getBpm(r),
        temp = getTemp(r),
        resp = getResp(r);
      if (bpm != null) buckets[key].hr.push(bpm);
      if (temp != null) buckets[key].temp.push(temp);
      if (resp != null) buckets[key].resp.push(resp);
      buckets[key].count++;
    });
    return Object.values(buckets).map((b) => ({
      label: b.label,
      avgHR: b.hr.length ? Math.round(avg(b.hr)) : null,
      avgTemp: b.temp.length ? parseFloat(avg(b.temp).toFixed(2)) : null,
      avgResp: b.resp.length ? Math.round(avg(b.resp)) : null,
      count: b.count,
    }));
  }, [records]);

  // Zone distribution (HR zones)
  const zoneData = useMemo(() => {
    const zones = {
      "Rest (<60)": 0,
      "Low (60-90)": 0,
      "Moderate (90-130)": 0,
      "High (130-160)": 0,
      "Max (>160)": 0,
    };
    hrVals.forEach((bpm) => {
      if (bpm < 60) zones["Rest (<60)"]++;
      else if (bpm < 90) zones["Low (60-90)"]++;
      else if (bpm < 130) zones["Moderate (90-130)"]++;
      else if (bpm < 160) zones["High (130-160)"]++;
      else zones["Max (>160)"]++;
    });
    const total = Object.values(zones).reduce((s, v) => s + v, 0) || 1;
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#7c3aed"];
    return Object.entries(zones)
      .map(([name, value], i) => ({
        name,
        value,
        pct: Math.round((value / total) * 100),
        fill: colors[i],
      }))
      .filter((d) => d.value > 0);
  }, [hrVals]);

  // Athlete options for dropdown
  const athleteOptions = visibleAthletes.map((a) => ({ value: a.id, label: a.name || a.id }));

  const metricOptions = [
    { value: "hr", label: "Heart Rate" },
    { value: "temp", label: "Temperature" },
    { value: "resp", label: "Respiration" },
    { value: "mg", label: "Motion" },
  ];
  const metricKey =
    metric === "hr"
      ? "bpm"
      : metric === "temp"
        ? "temp"
        : metric === "resp"
          ? "resp"
          : "mg";
  const metricColor = {
    hr: "#ef4444",
    temp: "#f59e0b",
    resp: "#3b82f6",
    mg: "#10b981",
  }[metric];
  const metricLabel = metricOptions.find((m) => m.value === metric)?.label;

  const selectedAthlete = athletes.find((a) => a.id === selectedId);

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
        <p style={{ color: t.muted }}>Loading data…</p>
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
      {/* Header */}
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
            PERFORMANCE ANALYTICS
          </h2>
          <p style={{ fontSize: 11, color: t.muted }}>
            {records.length} readings · {selectedAthlete?.name || selectedId}
          </p>
        </div>
        {!connected && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: t.muted,
              fontSize: 12,
            }}
          >
            <WifiOff size={14} /> Offline
          </div>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: "10px 14px",
          boxShadow: t.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: t.muted,
          }}
        >
          <Filter size={14} />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Filters</span>
        </div>
        {isAdmin && (
          <Dropdown
            label="Select Athlete"
            options={athleteOptions}
            value={selectedId}
            onChange={setSelectedId}
            t={t}
          />
        )}
        {
          console.log("Rendering with records:", records) /* Debug log to verify data presence */
        }
        <Dropdown
          label="Metric"
          options={metricOptions}
          value={metric}
          onChange={setMetric}
          t={t}
        />
      </div>

      {/* KPI Summary from real data */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          {
            label: "Avg HR",
            value: hrVals.length ? `${Math.round(avg(hrVals))}` : "--",
            unit: "bpm",
            color: "#ef4444",
          },
          {
            label: "Max HR",
            value: hrVals.length ? `${Math.round(Math.max(...hrVals))}` : "--",
            unit: "bpm",
            color: "#f59e0b",
          },
          {
            label: "Avg Temp",
            value: tmpVals.length ? avg(tmpVals).toFixed(1) : "--",
            unit: "°C",
            color: "#3b82f6",
          },
          {
            label: "Readings",
            value: String(records.length),
            unit: "pts",
            color: "#10b981",
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              flex: 1,
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: "1rem 1.25rem",
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
                background: `linear-gradient(90deg,${k.color},${k.color}40)`,
              }}
            />
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.10em",
                color: t.muted,
                fontFamily: "'DM Mono',monospace",
                marginBottom: 6,
              }}
            >
              {k.label}
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: k.color,
                  fontFamily: "'DM Mono',monospace",
                  letterSpacing: "-1px",
                }}
              >
                {k.value}
              </span>
              <span style={{ fontSize: 12, color: t.muted, marginBottom: 3 }}>
                {k.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <Card title={`${metricLabel} Trend`} t={t}>
        {chartData.length === 0 ? (
          <p
            style={{
              color: t.muted,
              fontSize: 13,
              textAlign: "center",
              padding: 24,
            }}
          >
            No readings yet for this athlete.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={trendData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={metricColor}
                    stopOpacity={0.25}
                  />
                  <stop offset="95%" stopColor={metricColor} stopOpacity={0} />
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
                width={36}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Area
                type="monotone"
                dataKey={metricKey}
                name={metricLabel}
                stroke={metricColor}
                strokeWidth={2}
                fill="url(#perfGrad)"
                dot={false}
                isAnimationActive={false}
              />
              {metric === "hr" && (
                <Line
                  type="monotone"
                  dataKey="hrRolling"
                  name="5-pt Avg"
                  stroke={`${metricColor}80`}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Monthly averages */}
        <Card title="Monthly Averages" t={t}>
          {monthlyData.length === 0 ? (
            <p
              style={{
                color: t.muted,
                fontSize: 12,
                textAlign: "center",
                padding: 16,
              }}
            >
              Not enough data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={monthlyData}
                margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={t.chartGrid}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTip t={t} />} />
                <Bar
                  dataKey="avgHR"
                  name="Avg HR"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* HR Zone pie */}
        <Card title="HR Zone Distribution" t={t}>
          {zoneData.length === 0 ? (
            <p
              style={{
                color: t.muted,
                fontSize: 12,
                textAlign: "center",
                padding: 16,
              }}
            >
              No HR data
            </p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={zoneData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {zoneData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} readings`, n]}
                    contentStyle={{
                      background: t.card,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {zoneData.map((d) => (
                  <div
                    key={d.name}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: d.fill,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: t.text, flex: 1 }}>
                      {d.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: t.muted,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {d.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* All metrics overlay */}
        <Card
          title="All Metrics Overlay"
          t={t}
          right={
            <span style={{ fontSize: 9, color: t.faint }}>
              Normalised scale
            </span>
          }
        >
          {chartData.length === 0 ? (
            <p
              style={{
                color: t.muted,
                fontSize: 12,
                textAlign: "center",
                padding: 16,
              }}
            >
              No data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={t.chartGrid}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTip t={t} />} />
                <Legend
                  wrapperStyle={{
                    fontSize: 9,
                    fontFamily: "'DM Mono',monospace",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bpm"
                  name="HR (bpm)"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="resp"
                  name="Resp"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  name="Temp (°C)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Steps timeline */}
        <Card title="Step Count Timeline" t={t}>
          {chartData.length === 0 ? (
            <p
              style={{
                color: t.muted,
                fontSize: 12,
                textAlign: "center",
                padding: 16,
              }}
            >
              No data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={t.chartGrid}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip content={<ChartTip t={t} />} />
                <Area
                  type="monotone"
                  dataKey="steps"
                  name="Steps"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#stepGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </main>
  );
}
