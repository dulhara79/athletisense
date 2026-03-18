export default function MotionGauge({ value = 0, max = 15 }) {
  const pct = Math.min(value / max, 1);
  const startAngle = 270;
  const endAngle = 270 + pct * 180;

  const getColor = (p) => {
    if (p < 0.33) return '#10b981'; // emerald-500 (success)
    if (p < 0.66) return '#f59e0b'; // amber-500 (warning)
    return '#ef4444'; // red-500 (danger)
  };

  const color = getColor(pct);
  const score = (pct * 10).toFixed(1);

  const cx = 80, cy = 110, r = 60;
  function pt(angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arcPath(start, end) {
    if (end - start < 0.01) return "";
    const s = pt(start);
    const e = pt(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  return (
    <div className="flex flex-col items-center w-full">
      <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-2 self-start ml-4">Motion Gauge</p>
      <svg viewBox="0 0 160 120" className="w-full max-w-[200px]">
        {/* Background arc */}
        <path
          d={arcPath(270, 450)}
          fill="none" stroke="#f1f5f9" strokeWidth="14" strokeLinecap="round" // slate-100
        />
        {/* Colored fill arc */}
        {pct > 0 && (
          <path
             d={arcPath(270, endAngle)}
             fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
             style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        )}
        {/* Center value */}
        <text x="80" y="100" fill={color} fontSize="36" fontWeight="900"
          fontFamily="'DM Sans', sans-serif" textAnchor="middle" style={{ letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
          {score}
        </text>
        <text x="80" y="115" fill="#64748b" fontSize="9" fontWeight="800" fontFamily="'DM Sans', sans-serif" textAnchor="middle" style={{ letterSpacing: '0.08em' }}>
          INTENSITY
        </text>
      </svg>
    </div>
  );
}
