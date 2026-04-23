// src/pages/FatigueRecovery.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useAthleteData } from "../hooks/useAthleteData";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Zap,
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
      <p style={{ color: t.muted, marginBottom: 5, fontWeight: 700 }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke, fontWeight: 700 }}>
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

function AthleteDropdown({ athletes, value, onChange, allIds, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = athletes.find((a) => a.id === value);
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 180 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderRadius: 10,
          background: t.surface,
          border: `1px solid ${t.border}`,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: t.text,
          width: "100%",
        }}
      >
        {selected ? (
          <div
            style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                background: `${athleteColor(selected.id, allIds)}20`,
                fontSize: 9,
                fontWeight: 800,
                color: athleteColor(selected.id, allIds),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials(selected.name)}
            </div>
            <span>{selected.name || selected.id}</span>
          </div>
        ) : (
          <span>Select Athlete</span>
        )}
        <ChevronDown size={13} color={t.muted} />
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
          {athletes.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onChange(a.id);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "9px 14px",
                background: a.id === value ? t.accentBg : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: t.text,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  background: `${athleteColor(a.id, allIds)}20`,
                  fontSize: 9,
                  fontWeight: 800,
                  color: athleteColor(a.id, allIds),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {initials(a.name)}
              </div>
              <span>{a.name || a.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FatigueRecovery({ t }) {
  const { user, connectedAthletes = [] } = useAuth();
  const { athletes, connected, loading, getAthleteData, getLatest } =
    useAthleteData();
  const isAdmin = user?.role === "admin";
  const connectedAthleteIds = isAdmin ? connectedAthletes.map(a => a.athleteId) : [];

  const visible = isAdmin
    ? athletes.filter(a => connectedAthleteIds.includes(a.id))
    : athletes.filter((a) => a.id === user?.athleteId);
    
  const allIds = visible.map((a) => a.id);

  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (!selectedId && visible.length) setSelectedId(visible[0].id);
  }, [visible.length]);

  const records = getAthleteData(selectedId);
  const latest = getLatest(selectedId);
  const { score: fatigue, recovery, status } = fatigueScore(latest);

  // Chart data
  const chartData = useMemo(
    () =>
      records.map((r) => ({
        time: timeLabel(r.timestamp),
        bpm: getBpm(r),
        temp: getTemp(r),
        resp: getResp(r),
        mag: parseFloat((getMag(r) ?? 0).toFixed(2)),
        steps: getSteps(r),
        fatigue: (() => {
          const { score } = fatigueScore(r);
          return score;
        })(),
      })),
    [records],
  );

  // Scatter: HR vs motion for correlation viz
  const scatterData = useMemo(
    () =>
      records
        .map((r) => ({
          bpm: getBpm(r),
          mag: parseFloat((getMag(r) ?? 0).toFixed(2)),
          temp: getTemp(r),
        }))
        .filter((d) => d.bpm != null && d.mag != null),
    [records],
  );

  // Compute correlations from real data
  const hrVals = records.map(getBpm).filter(Number.isFinite);
  const magVals = records.map((r) => getMag(r) ?? 0).filter(Number.isFinite);
  const tmpVals = records.map(getTemp).filter(Number.isFinite);
  const rspVals = records.map(getResp).filter(Number.isFinite);
  const hrMagCorr = pearson(hrVals, magVals);
  const hrTmpCorr = pearson(hrVals, tmpVals);
  const hrRspCorr = pearson(hrVals, rspVals);

  const statusColor =
    status === "Optimal"
      ? t.success
      : status === "Moderate"
        ? t.warning
        : t.danger;
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
            FATIGUE & RECOVERY
          </h2>
          <p style={{ fontSize: 11, color: t.muted }}>
            {selectedAthlete?.name || selectedId} · {records.length} readings
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {isAdmin && (
            <AthleteDropdown
              athletes={visible}
              value={selectedId}
              onChange={setSelectedId}
              allIds={allIds}
              t={t}
            />
          )}
        </div>
      </div>

      {/* Fatigue score hero */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 220px",
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: "1.5rem",
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
              background: `linear-gradient(90deg,${statusColor},${statusColor}40)`,
            }}
          />
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              color: t.muted,
              marginBottom: 12,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            Fatigue Score
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: `${statusColor}15`,
                border: `3px solid ${statusColor}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: statusColor,
                  fontFamily: "'DM Mono',monospace",
                  lineHeight: 1,
                }}
              >
                {fatigue ?? "--"}
              </span>
              <span style={{ fontSize: 9, color: t.muted, fontWeight: 600 }}>
                / 100
              </span>
            </div>
            <div>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: statusColor,
                  marginBottom: 4,
                }}
              >
                {status}
              </p>
              <p style={{ fontSize: 11, color: t.muted }}>
                Recovery:{" "}
                <strong style={{ color: t.success }}>
                  {recovery ?? "--"}%
                </strong>
              </p>
              <p style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>
                {status === "Optimal"
                  ? "✅ Ready for high intensity"
                  : status === "Moderate"
                    ? "⚡ Light training recommended"
                    : status === "High"
                      ? "⚠️ Reduce training load"
                      : "🛑 Rest day required"}
              </p>
            </div>
          </div>
        </div>

        {/* Latest vitals */}
        {[
          {
            label: "Heart Rate",
            value:
              getBpm(latest) != null ? `${getBpm(latest)?.toFixed(0)}` : "--",
            unit: "bpm",
            color: "#ef4444",
          },
          {
            label: "Temperature",
            value: getTemp(latest) != null ? getTemp(latest)?.toFixed(1) : "--",
            unit: "°C",
            color: "#f59e0b",
          },
          {
            label: "Breathing",
            value:
              getResp(latest) != null ? `${getResp(latest)?.toFixed(0)}` : "--",
            unit: "br/min",
            color: "#3b82f6",
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              flex: "1 1 140px",
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: 16,
              padding: "1.25rem",
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
                marginBottom: 6,
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {k.label}
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
              <span
                style={{
                  fontSize: 30,
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

      {/* Fatigue trend */}
      <Card title="Fatigue Index Over Time" t={t}>
        {chartData.length === 0 ? (
          <p
            style={{
              color: t.muted,
              fontSize: 12,
              textAlign: "center",
              padding: 20,
            }}
          >
            No data yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={statusColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={statusColor} stopOpacity={0} />
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
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Area
                type="monotone"
                dataKey="fatigue"
                name="Fatigue Score"
                stroke={statusColor}
                strokeWidth={2}
                fill="url(#fatGrad)"
                dot={false}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* HR + Temp overlay */}
        <Card title="HR & Temperature Trend" t={t}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, bottom: 0, left: 0 }}
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
                yAxisId="hr"
                domain={[40, 220]}
                tick={{ fontSize: 8, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <YAxis
                yAxisId="temp"
                orientation="right"
                domain={[34, 42]}
                tick={{ fontSize: 8, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(v) => `${v}°`}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="bpm"
                name="HR"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temp"
                name="Temp"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* HR vs Motion scatter */}
        <Card
          title="HR vs Motion Correlation"
          t={t}
          right={
            <span style={{ fontSize: 10, color: t.muted }}>
              r = {hrMagCorr.toFixed(2)}
            </span>
          }
        >
          {scatterData.length === 0 ? (
            <p
              style={{
                color: t.muted,
                fontSize: 12,
                textAlign: "center",
                padding: 20,
              }}
            >
              No data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis
                  type="number"
                  dataKey="mag"
                  name="Motion (g)"
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Motion (g)",
                    position: "insideBottom",
                    fontSize: 8,
                    fill: t.faint,
                    dy: 8,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="bpm"
                  name="HR"
                  tick={{ fontSize: 8, fill: t.faint }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  domain={[40, 220]}
                />
                <ZAxis type="number" dataKey="temp" range={[20, 100]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={<ChartTip t={t} />}
                />
                <Scatter
                  name="HR vs Motion"
                  data={scatterData}
                  fill={t.accent}
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Correlation summary */}
        <Card title="Metric Correlations" t={t}>
          {[
            {
              label: "HR ↔ Motion",
              value: hrMagCorr,
              desc: "Cardiovascular response to activity",
            },
            {
              label: "HR ↔ Temperature",
              value: hrTmpCorr,
              desc: "Thermoregulation efficiency",
            },
            {
              label: "HR ↔ Respiration",
              value: hrRspCorr,
              desc: "Cardiorespiratory coupling",
            },
          ].map((c) => {
            const abs = Math.abs(c.value);
            const barColor =
              abs > 0.7 ? t.success : abs > 0.4 ? t.warning : t.danger;
            return (
              <div key={c.label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 600, color: t.text }}
                  >
                    {c.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: barColor,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {c.value.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: t.surface,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.abs(c.value) * 100}%`,
                      height: "100%",
                      background: barColor,
                      borderRadius: 3,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <p style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>
                  {c.desc}
                </p>
              </div>
            );
          })}
        </Card>

        {/* Recovery recommendation */}
        <Card title="Recovery Recommendation" t={t}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                icon: Zap,
                label: "Training Load",
                value:
                  fatigue != null
                    ? fatigue > 70
                      ? "Reduce by 40%"
                      : fatigue > 45
                        ? "Reduce by 20%"
                        : "Maintain"
                    : "--",
                color: statusColor,
              },
              {
                icon: CheckCircle,
                label: "Recovery Status",
                value: status || "--",
                color: statusColor,
              },
              {
                icon: AlertTriangle,
                label: "Risk Level",
                value:
                  fatigue != null
                    ? fatigue > 75
                      ? "Critical"
                      : fatigue > 50
                        ? "Moderate"
                        : "Low"
                    : "--",
                color:
                  fatigue != null
                    ? fatigue > 75
                      ? t.danger
                      : fatigue > 50
                        ? t.warning
                        : t.success
                    : t.muted,
              },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: t.surface,
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <Icon size={16} color={r.color} />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}
                    >
                      {r.label}
                    </p>
                    <p
                      style={{ fontSize: 13, fontWeight: 700, color: r.color }}
                    >
                      {r.value}
                    </p>
                  </div>
                </div>
              );
            })}
            <div
              style={{
                marginTop: 4,
                padding: "12px 14px",
                background: `${statusColor}10`,
                borderRadius: 10,
                border: `1px solid ${statusColor}30`,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: statusColor,
                  marginBottom: 4,
                }}
              >
                Recommendation
              </p>
              <p style={{ fontSize: 11, color: t.text, lineHeight: 1.5 }}>
                {fatigue == null
                  ? "No data available yet."
                  : fatigue > 70
                    ? "Full rest day or very light stretching only. Prioritise sleep and hydration."
                    : fatigue > 45
                      ? "Light active recovery: easy walk, yoga, or swimming."
                      : "Athlete is cleared for normal or high-intensity training."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
