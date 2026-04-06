// src/components/AthletiSenseChat.jsx
// Floating AI chat — connects to /api/v1/chat
import React, { useState, useRef, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ChevronDown,
  Bot,
  User,
  Lightbulb,
} from "lucide-react";

const API_BASE = (
  import.meta.env.VITE_API_BASE || "http://localhost:3001/api"
).replace(/\/api$/, "/api/v1");

function renderMarkdown(text, t) {
  if (!text) return null;
  const lines = text.split("\n");
  const els = [];
  let listItems = [];
  const flushList = () => {
    if (listItems.length) {
      els.push(
        <ul
          key={`ul-${els.length}`}
          style={{ margin: "6px 0", paddingLeft: 18 }}
        >
          {listItems.map((li, i) => (
            <li
              key={i}
              style={{
                fontSize: 12.5,
                lineHeight: 1.6,
                color: t.text,
                marginBottom: 2,
              }}
            >
              {formatInline(li, t)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };
  lines.forEach((line, idx) => {
    const tr = line.trim();
    if (tr.startsWith("### ")) {
      flushList();
      els.push(
        <p
          key={idx}
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: t.text,
            margin: "10px 0 4px",
          }}
        >
          {formatInline(tr.slice(4), t)}
        </p>,
      );
    } else if (tr.startsWith("## ")) {
      flushList();
      els.push(
        <p
          key={idx}
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: t.text,
            margin: "10px 0 4px",
          }}
        >
          {formatInline(tr.slice(3), t)}
        </p>,
      );
    } else if (tr.startsWith("# ")) {
      flushList();
      els.push(
        <p
          key={idx}
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: t.text,
            margin: "10px 0 4px",
          }}
        >
          {formatInline(tr.slice(2), t)}
        </p>,
      );
    } else if (/^[-*•]\s/.test(tr) || /^\d+\.\s/.test(tr)) {
      listItems.push(tr.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, ""));
    } else if (!tr) {
      flushList();
      els.push(<div key={idx} style={{ height: 6 }} />);
    } else {
      flushList();
      els.push(
        <p
          key={idx}
          style={{
            fontSize: 12.5,
            lineHeight: 1.65,
            color: t.text,
            margin: "3px 0",
          }}
        >
          {formatInline(tr, t)}
        </p>,
      );
    }
  });
  flushList();
  return els;
}

function formatInline(text, t) {
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0,
    match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <strong key={match.index} style={{ fontWeight: 700, color: t.text }}>
        {match[1]}
      </strong>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

function TypingDots({ t }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: t.accent,
            opacity: 0.5,
            animation: `chatDot 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function AthletiSenseChat({ t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm **AthletiSense AI**.\n\nAsk me anything about your athletes' biometric data, trends, or performance!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const messagesEnd = useRef();

  const scrollToBottom = () =>
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load suggestions on first open
  React.useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      fetch(`${API_BASE}/chat/suggestions`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.suggestions || []))
        .catch(() => {});
    }
  }, [isOpen]);

  const send = useCallback(
    async (text) => {
      const msg = (text || input).trim();
      if (!msg) return;
      setInput("");
      setShowSugg(false);
      setMessages((prev) => [...prev, { role: "user", content: msg }]);
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, history: messages.slice(-8) }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response || data.error || "No response.",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Could not reach the AI server. Check your connection.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, messages],
  );

  const s = {
    btn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 52,
      height: 52,
      borderRadius: "50%",
      background: `linear-gradient(135deg,${t.accent},#7c3aed)`,
      border: "none",
      cursor: "pointer",
      boxShadow: `0 4px 20px ${t.accent}50`,
      color: "#fff",
    },
    win: {
      position: "fixed",
      bottom: 80,
      right: 24,
      width: 380,
      height: 560,
      background: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: 20,
      boxShadow: t.shadowHover,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 1000,
    },
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1001 }}>
      <style>{`@keyframes chatDot{0%,80%,100%{opacity:0.5;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}`}</style>
      {isOpen && (
        <div style={s.win}>
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: `linear-gradient(135deg,${t.accent},#7c3aed)`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                AthletiSense AI
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                Powered by GPT-4o mini
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
                color: "#fff",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    background:
                      m.role === "user" ? t.accentBg : `${t.accent}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {m.role === "user" ? (
                    <User size={13} color={t.accent} />
                  ) : (
                    <Bot size={13} color={t.accent} />
                  )}
                </div>
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 13px",
                    borderRadius:
                      m.role === "user"
                        ? "16px 4px 16px 16px"
                        : "4px 16px 16px 16px",
                    background: m.role === "user" ? t.accent : t.surface,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  {m.role === "user" ? (
                    <p
                      style={{ fontSize: 12.5, color: "#fff", lineHeight: 1.5 }}
                    >
                      {m.content}
                    </p>
                  ) : (
                    <div>{renderMarkdown(m.content, t)}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div
                style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: `${t.accent}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={13} color={t.accent} />
                </div>
                <div
                  style={{
                    padding: "8px 13px",
                    borderRadius: "4px 16px 16px 16px",
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <TypingDots t={t} />
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Suggestions */}
          {showSugg && suggestions.length > 0 && (
            <div
              style={{
                padding: "8px 14px",
                borderTop: `1px solid ${t.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.muted,
                  marginBottom: 4,
                }}
              >
                Suggestions
              </p>
              {suggestions.slice(0, 5).map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    textAlign: "left",
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    cursor: "pointer",
                    fontSize: 12,
                    color: t.text,
                    fontWeight: 500,
                  }}
                >
                  💡 {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: `1px solid ${t.border}`,
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <button
              onClick={() => setShowSugg((v) => !v)}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: 8,
                cursor: "pointer",
                color: t.muted,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Lightbulb size={15} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about athlete data…"
              rows={1}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 12,
                border: `1px solid ${t.border}`,
                background: t.surface,
                fontSize: 12.5,
                color: t.text,
                outline: "none",
                resize: "none",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                lineHeight: 1.5,
                maxHeight: 80,
                overflowY: "auto",
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: t.accent,
                border: "none",
                borderRadius: 10,
                padding: 9,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                opacity: loading || !input.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen((o) => !o)} style={s.btn}>
        {isOpen ? <X size={20} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
