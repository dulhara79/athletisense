// src/pages/MultiAthleteComparison.jsx
import React, { useState, useMemo } from "react";
import { useAthleteData } from "../hooks/useAthleteData";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import {
  getBpm,
  getTemp,
  getResp,
  getMag,
  getSteps,
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
        <p key={i} style={{ color: p.color || p.fill, fontWeight: 700 }}>
          {p.name}:{" "}
          <span style={{ color: t.text }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function Card({ title, children, t, right, span }) {
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "1.125rem 1.25rem",
        boxShadow: t.shadow,
        ...(span ? { gridColumn: `span ${span}` } : {}),
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

function normalize(val, min, max) {
  if (max === min) return 50;
  return parseFloat((((val - min) / (max - min)) * 100).toFixed(1));
}

export default function MultiAthleteComparison({ t }) {
  const { athletes, liveData, loading, getAthleteData } = useAthleteData();
  const allIds = athletes.map((a) => a.id);
  const [sortKey, setSortKey] = useState("avgHR");

  // Build per-athlete stats from real records
  const stats = useMemo(
    () =>
      athletes.map((a) => {
        const recs = getAthleteData(a.id);
        const latest = recs.at(-1) ?? null;
        const hrVals = recs.map(getBpm).filter(Number.isFinite);
        const tmpVals = recs.map(getTemp).filter(Number.isFinite);
        const rspVals = recs.map(getResp).filter(Number.isFinite);
        const magVals = recs.map((r) => getMag(r) ?? 0).filter(Number.isFinite);
        const { score: fatigue, recovery, status } = fatigueScore(latest);
        const load = hrVals.reduce(
          (s, hr) => s + (hr / 220) * Math.min(1.5, magVals[0] ?? 1),
          0,
        );

        return {
          id: a.id,
          name: a.name || a.id,
          sport: a.sport || "Athlete",
          color: athleteColor(a.id, allIds),
          avatar: initials(a.name),
          avgHR: hrVals.length ? Math.round(avg(hrVals)) : null,
          maxHR: hrVals.length ? Math.round(Math.max(...hrVals)) : null,
          avgTemp: tmpVals.length ? parseFloat(avg(tmpVals).toFixed(1)) : null,
          avgResp: rspVals.length ? Math.round(avg(rspVals)) : null,
          avgMag: magVals.length ? parseFloat(avg(magVals).toFixed(2)) : null,
          latestSteps: getSteps(latest),
          fatigue,
          recovery,
          status,
          load: parseFloat(load.toFixed(1)),
          dataPoints: recs.length,
        };
      }),
    [athletes, liveData],
  );

  // Sort table
  const sorted = [...stats].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity,
      bv = b[sortKey] ?? -Infinity;
    return bv - av;
  });

  // Bar chart: avg HR comparison
  const barData = sorted.map((s) => ({
    name: s.name.split(" ")[0],
    avgHR: s.avgHR,
    maxHR: s.maxHR,
    color: s.color,
  }));

  // Radar chart: normalised metrics
  const radarMetrics = ["avgHR", "avgTemp", "avgResp", "avgMag", "fatigue"];
  const radarLabels = ["Heart Rate", "Temp", "Resp", "Motion", "Fatigue"];
  const mins = Object.fromEntries(
    radarMetrics.map((k) => [
      k,
      Math.min(...stats.map((s) => s[k] ?? Infinity)),
    ]),
  );
  const maxs = Object.fromEntries(
    radarMetrics.map((k) => [
      k,
      Math.max(...stats.map((s) => s[k] ?? -Infinity)),
    ]),
  );
  const radarData = radarLabels.map((label, i) => {
    const key = radarMetrics[i];
    const entry = { metric: label };
    stats.forEach((s) => {
      entry[s.id] = normalize(s[key] ?? 0, mins[key], maxs[key]);
    });
    return entry;
  });

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
        <p style={{ color: t.muted }}>Loading…</p>
      </main>
    );
  if (athletes.length === 0)
    return (
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: t.muted }}>No athletes in database yet.</p>
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
          MULTI-ATHLETE COMPARISON
        </h2>
        <p style={{ fontSize: 11, color: t.muted }}>
          {athletes.length} athletes · live data
        </p>
      </div>

      {/* Athlete cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div
            key={s.id}
            style={{
              flex: "1 1 160px",
              background: t.card,
              border: `1px solid ${s.color}30`,
              borderRadius: 14,
              padding: "1rem",
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
                background: `linear-gradient(90deg,${s.color},${s.color}40)`,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${s.color}20`,
                  border: `1px solid ${s.color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.avatar}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                  {s.name}
                </p>
                <p style={{ fontSize: 10, color: t.muted }}>{s.sport}</p>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              {[
                {
                  label: "Avg HR",
                  value: s.avgHR != null ? `${s.avgHR} bpm` : "--",
                },
                {
                  label: "Temp",
                  value: s.avgTemp != null ? `${s.avgTemp}°C` : "--",
                },
                {
                  label: "Fatigue",
                  value: s.fatigue != null ? `${s.fatigue}%` : "--",
                },
                { label: "Pts", value: String(s.dataPoints) },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    background: t.surface,
                    borderRadius: 8,
                    padding: "6px 8px",
                  }}
                >
                  <p style={{ fontSize: 9, color: t.muted, fontWeight: 600 }}>
                    {m.label}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: t.text,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 8,
                padding: "4px 8px",
                borderRadius: 6,
                background:
                  s.status === "Optimal"
                    ? t.successBg
                    : s.status === "Moderate"
                      ? t.warningBg
                      : t.dangerBg,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color:
                    s.status === "Optimal"
                      ? t.success
                      : s.status === "Moderate"
                        ? t.warning
                        : t.danger,
                }}
              >
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* HR Comparison bar */}
        <Card title="Heart Rate Comparison" t={t}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={barData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.chartGrid}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: t.faint }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[40, 220]}
                tick={{ fontSize: 9, fill: t.faint }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<ChartTip t={t} />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {
                stats.map((s) => (
                  <Bar
                    key={s.id}
                    dataKey="avgHR"
                    name="Avg HR"
                    fill={s.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                ))[0]
              }
              {barData.map((d, i) => null)}
            </BarChart>
          </ResponsiveContainer>
          {/* Simple bar rendering per athlete */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {sorted.map((s) => {
              const pct = s.avgHR ? Math.min((s.avgHR / 220) * 100, 100) : 0;
              return (
                <div key={s.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: t.text, fontWeight: 600 }}
                    >
                      {s.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: s.color,
                        fontWeight: 700,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {s.avgHR ?? "--"} bpm
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: t.surface,
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: s.color,
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Radar */}
        <Card title="Multi-Metric Radar" t={t}>
          {stats.every((s) => s.dataPoints === 0) ? (
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
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={t.chartGrid} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 10, fill: t.muted }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fill: t.faint }}
                />
                <Tooltip content={<ChartTip t={t} />} />
                {stats.map((s) => (
                  <Radar
                    key={s.id}
                    name={s.name}
                    dataKey={s.id}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.12}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Comparison table */}
      <Card title="Full Comparison Table" t={t} span={2}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr>
                {[
                  "Athlete",
                  "Sport",
                  "Avg HR",
                  "Max HR",
                  "Avg Temp",
                  "Avg Resp",
                  "Fatigue",
                  "Status",
                  "Readings",
                ].map((col) => (
                  <th
                    key={col}
                    onClick={() => {
                      const k = {
                        "Avg HR": "avgHR",
                        "Max HR": "maxHR",
                        "Avg Temp": "avgTemp",
                        "Avg Resp": "avgResp",
                        Fatigue: "fatigue",
                        Readings: "dataPoints",
                      }[col];
                      if (k) setSortKey(k);
                    }}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: t.muted,
                      borderBottom: `1px solid ${t.border}`,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    background: i % 2 === 0 ? "transparent" : t.surface,
                  }}
                >
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: `${s.color}20`,
                          border: `1px solid ${s.color}40`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 800,
                          color: s.color,
                        }}
                      >
                        {s.avatar}
                      </div>
                      <div>
                        <p
                          style={{
                            fontWeight: 700,
                            color: t.text,
                            fontSize: 12,
                          }}
                        >
                          {s.name}
                        </p>
                        <p style={{ fontSize: 10, color: t.muted }}>{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                      color: t.muted,
                      fontSize: 11,
                    }}
                  >
                    {s.sport}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                      fontWeight: 700,
                      color: "#ef4444",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {s.avgHR ?? "--"}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                      fontWeight: 600,
                      color: t.text,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {s.maxHR ?? "--"}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                      color: "#f59e0b",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {s.avgTemp ?? "--"}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                      color: "#3b82f6",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {s.avgResp ?? "--"}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                      fontWeight: 700,
                      color: t.text,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {s.fatigue ?? "--"}%
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background:
                          s.status === "Optimal"
                            ? t.successBg
                            : s.status === "Moderate"
                              ? t.warningBg
                              : t.dangerBg,
                        color:
                          s.status === "Optimal"
                            ? t.success
                            : s.status === "Moderate"
                              ? t.warning
                              : t.danger,
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.border}`,
                      color: t.muted,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {s.dataPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
