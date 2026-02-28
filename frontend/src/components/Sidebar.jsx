import { Activity, BarChart2, Heart, Users, LogOut, Wifi, WifiOff, Moon, Sun, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';

const navItems = [
  { id: 'monitoring', label: 'Live Monitoring', icon: Activity, desc: 'Real-time sensors' },
  { id: 'performance', label: 'Performance', icon: BarChart2, desc: 'Analytics & trends' },
  { id: 'recovery', label: 'Recovery', icon: Heart, desc: 'Rest & recovery data' },
];

const adminNavItems = [
  { id: 'athletes', label: 'All Athletes', icon: Users, desc: 'Team overview' },
];

function NavItem({ item, active, onClick, index }) {
  const [mounted, setMounted] = useState(false);
  const isActive = active === item.id;
  const Icon = item.icon;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 60 + 100);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <button
      onClick={onClick}
      className={`nav-item w-full ${isActive ? 'active' : ''}`}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
        transition: 'opacity 0.3s ease, transform 0.35s ease',
      }}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive ? 'rgba(79,70,229,0.14)' : 'transparent',
          border: `1px solid ${isActive ? 'rgba(79,70,229,0.22)' : 'transparent'}`,
          transition: 'all 0.2s ease',
        }}
      >
        <Icon
          size={16}
          strokeWidth={isActive ? 2.5 : 2}
          style={{ color: isActive ? 'var(--accent-indigo)' : 'var(--text-faint)' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
            lineHeight: 1.2,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'color 0.2s ease',
          }}
        >
          {item.label}
        </p>
        {item.desc && (
          <p
            style={{
              fontSize: 10, fontWeight: 500,
              color: isActive ? 'var(--text-muted)' : 'var(--text-faint)',
              lineHeight: 1,
              marginTop: 2,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'color 0.2s ease',
            }}
          >
            {item.desc}
          </p>
        )}
      </div>
      {isActive && (
        <div
          style={{
            width: 5, height: 5, borderRadius: 999,
            background: 'var(--accent-indigo)',
            flexShrink: 0,
            boxShadow: '0 0 6px rgba(79,70,229,0.6)',
          }}
        />
      )}
    </button>
  );
}

export default function Sidebar({ active, onChange, connected }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isAdmin = user?.role === 'admin';
  const allNav = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <aside
      style={{
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-subtle)',
        width: '18rem', minWidth: '18rem',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        position: 'relative', zIndex: 20,
        boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
        transition: 'background 0.4s ease, border-color 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* Ambient mesh */}
      <div
        style={{
          position: 'absolute', top: -40, left: -20,
          width: 200, height: 200,
          background: 'radial-gradient(circle, var(--glow-indigo), transparent 70%)',
          pointerEvents: 'none',
          animation: 'float 8s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* ── Logo ───────────────────────────────────────── */}
      <div
        style={{
          padding: '1.5rem 1.25rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          position: 'relative',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(-6px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {/* Logo mark */}
          <div
            style={{
              width: 42, height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px var(--glow-indigo)',
              flexShrink: 0,
            }}
          >
            <Activity size={20} color="#fff" strokeWidth={2.5} />
          </div>

          <div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 18, fontWeight: 800,
                letterSpacing: '0.14em',
                color: 'var(--text-primary)',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              ATHLETISENSE
            </h1>
            <p
              style={{
                fontSize: 10, fontWeight: 600,
                color: 'var(--text-faint)',
                marginTop: 4,
                letterSpacing: '0.06em',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              v2.0 · IoT Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── User Card ───────────────────────────────────── */}
      <div
        style={{
          margin: '0.875rem 0.875rem 0',
          background: 'var(--bg-surface)',
          borderRadius: 16,
          border: '1px solid var(--border-subtle)',
          padding: '0.875rem',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(6px)',
          transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Avatar */}
          <div
            style={{
              width: 38, height: 38, borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(79,70,229,0.20), rgba(124,58,237,0.20))',
              border: '2px solid rgba(79,70,229,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800,
              color: 'var(--accent-indigo)',
              fontFamily: "'Syne', sans-serif",
              flexShrink: 0,
              boxShadow: '0 2px 8px var(--glow-indigo)',
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 13, fontWeight: 700,
                color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {user?.name || 'User'}
            </p>
            <p
              style={{
                fontSize: 11, fontWeight: 500,
                color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {user?.title || 'Member'}
            </p>
          </div>

          {/* Connection dot */}
          <div
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: connected ? 'rgba(5,150,105,0.12)' : 'var(--bg-surface-alt)',
              border: `1px solid ${connected ? 'rgba(5,150,105,0.22)' : 'var(--border-subtle)'}`,
            }}
          >
            {connected
              ? <Wifi size={13} style={{ color: 'var(--accent-emerald)' }} />
              : <WifiOff size={13} style={{ color: 'var(--text-faint)' }} />
            }
          </div>
        </div>

        {/* Role + Live badges */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 9, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '3px 9px', borderRadius: 6,
              fontFamily: "'DM Mono', monospace",
              ...(isAdmin
                ? { color: 'var(--accent-indigo)', background: 'rgba(79,70,229,0.10)', border: '1px solid rgba(79,70,229,0.20)' }
                : { color: 'var(--accent-emerald)', background: 'rgba(5,150,105,0.10)', border: '1px solid rgba(5,150,105,0.20)' }
              ),
            }}
          >
            {isAdmin ? '⚡ STAFF' : '🏃 ATHLETE'}
          </span>

          {connected && (
            <span
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                color: 'var(--accent-emerald)',
                background: 'rgba(5,150,105,0.10)',
                border: '1px solid rgba(5,150,105,0.20)',
                padding: '3px 9px', borderRadius: 6,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <span className="live-dot" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav
        style={{
          flex: 1, padding: '1rem 0.75rem',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
        }}
      >
        <p className="metric-label" style={{ padding: '0 0.5rem', marginBottom: 8 }}>Navigation</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {allNav.map((item, i) => (
            <NavItem
              key={item.id}
              item={item}
              active={active}
              onClick={() => onChange(item.id)}
              index={i}
            />
          ))}
        </div>

        {/* Preferences section */}
        <div style={{ marginTop: 24 }}>
          <p className="metric-label" style={{ padding: '0 0.5rem', marginBottom: 8 }}>Preferences</p>

          <button
            onClick={toggleTheme}
            className="nav-item w-full"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <div
              style={{
                width: 30, height: 30, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            >
              {theme === 'dark'
                ? <Sun size={15} style={{ color: 'var(--accent-amber)' }} />
                : <Moon size={15} style={{ color: 'var(--accent-indigo)' }} />
              }
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Switch appearance
              </p>
            </div>
          </button>
        </div>
      </nav>

      {/* ── Sign Out ─────────────────────────────────────── */}
      <div
        style={{
          padding: '0.875rem',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: 12, cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: 13, fontWeight: 600,
            width: '100%', border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(225,29,72,0.08)';
            e.currentTarget.style.color = 'var(--accent-rose)';
            e.currentTarget.style.borderColor = 'rgba(225,29,72,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
