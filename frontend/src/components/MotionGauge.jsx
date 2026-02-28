import { useEffect, useRef, useState } from 'react';

export default function MotionGauge({ value = 0, max = 15 }) {
  const pct = Math.min(value / max, 1);
  const [animPct, setAnimPct] = useState(0);
  const [mounted, setMounted] = useState(false);
  const reqRef = useRef();
  const prevPctRef = useRef(0);

  // Smooth animation on mount and value change
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const target = pct;
    const start = prevPctRef.current;
    const startTime = performance.now();
    const duration = 800;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      setAnimPct(current);
      if (progress < 1) {
        reqRef.current = requestAnimationFrame(animate);
      } else {
        prevPctRef.current = target;
      }
    };

    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current);
  }, [pct]);

  const getColor = (p) => {
    if (p < 0.33) return '#10b981';
    if (p < 0.66) return '#f59e0b';
    return '#ef4444';
  };

  const color = getColor(animPct);
  const score = (animPct * 10).toFixed(1);

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx, cy, r, startAngle, endAngle) {
    const clampedEnd = Math.max(startAngle + 0.01, endAngle);
    const s = polarToCartesian(cx, cy, r, startAngle);
    const e = polarToCartesian(cx, cy, r, clampedEnd);
    const large = clampedEnd - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const needleAngle = -135 + animPct * 270;
  const cx = 80, cy = 80, r = 55;

  // Tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const tickPct = i / 10;
    const tickAngle = -135 + tickPct * 270;
    const isMajor = i % 5 === 0;
    const inner = polarToCartesian(cx, cy, r - (isMajor ? 10 : 6), tickAngle + 90);
    const outer = polarToCartesian(cx, cy, r + 2, tickAngle + 90);
    return { inner, outer, isMajor, tickPct };
  });

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275)',
      }}
    >
      <p className="metric-label" style={{ marginBottom: 8, alignSelf: 'flex-start', marginLeft: 16 }}>
        Motion Gauge
      </p>

      <svg viewBox="0 0 160 150" style={{ width: '100%', maxWidth: 220 }} aria-label={`Motion intensity: ${score}`}>
        <defs>
          {/* Gradient for arc fill */}
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          {/* Drop shadow filter */}
          <filter id="needleShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" floodColor="#000" />
          </filter>
          <filter id="gaugeShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" floodColor="#000" />
          </filter>
          {/* Glow filter for colored arc */}
          <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring background */}
        <circle cx={cx} cy={cy} r={r + 8} fill="none"
          stroke="var(--border-subtle)" strokeWidth="1" />

        {/* Background arc track */}
        <path
          d={arcPath(cx, cy, r, 135, 405)}
          fill="none"
          stroke="var(--bg-surface-alt)"
          strokeWidth="14"
          strokeLinecap="round"
          className="gauge-bg"
        />

        {/* Subtle full gradient hint */}
        {animPct < 0.99 && (
          <path
            d={arcPath(cx, cy, r, 135, 405)}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.08"
          />
        )}

        {/* Filled arc */}
        {animPct > 0.001 && (
          <path
            d={arcPath(cx, cy, r, 135, 135 + animPct * 270)}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#arcGlow)"
            style={{ transition: 'stroke 0.4s ease' }}
          />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.outer.x} y1={t.outer.y}
            x2={t.inner.x} y2={t.inner.y}
            stroke={t.isMajor ? 'var(--text-muted)' : 'var(--border-medium)'}
            strokeWidth={t.isMajor ? 1.5 : 0.8}
            strokeLinecap="round"
          />
        ))}

        {/* Zone labels */}
        <text x="19" y="108" fill="#10b981" fontSize="7.5" fontWeight="800"
          fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle"
          style={{ letterSpacing: '0.08em' }}>
          LOW
        </text>
        <text x="80" y="26" fill="#f59e0b" fontSize="7.5" fontWeight="800"
          fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle"
          style={{ letterSpacing: '0.08em' }}>
          MED
        </text>
        <text x="141" y="108" fill="#ef4444" fontSize="7.5" fontWeight="800"
          fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle"
          style={{ letterSpacing: '0.08em' }}>
          HIGH
        </text>

        {/* Needle */}
        <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
          {/* Needle body */}
          <path
            d={`M ${cx} ${cy + 4} L ${cx - 2} ${cy - 2} L ${cx} ${cy - 42} L ${cx + 2} ${cy - 2} Z`}
            fill={color}
            filter="url(#needleShadow)"
            style={{ transition: 'fill 0.4s ease' }}
          />
          {/* Needle counter-weight */}
          <path
            d={`M ${cx} ${cy + 4} L ${cx - 2.5} ${cy + 2} L ${cx} ${cy + 14} L ${cx + 2.5} ${cy + 2} Z`}
            fill="var(--text-faint)"
          />
        </g>

        {/* Center pivot */}
        <circle cx={cx} cy={cy} r="7"
          fill="var(--bg-card)"
          stroke={color}
          strokeWidth="2.5"
          className="gauge-center-dot"
          style={{ filter: `drop-shadow(0 2px 6px ${color}60)`, transition: 'stroke 0.4s ease' }}
        />
        <circle cx={cx} cy={cy} r="3" fill={color} style={{ transition: 'fill 0.4s ease' }} />

        {/* Score value */}
        <text x={cx} y={cy + 32}
          fill={color}
          fontSize="26" fontWeight="700"
          fontFamily="'DM Mono', monospace"
          textAnchor="middle"
          style={{ letterSpacing: '-1px', transition: 'fill 0.4s ease' }}>
          {score}
        </text>

        {/* Label */}
        <text x={cx} y={cy + 47}
          fill="var(--text-muted)"
          fontSize="7" fontWeight="700"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          textAnchor="middle"
          style={{ letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          INTENSITY SCORE
        </text>

        {/* Raw value */}
        <text x={cx} y={cy + 58}
          fill="var(--text-faint)"
          fontSize="7"
          fontFamily="'DM Mono', monospace"
          textAnchor="middle"
          fontWeight="500">
          {value.toFixed(2)}g / {max}g max
        </text>
      </svg>

      {/* Zone bar below */}
      <div style={{
        width: '80%', maxWidth: 180,
        height: 4, borderRadius: 99,
        background: 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)',
        marginTop: -4, marginBottom: 4,
        opacity: 0.35,
      }} />
    </div>
  );
}
