import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const COLOR_CONFIG = {
  primary: {
    text:       'var(--accent-indigo)',
    bg:         'rgba(79,70,229,0.08)',
    border:     'rgba(79,70,229,0.15)',
    gradient:   'linear-gradient(135deg, rgba(79,70,229,0.6), transparent)',
    glow:       'var(--glow-indigo)',
    badgeBg:    'rgba(79,70,229,0.10)',
  },
  success: {
    text:       'var(--accent-emerald)',
    bg:         'rgba(5,150,105,0.08)',
    border:     'rgba(5,150,105,0.15)',
    gradient:   'linear-gradient(135deg, rgba(5,150,105,0.6), transparent)',
    glow:       'var(--glow-emerald)',
    badgeBg:    'rgba(5,150,105,0.10)',
  },
  warning: {
    text:       'var(--accent-amber)',
    bg:         'rgba(217,119,6,0.08)',
    border:     'rgba(217,119,6,0.15)',
    gradient:   'linear-gradient(135deg, rgba(217,119,6,0.6), transparent)',
    glow:       'var(--glow-amber)',
    badgeBg:    'rgba(217,119,6,0.10)',
  },
  danger: {
    text:       'var(--accent-rose)',
    bg:         'rgba(225,29,72,0.08)',
    border:     'rgba(225,29,72,0.15)',
    gradient:   'linear-gradient(135deg, rgba(225,29,72,0.6), transparent)',
    glow:       'var(--glow-rose)',
    badgeBg:    'rgba(225,29,72,0.10)',
  },
  purple: {
    text:       'var(--accent-violet)',
    bg:         'rgba(124,58,237,0.08)',
    border:     'rgba(124,58,237,0.15)',
    gradient:   'linear-gradient(135deg, rgba(124,58,237,0.6), transparent)',
    glow:       'rgba(124,58,237,0.20)',
    badgeBg:    'rgba(124,58,237,0.10)',
  },
  cyan: {
    text:       'var(--accent-cyan)',
    bg:         'rgba(8,145,178,0.08)',
    border:     'rgba(8,145,178,0.15)',
    gradient:   'linear-gradient(135deg, rgba(8,145,178,0.6), transparent)',
    glow:       'rgba(8,145,178,0.20)',
    badgeBg:    'rgba(8,145,178,0.10)',
  },
};

// Animates numeric value changes
function AnimatedNumber({ value, isNum, isLargeNum }) {
  const [display, setDisplay] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setAnimating(true);
      const t = setTimeout(() => {
        setDisplay(value);
        setAnimating(false);
      }, 150);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  const formatted = isNum
    ? (typeof display === 'number'
        ? display.toFixed(isLargeNum ? 0 : 1)
        : display)
    : display;

  return (
    <span
      style={{
        display: 'inline-block',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      {formatted}
    </span>
  );
}

export default function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  color = 'primary',
  sub,
  trend,
  animated = true,
}) {
  const c = COLOR_CONFIG[color] || COLOR_CONFIG.primary;
  const isNum = typeof value === 'number';
  const isLargeNum = isNum && value > 100;
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="metric-card animate-fade-up"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: mounted ? 1 : 0,
        '--card-glow': c.glow,
      }}
    >
      {/* Top accent gradient bar */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: c.gradient,
          borderRadius: '14px 14px 0 0',
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Subtle ambient glow on hover */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 20% 20%, ${c.glow}, transparent 70%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.4s ease',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem', position: 'relative' }}>
        <p
          style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginTop: 2, lineHeight: 1,
          }}
        >
          {label}
        </p>

        {Icon && (
          <div
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: hovered ? `0 4px 14px ${c.glow}` : 'none',
              transform: hovered ? 'scale(1.08) rotate(-4deg)' : 'scale(1) rotate(0deg)',
              transition: 'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.3s ease',
              flexShrink: 0,
            }}
          >
            <Icon size={17} style={{ color: c.text }} strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', marginBottom: '0.25rem', position: 'relative' }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: isLargeNum ? '2rem' : '2.25rem',
            fontWeight: 700,
            color: c.text,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {animated && isNum
            ? <AnimatedNumber value={value} isNum={isNum} isLargeNum={isLargeNum} />
            : (isNum ? value.toFixed(isLargeNum ? 0 : 1) : value)
          }
        </span>

        {unit && (
          <span
            style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: 3,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {unit}
          </span>
        )}

        {trend !== undefined && (
          <span
            style={{
              marginBottom: 4, marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontWeight: 800,
              color: trend > 0 ? 'var(--accent-emerald)' : trend < 0 ? 'var(--accent-rose)' : 'var(--text-muted)',
              background: trend > 0 ? 'rgba(5,150,105,0.10)' : trend < 0 ? 'rgba(225,29,72,0.10)' : 'var(--bg-surface-alt)',
              padding: '3px 7px',
              borderRadius: 7,
              border: `1px solid ${trend > 0 ? 'rgba(5,150,105,0.18)' : trend < 0 ? 'rgba(225,29,72,0.18)' : 'var(--border-subtle)'}`,
            }}
          >
            {trend > 0
              ? <TrendingUp size={12} strokeWidth={3} />
              : trend < 0
              ? <TrendingDown size={12} strokeWidth={3} />
              : <Minus size={12} strokeWidth={3} />
            }
            {Math.abs(trend) > 0 && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                {trend > 0 ? '+' : ''}{trend}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Sub label */}
      {sub && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 10, fontWeight: 700,
            color: 'var(--text-muted)',
            background: 'var(--bg-surface)',
            padding: '3px 9px',
            borderRadius: 7,
            border: '1px solid var(--border-subtle)',
            marginTop: 6,
            position: 'relative',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '0.02em',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
