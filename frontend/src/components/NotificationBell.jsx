// src/components/NotificationBell.jsx
import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, X } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

export function NotificationBell({ t }) {
  const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotifications();
  const { pendingRequests, acceptRequest, rejectRequest } = useAuth();
  const [open, setOpen] = useState(false);
  // Track which conn-req notifications have been acted on (so we hide the buttons)
  const [actedOn, setActedOn] = useState(new Set());
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

  const handleAccept = async (reqId, histId) => {
    const req = pendingRequests.find((r) => r.id === reqId);
    if (!req) return;
    await acceptRequest(reqId, req);
    setActedOn((prev) => new Set([...prev, histId]));
  };

  const handleReject = async (reqId, histId) => {
    await rejectRequest(reqId);
    setActedOn((prev) => new Set([...prev, histId]));
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

          {/* Header */}
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
              Notifications
            </p>
            <button
              onClick={clearNotifications}
              style={{ fontSize: 10, color: t.danger, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Clear All
            </button>
          </div>

          {/* List */}
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Bell size={24} color={t.faint} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p style={{ fontSize: 12, color: t.faint }}>No recent alerts</p>
              </div>
            ) : (
              notifications.map((n) => {
                // ── Connection request notification ──────────────
                const isConnReq = n.histId?.startsWith("conn-req-");
                const reqId = isConnReq ? n.histId.replace("conn-req-", "") : null;
                const liveReq = reqId ? pendingRequests.find((r) => r.id === reqId) : null;
                const alreadyActed = actedOn.has(n.histId);

                return (
                  <div
                    key={n.histId}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${t.border}`,
                      background: n.read ? "transparent" : `${t.accent}08`,
                      transition: "background 0.2s",
                    }}
                  >
                    {/* Top row: label + timestamp */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          color: isConnReq
                            ? t.accent
                            : n.level === "critical"
                            ? t.danger
                            : t.warning,
                        }}
                      >
                        {isConnReq ? "Connection Request" : n.athleteName}
                      </p>
                      <p style={{ fontSize: 9, color: t.faint }}>{n.timestamp}</p>
                    </div>

                    {/* Title + message */}
                    <p style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 2 }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: 11, color: t.muted, lineHeight: 1.4 }}>{n.msg}</p>

                    {/* Accept / Reject — only for live pending conn requests */}
                    {isConnReq && (
                      <div style={{ marginTop: 8 }}>
                        {alreadyActed || !liveReq ? (
                          <p style={{ fontSize: 10, color: t.faint, fontWeight: 600 }}>
                            {alreadyActed ? "✓ Done" : "Request no longer pending"}
                          </p>
                        ) : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              id={`accept-conn-${reqId}`}
                              onClick={() => handleAccept(reqId, n.histId)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 12px",
                                borderRadius: 7,
                                background: "#10b981",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              <Check size={12} /> Accept
                            </button>
                            <button
                              id={`reject-conn-${reqId}`}
                              onClick={() => handleReject(reqId, n.histId)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 12px",
                                borderRadius: 7,
                                background: t.dangerBg,
                                border: `1px solid ${t.danger}30`,
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                color: t.danger,
                              }}
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
