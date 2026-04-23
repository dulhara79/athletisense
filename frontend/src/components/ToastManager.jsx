// src/components/ToastManager.jsx
import React, { useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const TOAST_DURATION = 5000;

const Toast = ({ notification, onRemove, t }) => {
  const { histId, level, title, msg, athleteName } = notification;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(histId), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [histId, onRemove]);

  const cfg = {
    critical: {
      bg: t.dangerBg,
      border: "rgba(225,29,72,0.3)",
      text: t.danger,
      Icon: AlertCircle,
    },
    warning: {
      bg: t.warningBg,
      border: "rgba(217,119,6,0.3)",
      text: t.warning,
      Icon: AlertTriangle,
    },
    info: {
      bg: t.accentBg,
      border: "rgba(79,70,229,0.3)",
      text: t.accent,
      Icon: Info,
    },
  };

  const { bg, border, text, Icon } = cfg[level] || cfg.info;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 14,
        background: bg,
        backdropFilter: "blur(8px)",
        border: `1px solid ${border}`,
        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
        width: 320,
        animation: "toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
        position: "relative",
        marginBottom: 10,
        pointerEvents: "auto",
      }}
    >
      <style>{`
        @keyframes toast-in {
          from { transform: translateX(100%) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
      `}</style>
      <Icon size={18} color={text} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: text, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
          {athleteName}
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>
          {title}
        </p>
        <p style={{ fontSize: 11, color: t.muted, lineHeight: 1.4 }}>
          {msg}
        </p>
      </div>
      <button
        onClick={() => onRemove(histId)}
        style={{
          background: "none",
          border: "none",
          padding: 4,
          cursor: "pointer",
          color: t.faint,
          display: "flex",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
        onMouseLeave={(e) => (e.currentTarget.style.color = t.faint)}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastManager = () => {
  const { toasts, removeToast } = useNotifications();
  const { t } = useTheme();

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.histId} notification={toast} onRemove={removeToast} t={t} />
      ))}
    </div>
  );
};
