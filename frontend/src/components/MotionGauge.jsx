export default function MotionGauge({ value = 0, max = 15 }) {
  const pct = Math.min(value / max, 1);
  const angle = -135 + pct * 270; // -135° to +135°

  const getColor = (p) => {
    if (p < 0.33) return '#10b981'; // emerald-500 (success)
    if (p < 0.66) return '#f59e0b'; // amber-500 (warning)
    return '#ef4444'; // red-500 (danger)
  };

  const color = getColor(pct);
  const score = (pct * 10).toFixed(1);

  // Arc path for gauge
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx, cy, r, startAngle, endAngle) {
    const s = polarToCartesian(cx, cy, r, startAngle);
    const e = polarToCartesian(cx, cy, r, endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const cx = 80, cy = 80, r = 55;
  const startAngle = -45; // 225° in standard, we use offset
  const endAngle = 225;

  return (
    <div className="flex flex-col items-center w-full">
      <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mb-2 self-start ml-4">Motion Gauge</p>
      <svg viewBox="0 0 160 140" className="w-full max-w-[200px]">
        {/* Background arc */}
        <path
          d={arcPath(80, 80, 55, 135, 405)}
          fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round" // slate-100
        />
        {/* Colored fill arc */}
        {pct > 0 && (
          <path
            d={arcPath(80, 80, 55, 135, 135 + pct * 270)}
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        )}
        {/* Zone labels */}
        <text x="20" y="105" fill="#10b981" fontSize="8" fontWeight="800" fontFamily="Inter, sans-serif" textAnchor="middle">LOW</text>
        <text x="80" y="30" fill="#f59e0b" fontSize="8" fontWeight="800" fontFamily="Inter, sans-serif" textAnchor="middle">MED</text>
        <text x="140" y="105" fill="#ef4444" fontSize="8" fontWeight="800" fontFamily="Inter, sans-serif" textAnchor="middle">HIGH</text>

        {/* Needle */}
        <g transform={`rotate(${angle}, 80, 80)`}>
          <line x1="80" y1="80" x2="80" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.1))`, transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          <circle cx="80" cy="80" r="5" fill="#0f172a" stroke="#ffffff" strokeWidth="2" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.1))` }} />
        </g>

        {/* Center value */}
        <text x="80" y="110" fill={color} fontSize="28" fontWeight="900"
          fontFamily="Inter, sans-serif" textAnchor="middle" style={{ letterSpacing: '-1px' }}>
          {score}
        </text>
        <text x="80" y="125" fill="#64748b" fontSize="8" fontWeight="800" fontFamily="Inter, sans-serif" textAnchor="middle" style={{ letterSpacing: '1px' }}>
          INTENSITY SCORE
        </text>
      </svg>
    </div>
  );
}
