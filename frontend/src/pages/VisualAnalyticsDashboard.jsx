// src/pages/VisualAnalyticsDashboard.jsx
import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useAthleteData } from "../hooks/useAthleteData";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Target,
  Zap,
  BarChart2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
} from "lucide-react";
import {
  getBpm,
  getTemp,
  getResp,
  getMag,
  getSteps,
  timeLabel,
  parseTs,
  avg,
  pearson,
  fatigueScore,
  athleteColor,
  initials,
} from "../utils/dataHelpers";

const METRIC_COLORS = {
  hr: "#ef4444",
  temp: "#f59e0b",
  motion: "#6366f1",
  resp: "#10b981",
  steps: "#3b82f6",
};

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
      }}
    >
      <p style={{ color: t.muted, marginBottom: 4, fontWeight: 700 }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke, fontWeight: 700 }}>
          {p.name}:{" "}
          <span style={{ color: "inherit" }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function Card({ title, icon: Icon, children, t, span, action }) {
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1.125rem 1.25rem",
        boxShadow: t.shadow,
        gridColumn: span ? `span ${span}` : undefined,
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {Icon && <Icon size={14} color={t.accent} />}
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
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function KPICard({ title, value, unit, change, color, icon: Icon, t }) {
  const dir = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const TIcon =
    dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const tc = dir === "up" ? t.success : dir === "down" ? t.danger : t.muted;
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "1rem 1.25rem",
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
          background: `linear-gradient(90deg,${color},${color}40)`,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {Icon && <Icon size={13} color={color} />}
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: t.muted,
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {title}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1,
            color,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "-1.5px",
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: t.muted,
            marginBottom: 4,
          }}
        >
          {unit}
        </span>
        {change !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginBottom: 4,
              marginLeft: "auto",
            }}
          >
            <TIcon size={12} color={tc} />
            <span style={{ fontSize: 10, fontWeight: 700, color: tc }}>
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisualAnalyticsDashboard({ t }) {
  const { user, connectedAthletes = [] } = useAuth();
  const { athletes, liveData, loading, getAthleteData } = useAthleteData();
  const isAdmin = user?.role === "admin";
  const connectedAthleteIds = isAdmin ? connectedAthletes.map(a => a.athleteId) : [];
  
  const visibleAthletes = isAdmin 
    ? athletes.filter(a => connectedAthleteIds.includes(a.id))
    : athletes.filter((a) => a.id === user?.athleteId);

  const allIds = visibleAthletes.map((a) => a.id);
  const [selectedIds, setSelectedIds] = useState([]);
  const [brushedRange, setBrushedRange] = useState(null);

  // Auto-select all on load
  React.useEffect(() => {
    if (visibleAthletes.length && selectedIds.length === 0) setSelectedIds(allIds);
  }, [visibleAthletes.length]);

  const toggleAthlete = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((i) => i !== id)
          : prev
        : [...prev, id],
    );

  // Aggregate stats for KPIs
  const kpis = useMemo(() => {
    let totalHR = [],
      totalTemp = [],
      totalMag = [];
    selectedIds.forEach((id) => {
      const recs = getAthleteData(id);
      recs.forEach((r) => {
        const bpm = getBpm(r),
          temp = getTemp(r),
          mag = getMag(r);
        if (bpm != null) totalHR.push(bpm);
        if (temp != null) totalTemp.push(temp);
        if (mag != null) totalMag.push(mag);
      });
    });
    const avgHR = totalHR.length ? Math.round(avg(totalHR)) : null;
    const avgTemp = totalTemp.length
      ? parseFloat(avg(totalTemp).toFixed(1))
      : null;
    const avgMag = totalMag.length
      ? parseFloat(avg(totalMag).toFixed(2))
      : null;
    return { avgHR, avgTemp, avgMag, totalReadings: totalHR.length };
  }, [selectedIds, liveData]);

  // Timeline data — merge all selected athletes by time bucket
  const timelineData = useMemo(() => {
    const buckets = {};
    selectedIds.forEach((id) => {
      const recs = getAthleteData(id);
      recs.forEach((r) => {
        const key = timeLabel(r.timestamp);
        if (!buckets[key]) buckets[key] = { time: key };
        buckets[key][`hr_${id}`] = getBpm(r);
        buckets[key][`temp_${id}`] = getTemp(r);
        buckets[key][`mag_${id}`] =
          getMag(r) != null ? parseFloat(getMag(r).toFixed(2)) : null;
      });
    });
    return Object.values(buckets).slice(-60); // last 60 time points
  }, [selectedIds, liveData]);

  // Scatter: HR vs Motion across all selected athletes
  const scatterByAthlete = useMemo(
    () =>
      selectedIds.map((id) => {
        const recs = getAthleteData(id);
        const a = visibleAthletes.find((x) => x.id === id);
        return {
          id,
          name: a?.name || id,
          color: athleteColor(id, allIds),
          points: recs
            .map((r) => ({
              bpm: getBpm(r),
              mag: getMag(r) != null ? parseFloat(getMag(r).toFixed(2)) : null,
            }))
            .filter((d) => d.bpm != null && d.mag != null),
        };
      }),
    [selectedIds, liveData],
  );

  // Zone distribution across all selected
  const zoneData = useMemo(() => {
    const zones = {
      "Z1 Rest": 0,
      "Z2 Low": 0,
      "Z3 Moderate": 0,
      "Z4 High": 0,
      "Z5 Max": 0,
    };
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#7c3aed"];
    selectedIds.forEach((id) => {
      getAthleteData(id).forEach((r) => {
        const bpm = getBpm(r) ?? 0;
        if (bpm < 60) zones["Z1 Rest"]++;
        else if (bpm < 90) zones["Z2 Low"]++;
        else if (bpm < 130) zones["Z3 Moderate"]++;
        else if (bpm < 160) zones["Z4 High"]++;
        else zones["Z5 Max"]++;
      });
    });
    const total = Object.values(zones).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(zones)
      .map(([name, value], i) => ({
        name,
        value,
        pct: Math.round((value / total) * 100),
        fill: colors[i],
      }))
      .filter((d) => d.value > 0);
  }, [selectedIds, liveData]);

  // Fatigue leaderboard
  const fatigueBoard = useMemo(
    () =>
      visibleAthletes
        .map((a) => {
          const recs = getAthleteData(a.id);
          const latest = recs.at(-1) ?? null;
          const { score, status } = fatigueScore(latest);
          return {
            id: a.id,
            name: a.name || a.id,
            sport: a.sport,
            color: athleteColor(a.id, allIds),
            score,
            status,
            dataPoints: recs.length,
          };
        })
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [visibleAthletes, liveData],
  );

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
        <p style={{ color: t.muted }}>Loading analytics…</p>
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
          flexWrap: "wrap",
          gap: 12,
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
            VISUAL ANALYTICS
          </h2>
          <p style={{ fontSize: 11, color: t.muted }}>
            Insights & storytelling · {visibleAthletes.length} athletes ·{" "}
            {kpis.totalReadings} readings
          </p>
        </div>
        {/* Athlete filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {visibleAthletes.map((a) => {
            const color = athleteColor(a.id, allIds);
            const active = selectedIds.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleAthlete(a.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 20,
                  background: active ? `${color}20` : t.surface,
                  border: `1px solid ${active ? color + "50" : t.border}`,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? color : t.muted,
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: active ? color : t.muted,
                  }}
                />
                {a.name?.split(" ")[0] || a.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KPICard
          title="Avg Heart Rate"
          value={kpis.avgHR ?? "--"}
          unit="bpm"
          color={METRIC_COLORS.hr}
          icon={TrendingUp}
          t={t}
        />
        <KPICard
          title="Avg Skin Temp"
          value={kpis.avgTemp ?? "--"}
          unit="°C"
          color={METRIC_COLORS.temp}
          icon={Target}
          t={t}
        />
        <KPICard
          title="Avg Motion"
          value={kpis.avgMag ?? "--"}
          unit="g"
          color={METRIC_COLORS.motion}
          icon={Zap}
          t={t}
        />
        <KPICard
          title="Total Readings"
          value={kpis.totalReadings}
          unit="pts"
          color={METRIC_COLORS.resp}
          icon={BarChart2}
          t={t}
        />
      </div>

      {/* Coordinated timeline (brushable) */}
      <Card
        title="HR Timeline — All Selected Athletes"
        icon={TrendingUp}
        t={t}
        span={2}
      >
        {timelineData.length === 0 ? (
          <p
            style={{
              color: t.muted,
              fontSize: 12,
              textAlign: "center",
              padding: 24,
            }}
          >
            No data for selected athletes.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={timelineData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
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
                domain={[40, 220]}
                tick={{ fontSize: 9, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Brush
                dataKey="time"
                height={20}
                stroke={t.border}
                fill={t.surface}
                travellerWidth={6}
                onChange={(e) => setBrushedRange(e)}
              />
              <ReferenceLine
                y={185}
                stroke={`${t.danger}60`}
                strokeDasharray="4 3"
                label={{ value: "Max", fontSize: 8, fill: t.danger }}
              />
              {selectedIds.map((id) => {
                const a = visibleAthletes.find((x) => x.id === id);
                return (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={`hr_${id}`}
                    name={a?.name?.split(" ")[0] || id}
                    stroke={athleteColor(id, allIds)}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* HR vs Motion scatter */}
        <Card title="HR vs Motion — Brushing & Linking" icon={Eye} t={t}>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
              <XAxis
                type="number"
                dataKey="mag"
                name="Motion (g)"
                tick={{ fontSize: 8, fill: t.faint }}
                label={{
                  value: "Motion (g)",
                  position: "insideBottom",
                  fontSize: 8,
                  fill: t.faint,
                  dy: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="bpm"
                name="HR (bpm)"
                domain={[40, 220]}
                tick={{ fontSize: 8, fill: t.faint }}
                width={30}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ChartTip t={t} />}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {scatterByAthlete.map((s) => (
                <Scatter
                  key={s.id}
                  name={s.name.split(" ")[0]}
                  data={s.points}
                  fill={s.color}
                  fillOpacity={0.6}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        {/* HR Zone pie */}
        <Card title="HR Zone Distribution" icon={Target} t={t}>
          {zoneData.length === 0 ? (
            <p
              style={{
                color: t.muted,
                fontSize: 12,
                textAlign: "center",
                padding: 24,
              }}
            >
              No data
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
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {zoneData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [
                      `${v} readings (${zoneData.find((d) => d.name === n)?.pct}%)`,
                      n,
                    ]}
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
                  gap: 5,
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

        {/* Fatigue leaderboard */}
        <Card title="Fatigue Leaderboard" icon={AlertTriangle} t={t}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fatigueBoard.length === 0 ? (
              <p style={{ color: t.muted, fontSize: 12 }}>No data yet</p>
            ) : (
              fatigueBoard.map((a, i) => (
                <div
                  key={a.id}
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: t.muted,
                      fontFamily: "'DM Mono',monospace",
                      width: 16,
                    }}
                  >
                    #{i + 1}
                  </span>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${a.color}20`,
                      border: `1px solid ${a.color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color: a.color,
                      flexShrink: 0,
                    }}
                  >
                    {initials(a.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: t.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.name}
                    </p>
                    <p style={{ fontSize: 10, color: t.muted }}>{a.sport}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color:
                          a.score > 50
                            ? t.danger
                            : a.score > 25
                              ? t.warning
                              : t.success,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {a.score ?? "--"}%
                    </p>
                    <p style={{ fontSize: 9, color: t.muted }}>{a.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Temperature trend all athletes */}
        <Card title="Temperature Trend — All Athletes" icon={TrendingUp} t={t}>
          {timelineData.length === 0 ? (
            <p
              style={{
                color: t.muted,
                fontSize: 12,
                textAlign: "center",
                padding: 24,
              }}
            >
              No data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={timelineData}
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
                  domain={[34, 42]}
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip content={<ChartTip t={t} />} />
                <ReferenceLine
                  y={37.5}
                  stroke={`${t.warning}60`}
                  strokeDasharray="4 3"
                  label={{ value: "Elevated", fontSize: 7, fill: t.warning }}
                />
                {selectedIds.map((id) => {
                  const a = visibleAthletes.find((x) => x.id === id);
                  return (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={`temp_${id}`}
                      name={a?.name?.split(" ")[0] || id}
                      stroke={athleteColor(id, allIds)}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                    />
                  );
                })}
                <Legend wrapperStyle={{ fontSize: 9 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </main>
  );
}
