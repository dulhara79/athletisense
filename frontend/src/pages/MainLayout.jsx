/**
 * MainLayout.jsx
 * ─────────────────────────────────────────────────────────────
 * Central layout container with shared sidebar navigation.
 * Controls theme (light/dark) and page routing.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import {
  Activity,
  BarChart2,
  Heart,
  Users,
  Sun,
  Moon,
  LogOut,
  LogIn,
  Link2,
  Trash2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import ConnectionManager from "../components/ConnectionManager";
import ManageConnections from "../components/ManageConnections";

import AthletiSenseDashboard from "./AthletiSenseDashboard";
import PerformanceAnalytics from "./PerformanceAnalytics";
import FatigueRecovery from "./FatigueRecovery";
import MultiAthleteComparison from "./MultiAthleteComparison";

const THEMES = {
  light: {
    bg: "#f5f4f1",
    card: "#ffffff",
    sidebar: "#ffffff",
    border: "#e4e2dd",
    text: "#1a1917",
    muted: "#6b6a66",
    faint: "#9e9c97",
    surface: "#f0eeed",
    surface2: "#e8e6e1",
    accent: "#4f46e5",
    accentBg: "rgba(79,70,229,0.08)",
    danger: "#e11d48",
    dangerBg: "rgba(225,29,72,0.08)",
    warning: "#d97706",
    warningBg: "rgba(217,119,6,0.08)",
    success: "#059669",
    successBg: "rgba(5,150,105,0.08)",
    chartGrid: "#ece9e4",
    shadow: "0 1px 3px rgba(0,0,0,0.07),0 4px 16px rgba(0,0,0,0.04)",
    shadowHover: "0 8px 30px rgba(0,0,0,0.10)",
  },
  dark: {
    bg: "#0e0d0c",
    card: "#191816",
    sidebar: "#131210",
    border: "#282624",
    text: "#f0eeea",
    muted: "#8a8880",
    faint: "#5c5a57",
    surface: "#211f1d",
    surface2: "#2a2826",
    accent: "#6366f1",
    accentBg: "rgba(99,102,241,0.12)",
    danger: "#fb4570",
    dangerBg: "rgba(251,69,112,0.10)",
    warning: "#fbbf24",
    warningBg: "rgba(251,191,36,0.10)",
    success: "#34d399",
    successBg: "rgba(52,211,153,0.10)",
    chartGrid: "#282624",
    shadow: "0 1px 3px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.2)",
    shadowHover: "0 8px 30px rgba(0,0,0,0.4)",
  },
};

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
  },
  {
    id: "connections",
    label: "Connections",
    icon: Link2,
    desc: "Manage your team",
  },
];

export default function MainLayout() {
  const [theme, setTheme] = useState("light");
  const [activePage, setActivePage] = useState("monitoring");

  // Pull user and logout function from your Auth context
  const { user, logout, deleteAccount } = useAuth();

  // Role-based filtering: athletes cannot access the comparison page
  const isAdmin = user?.role === 'admin';

  const t = THEMES[theme];

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
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:99px;}
        @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
        .fadein{animation:fadein 0.35s ease both;}
        th button:hover{background:${t.accentBg}!important;}
        
        /* Subtle hover effect for the logout button */
        .auth-btn:hover { filter: brightness(0.95); }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          background: t.sidebar,
          borderRight: `1px solid ${t.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 30,
          boxShadow: `2px 0 12px rgba(0,0,0,0.04)`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "1.5rem 1.25rem",
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 52,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(79,70,229,0.35)",
              }}
            >
              <Activity size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: t.text,
                }}
              >
                ATHLETISENSE
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: t.faint,
                  fontFamily: "'DM Sans',monospace",
                  letterSpacing: "0.06em",
                  marginTop: 2,
                }}
              >
                v2.0 · IoT Platform
              </div>
            </div>
          </div>
        </div>

        {/* User Info (Dynamically pulled from Firebase context) */}
        <div style={{ padding: "1rem", borderBottom: `1px solid ${t.border}` }}>
          <p style={{ fontSize: 11, color: t.muted }}>Welcome,</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: t.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user ? user.name || user.email : "Guest"}
          </p>
          {user?.title && (
            <p
              style={{
                fontSize: 11,
                color: t.accent,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {user.title}
            </p>
          )}
          {/* Connection Manager bell icon */}
          <div style={{ marginTop: 8 }}>
            <ConnectionManager t={t} />
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "0.75rem", flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.filter(item => {
            if (!isAdmin && item.id === 'comparison') return false;
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 10,
                  marginBottom: 2,
                  background: isActive ? t.accentBg : "transparent",
                  border: `1px solid ${isActive ? "rgba(79,70,229,0.15)" : "transparent"}`,
                  cursor: "pointer",
                }}
              >
                <Icon
                  size={15}
                  color={isActive ? t.accent : t.muted}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <div style={{ textAlign: "left" }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? t.text : t.muted,
                    }}
                  >
                    {item.label}
                  </p>
                  <p style={{ fontSize: 9, color: t.faint }}>{item.desc}</p>
                </div>
                {isActive && (
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

          {/* Theme Toggle */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() =>
                setTheme((p) => (p === "light" ? "dark" : "light"))
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 10px",
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
              <p style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </p>
            </button>
          </div>
        </nav>

        {/* ── Auth Buttons (Login / Logout) ───────────────── */}
        <div style={{ padding: "0.75rem", borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {user ? (
            <>
              <button
                className="auth-btn"
                onClick={logout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px",
                  borderRadius: 10,
                  background: t.dangerBg,
                  border: "1px solid transparent",
                  cursor: "pointer",
                  transition: "filter 0.2s",
                }}
              >
                <LogOut size={14} color={t.danger} strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 700, color: t.danger }}>
                  Sign Out
                </span>
              </button>
              
              <button
                className="auth-btn"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                    deleteAccount();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px",
                  borderRadius: 10,
                  background: t.dangerBg,
                  border: "1px solid transparent",
                  cursor: "pointer",
                  transition: "filter 0.2s",
                }}
              >
                <Trash2 size={14} color={t.danger} strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 700, color: t.danger }}>
                  Delete Account
                </span>
              </button>
            </>
          ) : (
            <button
              className="auth-btn"
              // Adjust this logic to redirect to your login route if needed
              onClick={() => (window.location.href = "/login")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "9px",
                borderRadius: 10,
                background: t.accentBg,
                border: "1px solid transparent",
                cursor: "pointer",
                transition: "filter 0.2s",
              }}
            >
              <LogIn size={14} color={t.accent} strokeWidth={2.5} />
              <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>
                Sign In
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────── */}
      {activePage === "monitoring" && <AthletiSenseDashboard t={t} />}
      {activePage === "performance" && <PerformanceAnalytics t={t} />}
      {activePage === "recovery" && <FatigueRecovery t={t} />}
      {(activePage === "comparison" && isAdmin) && <MultiAthleteComparison t={t} />}
      {activePage === "connections" && <ManageConnections t={t} />}
    </div>
  );
}
