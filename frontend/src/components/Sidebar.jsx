import { Activity, BarChart2, Heart, Users, LogOut, Wifi, WifiOff, Moon, Sun, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'performance', label: 'Performance', icon: BarChart2 },
  { id: 'recovery', label: 'Recovery', icon: Heart },
];

const adminNavItems = [
  { id: 'athletes', label: 'All Athletes', icon: Users },
];

export default function Sidebar({ active, onChange, connected }) {
  const { user, logout, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.role === 'admin';

  const allNav = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <aside className="flex flex-col h-full bg-card border-r border-premium-200 w-72 min-w-[18rem] shadow-sm relative z-20">
      {/* Logo */}
      <div className="p-6 border-b border-premium-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[52px] h-10 rounded-xl bg-surface-primary border border-indigo-100 flex items-center justify-center shadow-sm">
            <Activity size={20} className="text-accent-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-widest text-premium-900 leading-none">ATHLETISENSE</h1>
            <p className="text-xs text-premium-500 font-medium tracking-wide mt-1">v2.0 · IoT Platform</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-5 mx-3 mt-4 bg-surface rounded-2xl border border-premium-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center text-sm font-bold text-accent-primary shadow-sm">
            {user?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-premium-900 truncate">{user?.name || 'User'}</p>
            <p className="text-xs font-medium text-premium-500 truncate">{user?.title || 'Member'}</p>
          </div>
          <div className={`p-1.5 rounded-full ${connected ? 'bg-surface-success text-accent-success' : 'bg-surface-muted text-premium-400'}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold tracking-wider uppercase ${isAdmin
            ? 'text-accent-primary border-indigo-200 bg-surface-primary'
            : 'text-emerald-700 border-emerald-200 bg-surface-success'
            }`}>
            {isAdmin ? '🛡️ STAFF' : '🏃 ATHLETE'}
          </span>
          {connected && <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-accent-success bg-surface-success px-2 py-1 rounded-full border border-emerald-100">
            <span className="live-dot" /> LIVE
          </span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="metric-label px-3 mb-3">Navigation</p>
        {allNav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`nav-item w-full ${active === id ? 'active' : 'text-premium-500 hover:text-premium-900'}`}
          >
            <Icon size={20} className={active === id ? 'text-accent-primary' : 'text-premium-400'} />
            <span className={active === id ? 'font-bold' : 'font-medium'}>{label}</span>
          </button>
        ))}

        <div className="pt-8">
          <p className="metric-label px-3 mb-3">Preferences</p>
          <button onClick={toggleTheme} className="nav-item w-full text-premium-500 hover:text-premium-900">
            {theme === 'dark' ? <Sun size={20} className="text-premium-400" /> : <Moon size={20} className="text-premium-400" />}
            <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </nav>

      {/* Logout / Delete Account */}
      <div className="p-4 border-t border-premium-100 space-y-2">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 text-sm font-semibold w-full text-premium-500 hover:bg-surface-danger hover:text-accent-danger group"
        >
          <LogOut size={20} className="text-premium-400 group-hover:text-accent-danger transition-colors" />
          <span>Sign Out</span>
        </button>

        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
              deleteAccount();
            }
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 text-sm font-semibold w-full text-premium-500 hover:bg-surface-danger hover:text-accent-danger group"
        >
          <Trash2 size={20} className="text-premium-400 group-hover:text-accent-danger transition-colors" />
          <span>Delete Account</span>
        </button>
      </div>
    </aside>
  );
}
