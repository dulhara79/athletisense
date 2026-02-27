import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MetricCard({ label, value, unit, icon: Icon, color = 'primary', sub, trend }) {
  const colors = {
    primary: { text: 'text-accent-primary', bg: 'bg-indigo-50', border: 'border-indigo-100', gradient: 'from-accent-primary/60' },
    success: { text: 'text-accent-success', bg: 'bg-emerald-50', border: 'border-emerald-100', gradient: 'from-accent-success/60' },
    warning: { text: 'text-accent-warning', bg: 'bg-amber-50', border: 'border-amber-100', gradient: 'from-accent-warning/60' },
    danger: { text: 'text-accent-danger', bg: 'bg-rose-50', border: 'border-rose-100', gradient: 'from-accent-danger/60' },
    purple: { text: 'text-accent-purple', bg: 'bg-violet-50', border: 'border-violet-100', gradient: 'from-accent-purple/60' }
  };

  const c = colors[color] || colors.primary;

  return (
    <div className={`card bg-card border-premium-200 shadow-sm hover:shadow-premium-hover transition-all duration-300 animate-fade-up relative overflow-hidden group`}>
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.gradient} to-transparent opacity-70`} />

      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-premium-500 mt-1">{label}</p>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={18} className={c.text} />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mb-1">
        <span className={`font-mono text-3xl font-black ${c.text} tracking-tight`}>
          {typeof value === 'number' ? value.toFixed(value > 100 ? 0 : 1) : value}
        </span>
        {unit && <span className="text-sm font-bold text-premium-400 mb-1">{unit}</span>}
        {trend !== undefined && (
          <span className={`mb-1.5 ml-auto font-bold flex items-center gap-0.5 text-xs ${trend >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
            {trend >= 0 ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
          </span>
        )}
      </div>

      {sub && <p className="text-xs font-bold text-premium-400 mt-2 bg-surface inline-block px-2 py-0.5 rounded-md border border-premium-100">{sub}</p>}
    </div>
  );
}
