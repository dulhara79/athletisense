// src/components/NotificationBell.jsx
import React, { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export function NotificationBell({ t }) {
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) markAllAsRead();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: 8,
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          color: t.muted,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = t.hover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = t.surface)}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: t.danger,
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${t.bg}`,
              animation: "pulse-count 2s infinite",
            }}
          >
            <style>{`
              @keyframes pulse-count {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225,29,72,0.7); }
                70% { transform: scale(1.1); box-shadow: 0 0 0 5px rgba(225,29,72,0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(225,29,72,0); }
              }
            `}</style>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            boxShadow: t.shadowHover,
            zIndex: 1000,
            overflow: "hidden",
            animation: "slide-down 0.2s ease-out",
          }}
        >
          <style>{`
            @keyframes slide-down {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: t.surface,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              Alert History
            </p>
            <button 
              onClick={clearNotifications}
              style={{ fontSize: 10, color: t.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear All
            </button>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Bell size={24} color={t.faint} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p style={{ fontSize: 12, color: t.faint }}>No recent alerts</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.histId}
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex",
                    gap: 12,
                    background: n.read ? "transparent" : `${t.accent}08`,
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: n.level === 'critical' ? t.danger : t.warning, textTransform: 'uppercase' }}>
                        {n.athleteName}
                      </p>
                      <p style={{ fontSize: 9, color: t.faint, fontFamily: "'DM Mono',monospace" }}>
                        {n.timestamp}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 2 }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: 11, color: t.muted, lineHeight: 1.3 }}>{n.msg}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
