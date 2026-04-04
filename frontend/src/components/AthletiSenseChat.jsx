/**
 * AthletiSenseChat.jsx
 * ─────────────────────────────────────────────────────────────
 * Floating AI chatbot widget powered by Google Gemini.
 * Supports natural-language queries about athlete data,
 * trend explanations, anomaly identification, and
 * dashboard guidance.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, ChevronDown, Bot, User, Lightbulb } from "lucide-react";

const API_BASE = "http://localhost:3001/api";

/* ── Simple markdown renderer ────────────────────────────────── */
function renderMarkdown(text, t) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let inList = false;
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: "6px 0", paddingLeft: 18 }}>
          {listItems.map((li, i) => (
            <li key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: t.text, marginBottom: 2 }}>
              {formatInline(li, t)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <p key={idx} style={{ fontSize: 12, fontWeight: 800, color: t.text, margin: "10px 0 4px" }}>
          {formatInline(trimmed.slice(4), t)}
        </p>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <p key={idx} style={{ fontSize: 13, fontWeight: 800, color: t.text, margin: "10px 0 4px" }}>
          {formatInline(trimmed.slice(3), t)}
        </p>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <p key={idx} style={{ fontSize: 14, fontWeight: 800, color: t.text, margin: "10px 0 4px" }}>
          {formatInline(trimmed.slice(2), t)}
        </p>
      );
    }
    // List items
    else if (/^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      inList = true;
      const content = trimmed.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "");
      listItems.push(content);
    }
    // Empty line
    else if (!trimmed) {
      flushList();
      elements.push(<div key={idx} style={{ height: 6 }} />);
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <p key={idx} style={{ fontSize: 12.5, lineHeight: 1.65, color: t.text, margin: "3px 0" }}>
          {formatInline(trimmed, t)}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

function formatInline(text, t) {
  // Bold **text**
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} style={{ fontWeight: 700, color: t.text }}>
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

/* ── Typing indicator ────────────────────────────────────────── */
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
            animation: `chatDotPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main chat component ─────────────────────────────────────── */
export default function AthletiSenseChat({ t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm **AthletiSense AI**, your intelligent sports performance assistant.\n\nI can help you:\n- Analyze athlete biometric data\n- Identify trends and anomalies\n- Compare athlete performance\n- Explain dashboard visualizations\n\nAsk me anything about your athletes' data!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch suggested questions
  useEffect(() => {
    fetch(`${API_BASE}/chat/suggestions`)
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => {
        setSuggestions([
          "What's the current status of all athletes?",
          "Are there any anomalies?",
          "Which athlete needs recovery?",
          "Compare performance metrics",
        ]);
      });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (msg) => {
      const text = (msg || input).trim();
      if (!text || loading) return;

      setInput("");
      setShowSuggestions(false);
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);

      try {
        const history = messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history }),
        });

        const data = await res.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ ${data.error}${data.fallback ? "\n\n💡 **Tip:** Make sure a valid OPENAI_API_KEY is set in the backend .env file." : ""}`,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.response },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "⚠️ Unable to reach the AI service. Make sure the backend server is running on port 3001.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── CSS Keyframes ───────────────────────────────────── */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatDotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1); }
        }
        @keyframes chatBtnPulse {
          0%   { box-shadow: 0 4px 20px rgba(99,102,241,0.3); }
          50%  { box-shadow: 0 4px 30px rgba(99,102,241,0.5); }
          100% { box-shadow: 0 4px 20px rgba(99,102,241,0.3); }
        }
        .chat-msg:hover { filter: brightness(0.97); }
        .chat-suggestion:hover {
          background: ${t.accentBg} !important;
          border-color: ${t.accent}30 !important;
        }
        .chat-send:hover { filter: brightness(1.1); }
      `}</style>

      {/* ── Floating Toggle Button ──────────────────────────── */}
      {!isOpen && (
        <button
          id="chat-toggle-btn"
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "chatBtnPulse 3s ease-in-out infinite",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Sparkles size={24} color="#fff" />
        </button>
      )}

      {/* ── Chat Panel ──────────────────────────────────────── */}
      {isOpen && (
        <div
          id="chat-panel"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 400,
            height: 580,
            maxHeight: "calc(100vh - 48px)",
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 20,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            animation: "chatSlideUp 0.3s ease-out",
          }}
        >
          {/* ── Header ──────────────────────────────────────── */}
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <Bot size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#fff",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                AthletiSense AI
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                }}
              >
                Powered by OpenAI · Always analyzing
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} color="#fff" />
            </button>
          </div>

          {/* ── Messages Area ───────────────────────────────── */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="chat-msg"
                style={{
                  display: "flex",
                  gap: 10,
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : "linear-gradient(135deg, #6366f1, #4f46e5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.role === "user" ? (
                    <User size={14} color="#fff" />
                  ) : (
                    <Bot size={14} color="#fff" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "14px 14px 4px 14px"
                        : "14px 14px 14px 4px",
                    background:
                      msg.role === "user" ? t.accentBg : t.surface,
                    border: `1px solid ${
                      msg.role === "user"
                        ? "rgba(99,102,241,0.15)"
                        : t.border
                    }`,
                  }}
                >
                  {renderMarkdown(msg.content, t)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot size={14} color="#fff" />
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "14px 14px 14px 4px",
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <TypingDots t={t} />
                </div>
              </div>
            )}
          </div>

          {/* ── Suggested Questions ─────────────────────────── */}
          {showSuggestions && suggestions.length > 0 && messages.length <= 1 && (
            <div
              style={{
                padding: "0 16px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 160,
                overflowY: "auto",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 2,
                }}
              >
                <Lightbulb size={12} color={t.warning} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: t.muted,
                  }}
                >
                  Suggested Questions
                </span>
              </div>
              {suggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  className="chat-suggestion"
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.text,
                    textAlign: "left",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Input Area ──────────────────────────────────── */}
          <div
            style={{
              padding: "12px 16px 16px",
              borderTop: `1px solid ${t.border}`,
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              flexShrink: 0,
              background: t.card,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about athlete data..."
              rows={1}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 12,
                border: `1px solid ${t.border}`,
                background: t.surface,
                color: t.text,
                fontSize: 13,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: "none",
                resize: "none",
                maxHeight: 80,
                lineHeight: 1.4,
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = t.accent)
              }
              onBlur={(e) =>
                (e.target.style.borderColor = t.border)
              }
            />
            <button
              className="chat-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background:
                  loading || !input.trim()
                    ? t.surface
                    : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              <Send
                size={16}
                color={loading || !input.trim() ? t.faint : "#fff"}
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
