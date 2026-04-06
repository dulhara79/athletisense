// src/pages/MainLayout.jsx
// ─────────────────────────────────────────────────────────────
// Application shell: sidebar, routing, floating chat widget.
// Theme is managed by ThemeContext (no local state duplication).
// ─────────────────────────────────────────────────────────────
import { lazy, Suspense, useState } from "react";
import {
  Activity,
  BarChart2,
  Heart,
  Users,
  LogOut,
  Trash2,
  Sun,
  Moon,
  Link2,
  Eye,
  Wifi,
  WifiOff,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ConnectionManager } from "../components/connections";
import { ManageConnections } from "../components/connections";
import { useAthleteData } from "../hooks/useAthleteData";

// Code-split heavy dashboard pages
const AthletiSenseDashboard = lazy(() => import("./AthletiSenseDashboard"));
const PerformanceAnalytics = lazy(() => import("./PerformanceAnalytics"));
const FatigueRecovery = lazy(() => import("./FatigueRecovery"));
const MultiAthleteComparison = lazy(() => import("./MultiAthleteComparison"));
const VisualAnalyticsDashboard = lazy(
  () => import("./VisualAnalyticsDashboard"),
);
const AthletiSenseChat = lazy(() => import("../components/AthletiSenseChat"));

const NAV_ITEMS = [
  {
    id: "monitoring",
    label: "Monitoring",
    icon: Activity,
    desc: "Real-time sensors",
  },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart2,
    desc: "Analytics & trends",
  },
  {
    id: "recovery",
    label: "Recovery",
    icon: Heart,
    desc: "Rest & recovery data",
  },
  {
    id: "comparison",
    label: "Comparison",
    icon: Users,
    desc: "Multi-athlete view",
    adminOnly: true,
  },
  {
    id: "analytics",
    label: "Visual Analytics",
    icon: Eye,
    desc: "Insights & storytelling",
  },
  {
    id: "connections",
    label: "Connections",
    icon: Link2,
    desc: "Manage your team",
  },
];

function PageLoader() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "#6b6a66",
      }}
    >
      Loading…
    </div>
  );
}

export default function MainLayout() {
  const { user, logout, deleteAccount } = useAuth();
  const { t, theme, toggleTheme } = useTheme();
  const { connected } = useAthleteData();
  const [page, setPage] = useState("monitoring");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const visibleNav = NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: t.bg,
        color: t.text,
        fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:99px}
        @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .page-enter{animation:fadein 0.3s ease both}

        .sidebar-overlay {
          position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
          opacity: 0; pointer-events: none; transition: opacity 0.3s;
        }
        .sidebar-overlay.open { opacity: 1; pointer-events: auto; }
        .sidebar { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .mobile-header { display: none; }
        .content-area { flex: 1; overflow: auto; display: flex; flex-direction: column; }
        @media (max-width: 768px) {
          .sidebar { position: fixed; top: 0; bottom: 0; left: 0; z-index: 50; transform: translateX(-100%); width: 260px !important; }
          .sidebar.open { transform: translateX(0); }
          .mobile-header {
            display: flex; align-items: center; justify-content: space-between;
            height: 60px; padding: 0 16px; background: ${t.sidebar}; border-bottom: 1px solid ${t.border};
            position: fixed; top: 0; left: 0; right: 0; z-index: 30;
          }
          .content-area { padding-top: 60px; }
        }
      `}</style>

      {/* Mobile Top Header (only visible on small screens) */}
      <div className="mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={16} color="#fff" />
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue','Syne',sans-serif",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: t.text,
              lineHeight: 1,
            }}
          >
            ATHLETISENSE
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          style={{ background: "transparent", border: "none", color: t.text }}
        >
          <Menu size={24} />
        </button>
      </div>

      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}
        style={{
          width: 256,
          minWidth: 256,
          background: t.sidebar,
          borderRight: `1px solid ${t.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Logo */}
        <div
          style={{ padding: "1.25rem", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 46,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(79,70,229,0.35)",
              }}
            >
              <Activity size={17} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Bebas Neue','Syne',sans-serif",
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  color: t.text,
                  lineHeight: 1,
                }}
              >
                ATHLETISENSE
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: t.faint,
                  letterSpacing: "0.06em",
                  lineHeight: 1.2,
                }}
              >
                v2.0 · IoT Platform
              </div>
            </div>
          </div>
          {/* Close button for mobile within sidebar */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md-hidden-btn"
            style={{ background: "transparent", border: "none", color: t.muted, cursor: "pointer" }}
          >
            <style>{`@media (min-width: 769px) { .md-hidden-btn { display: none !important; } }`}</style>
            <X size={20} />
          </button>
        </div>

        {/* User card */}
        <div
          style={{
            margin: "10px 12px 0",
            padding: "10px 12px",
            background: t.surface,
            borderRadius: 12,
            border: `1px solid ${t.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: t.accentBg,
                border: `1px solid ${t.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: t.accent,
                flexShrink: 0,
              }}
            >
              {user?.name?.charAt(0) || "?"}
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
                {user?.name || "User"}
              </p>
              <p style={{ fontSize: 10, color: t.muted }}>
                {user?.title || "Member"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {connected ? (
                <Wifi size={12} color={t.success} />
              ) : (
                <WifiOff size={12} color={t.muted} />
              )}
              <ConnectionManager t={t} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 20,
                background: isAdmin ? t.accentBg : t.successBg,
                color: isAdmin ? t.accent : t.success,
                border: `1px solid ${isAdmin ? t.accent + "30" : t.success + "30"}`,
              }}
            >
              {isAdmin ? "🛡️ STAFF" : "🏃 ATHLETE"}
            </span>
            {connected && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 20,
                  background: t.successBg,
                  color: t.success,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: t.success,
                    animation: "pulse-dot 1.6s ease-in-out infinite",
                  }}
                />
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: t.faint,
              padding: "8px 8px 4px",
            }}
          >
            Navigation
          </p>
          {visibleNav.map(({ id, label, icon: Icon, desc }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setPage(id);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  marginBottom: 2,
                  background: active ? t.accentBg : "transparent",
                  border: `1px solid ${active ? t.accent + "25" : "transparent"}`,
                  cursor: "pointer",
                }}
              >
                <Icon
                  size={15}
                  color={active ? t.accent : t.muted}
                  strokeWidth={active ? 2.5 : 2}
                />
                <div style={{ textAlign: "left" }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      color: active ? t.text : t.muted,
                    }}
                  >
                    {label}
                  </p>
                  <p style={{ fontSize: 9, color: t.faint }}>{desc}</p>
                </div>
                {active && (
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: t.accent,
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Theme toggle */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${t.border}`,
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: t.faint,
                padding: "0 8px 4px",
              }}
            >
              Preferences
            </p>
            <button
              onClick={toggleTheme}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid transparent",
                cursor: "pointer",
              }}
            >
              {theme === "dark" ? (
                <Sun size={15} color={t.warning} />
              ) : (
                <Moon size={15} color={t.accent} />
              )}
              <p style={{ fontSize: 12, fontWeight: 500, color: t.muted }}>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </p>
            </button>
          </div>
        </nav>

        {/* Auth actions */}
        <div
          style={{
            padding: "8px",
            borderTop: `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = t.dangerBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <LogOut size={14} color={t.danger} />
            <span style={{ fontSize: 12, fontWeight: 700, color: t.danger }}>
              Sign Out
            </span>
          </button>
          <button
            onClick={() =>
              window.confirm("Delete your account? This cannot be undone.") &&
              deleteAccount()
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = t.dangerBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Trash2 size={14} color={t.danger} />
            <span style={{ fontSize: 12, fontWeight: 700, color: t.danger }}>
              Delete Account
            </span>
          </button>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────── */}
      <Suspense fallback={<PageLoader />}>
        <div
          className="page-enter content-area"
          key={page}
        >
          {page === "monitoring" && <AthletiSenseDashboard t={t} />}
          {page === "performance" && <PerformanceAnalytics t={t} />}
          {page === "recovery" && <FatigueRecovery t={t} />}
          {page === "comparison" && isAdmin && <MultiAthleteComparison t={t} />}
          {page === "analytics" && <VisualAnalyticsDashboard t={t} />}
          {page === "connections" && <ManageConnections t={t} />}
        </div>
      </Suspense>

      {/* Floating AI Chat */}
      <Suspense fallback={null}>
        <AthletiSenseChat t={t} />
      </Suspense>
    </div>
  );
}
