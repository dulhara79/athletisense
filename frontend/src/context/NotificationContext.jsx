// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAthleteData } from "../hooks/useAthleteData";
import { getAlerts } from "../utils/dataHelpers";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

/**
 * Global Notification Provider
 * Monitors all athlete data and manages a unified notification history + sound alerts.
 */
export const NotificationProvider = ({ children }) => {
  const { liveData, athletes, mlInsights } = useAthleteData();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  
  // Keep track of which alerts we've already notified for in this session
  // format: { [athleteId]: Set(alertId-timestamp) }
  const notifiedAlerts = useRef(new Map());

  // Audible alert utility
  const playAlertSound = useCallback((level) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Higher pitch for critical, lower for warning
      osc.type = "sine";
      osc.frequency.setValueAtTime(level === "critical" ? 880 : 440, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio alert failed:", e);
    }
  }, []);

  // Monitor live data for new alerts
  useEffect(() => {
    let hasNewCritical = false;
    let hasNewWarning = false;
    const newNotifications = [];
    const newToasts = [];

    Object.entries(liveData).forEach(([athleteId, records]) => {
      const latest = records.at(-1);
      if (!latest) return;

      const activeAlerts = getAlerts(latest, mlInsights[athleteId]).filter(a => a.level !== "info");
      if (!activeAlerts.length) return;

      if (!notifiedAlerts.current.has(athleteId)) {
        notifiedAlerts.current.set(athleteId, new Set());
      }
      const athleteSeenAlerts = notifiedAlerts.current.get(athleteId);
      const athleteName = athletes.find(a => a.id === athleteId)?.name || athleteId;

      activeAlerts.forEach(alert => {
        const uniqueId = `${alert.id}-${latest.timestamp || Date.now()}`;
        
        if (!athleteSeenAlerts.has(uniqueId)) {
          athleteSeenAlerts.add(uniqueId);
          
          const notif = {
            ...alert,
            histId: uniqueId,
            athleteId,
            athleteName,
            timestamp: new Date().toLocaleTimeString(),
            read: false,
          };

          newNotifications.push(notif);
          newToasts.push(notif);

          if (alert.level === "critical") hasNewCritical = true;
          if (alert.level === "warning") hasNewWarning = true;
        }
      });
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + newNotifications.length);
      setToasts(prev => [...prev, ...newToasts]);

      if (hasNewCritical) playAlertSound("critical");
      else if (hasNewWarning) playAlertSound("warning");
    }
  }, [liveData, athletes, playAlertSound]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const removeToast = useCallback((histId) => {
    setToasts(prev => prev.filter(t => t.histId !== histId));
  }, []);

  const value = {
    notifications,
    unreadCount,
    toasts,
    markAllAsRead,
    clearNotifications,
    removeToast,
    playAlertSound, // Expose if needed elsewhere
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
