// src/components/connections.jsx
// ─────────────────────────────────────────────────────────────
// Consolidates ConnectionManager (dropdown) + ManageConnections (page)
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import { Check, X, UserPlus, Send, Users, UserMinus } from "lucide-react";

// ── ConnectionManager — header dropdown ──────────────────────
export function ConnectionManager({ t }) {
  const { pendingRequests, acceptRequest, rejectRequest, sendRequest, user } =
    useAuth();
  const [open, setOpen] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [status, setStatus] = useState({ msg: "", ok: false });
  const [sending, setSending] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSend = async () => {
    if (!sendTo.trim()) return;
    setSending(true);
    setStatus({ msg: "", ok: false });
    const res = await sendRequest(sendTo.trim());
    setStatus({
      msg: res.success ? "Request sent!" : res.error,
      ok: res.success,
    });
    if (res.success) setSendTo("");
    setSending(false);
  };

  const count = pendingRequests.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: open ? t.accentBg : t.surface,
          border: `1px solid ${open ? t.accent + "40" : t.border}`,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <UserPlus size={16} color={open ? t.accent : t.muted} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${t.card}`,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 300,
            zIndex: 999,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            boxShadow: t.shadowHover,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <UserPlus size={14} color={t.accent} />
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: t.muted,
              }}
            >
              Connections
            </p>
          </div>

          {/* Send request */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.text,
                marginBottom: 8,
              }}
            >
              {user?.role === "admin"
                ? "Add athlete by username"
                : "Add coach by username"}
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={sendTo}
                onChange={(e) => {
                  setSendTo(e.target.value);
                  setStatus({ msg: "", ok: false });
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Enter username"
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: t.surface,
                  fontSize: 12,
                  color: t.text,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !sendTo.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: t.accent,
                  border: "none",
                  cursor: "pointer",
                  opacity: sending || !sendTo.trim() ? 0.5 : 1,
                }}
              >
                <Send size={14} color="#fff" />
              </button>
            </div>
            {status.msg && (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  marginTop: 6,
                  color: status.ok ? "#10b981" : "#ef4444",
                }}
              >
                {status.msg}
              </p>
            )}
          </div>

          {/* Pending requests */}
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {count === 0 ? (
              <p
                style={{
                  padding: "20px 16px",
                  textAlign: "center",
                  fontSize: 12,
                  color: t.muted,
                }}
              >
                No pending requests
              </p>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: t.accentBg,
                      border: `1px solid ${t.accent}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: t.accent,
                      flexShrink: 0,
                    }}
                  >
                    {req.fromName?.charAt(0) || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                      {req.fromName}
                    </p>
                    <p style={{ fontSize: 10, color: t.muted }}>
                      @{req.fromUsername} ·{" "}
                      {req.fromRole === "admin" ? "Coach" : "Athlete"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => acceptRequest(req.id, req)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: "#10b981",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={14} color="#fff" />
                    </button>
                    <button
                      onClick={() => rejectRequest(req.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: "#ef4444",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={14} color="#fff" />
                    </button>
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

// ── ManageConnections — full page ─────────────────────────────
export function ManageConnections({ t }) {
  const { user, connectedCoaches, connectedAthletes, removeConnection, sendRequest, pendingRequests } =
    useAuth();
  
  const [systemUsers, setSystemUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [localSent, setLocalSent] = useState(new Set());

  useEffect(() => {
    async function fetchUsers() {
      try {
        const snap = await get(ref(db, "users"));
        if (snap.exists()) {
          const allUsers = [];
          snap.forEach(child => {
            allUsers.push({ uid: child.key, ...child.val() });
          });
          setSystemUsers(allUsers);
        }
      } catch (err) {
        console.error("Failed to fetch system users", err);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const handleConnect = async (u) => {
    const res = await sendRequest(u.username);
    if (res.success) {
      setLocalSent(new Set([...localSent, u.uid]));
    } else {
      alert("Failed to send request: " + res.error);
    }
  };

  const isAdmin = user?.role === "admin";
  const connections = isAdmin ? connectedAthletes : connectedCoaches;
  const label = isAdmin ? "Connected Athletes" : "Your Coaches";
  const emptyMsg = isAdmin
    ? "No athletes connected yet. Send a request from the header icon or discover below."
    : "No coaches connected. Discover and train directly below!";

  // Compute discoverable users
  const discoverableUsers = systemUsers.filter(u => {
    if (u.uid === user?.uid) return false;
    if (isAdmin && u.role === "admin") return false;
    if (!isAdmin && u.role !== "admin") return false;
    if (connections.some(c => c.uid === u.uid)) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.name?.toLowerCase().includes(q) && !u.username?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <main
      style={{
        flex: 1,
        overflow: "auto",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: t.text,
          }}
        >
          {label}
        </h1>
        <p style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
          Manage your {isAdmin ? "athletes" : "coaches"} · Use the header icon
          to send new requests
        </p>
      </div>

      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "1rem 1.25rem",
          boxShadow: t.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Users size={14} color={t.accent} />
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: t.muted,
            }}
          >
            {connections.length} {isAdmin ? "Athlete" : "Coach"}
            {connections.length !== 1 ? "s" : ""}
          </p>
        </div>

        {connections.length === 0 ? (
          <div
            style={{
              padding: "30px 20px",
              textAlign: "center",
              borderRadius: 12,
              background: t.surface,
            }}
          >
            <p style={{ fontSize: 13, color: t.muted }}>{emptyMsg}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {connections.map((conn) => (
              <div
                key={conn.uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: t.accentBg,
                    border: `1px solid ${t.accent}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                    color: t.accent,
                    flexShrink: 0,
                  }}
                >
                  {conn.name
                    ?.split(" ")
                    .map((w) => w[0])
                    .join("") || "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                    {conn.name}
                  </p>
                  <p style={{ fontSize: 11, color: t.muted }}>
                    @{conn.username}
                    {isAdmin && conn.athleteId && (
                      <span> · {conn.athleteId}</span>
                    )}
                    {isAdmin && conn.sport && <span> · {conn.sport}</span>}
                    {!isAdmin && conn.title && <span> · {conn.title}</span>}
                  </p>
                </div>
                <button
                  onClick={() =>
                    window.confirm(`Remove ${conn.name}?`) &&
                    removeConnection(conn.uid)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "transparent",
                    border: `1px solid ${t.border}`,
                    cursor: "pointer",
                  }}
                  title={`Remove ${conn.name}`}
                >
                  <UserMinus size={14} color={t.muted} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "1rem 1.25rem",
          boxShadow: t.shadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={14} color={t.accent} />
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: t.muted,
              }}
            >
              Discover {isAdmin ? "Athletes" : "Coaches"}
            </p>
          </div>
          <input
            type="text"
            placeholder="Search username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: t.surface,
              color: t.text,
              fontSize: 12,
              outline: "none",
              width: "200px"
            }}
          />
        </div>

        {loadingUsers ? (
          <div style={{ padding: "20px", textAlign: "center", color: t.muted, fontSize: 13 }}>Loading users...</div>
        ) : discoverableUsers.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: t.muted, fontSize: 13 }}>
            {searchQuery ? "No matching users found." : "No new users to discover."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "400px", overflowY: "auto" }}>
            {discoverableUsers.map((u) => {
              const isPending = pendingRequests.some(pr => pr.to === u.uid) || localSent.has(u.uid);
              return (
                <div
                  key={u.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: t.accentBg,
                      border: `1px solid ${t.accent}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color: t.accent,
                      flexShrink: 0,
                    }}
                  >
                    {u.name?.split(" ").map(w => w[0]).join("") || "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                      {u.name}
                    </p>
                    <p style={{ fontSize: 11, color: t.muted }}>
                      @{u.username}
                      {isAdmin && u.sport && <span> · {u.sport}</span>}
                      {!isAdmin && u.title && <span> · {u.title}</span>}
                    </p>
                  </div>
                  {isPending ? (
                    <span style={{ fontSize: 11, color: t.muted, fontWeight: 600, padding: "6px 12px", background: t.surface, borderRadius: 8, border: `1px solid ${t.border}` }}>Requested</span>
                  ) : (
                    <button
                      onClick={() => handleConnect(u)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: t.accent,
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <UserPlus size={12} /> Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
