import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, UserPlus, Send } from 'lucide-react';

export default function ConnectionManager({ t }) {
  const {
    pendingRequests, acceptRequest, rejectRequest, sendRequest, user
  } = useAuth();

  const [open, setOpen] = useState(false);
  const [sendUsername, setSendUsername] = useState('');
  const [sendStatus, setSendStatus] = useState({ msg: '', ok: false });
  const [sending, setSending] = useState(false);
  const panelRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = async () => {
    if (!sendUsername.trim()) return;
    setSending(true);
    setSendStatus({ msg: '', ok: false });
    const result = await sendRequest(sendUsername.trim());
    setSendStatus({ msg: result.success ? 'Request sent!' : result.error, ok: result.success });
    if (result.success) setSendUsername('');
    setSending(false);
  };

  const count = pendingRequests.length;

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Connection icon button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 10,
          background: open ? t.accentBg : t.surface,
          border: `1px solid ${open ? t.accent + '40' : t.border}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <UserPlus size={16} color={open ? t.accent : t.muted} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            border: `2px solid ${t.card}`,
          }}>
            {count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          width: 300,
          zIndex: 999,
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          boxShadow: t.shadowHover,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <UserPlus size={14} color={t.accent} />
            <p style={{
              fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.10em',
              color: t.muted, fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              Connections
            </p>
          </div>

          {/* Send a request */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${t.border}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 8 }}>
              {user?.role === 'admin' ? 'Add an athlete by username' : 'Add a connection by username'}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={sendUsername}
                onChange={e => { setSendUsername(e.target.value); setSendStatus({ msg: '', ok: false }); }}
                placeholder="Enter Username"
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: t.surface,
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.text,
                  outline: 'none',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={sending || !sendUsername.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 8,
                  background: t.accent, border: 'none', cursor: 'pointer',
                  opacity: sending || !sendUsername.trim() ? 0.5 : 1,
                }}
              >
                <Send size={14} color="#fff" />
              </button>
            </div>
            {sendStatus.msg && (
              <p style={{
                fontSize: 11, fontWeight: 600, marginTop: 6,
                color: sendStatus.ok ? '#10b981' : '#ef4444',
              }}>
                {sendStatus.msg}
              </p>
            )}
          </div>

          {/* Pending requests */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {count === 0 ? (
              <div style={{
                padding: '20px 16px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>
                  No pending requests
                </p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: `1px solid ${t.border}`,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `linear-gradient(135deg, ${t.accent}25, ${t.accent}10)`,
                    border: `1px solid ${t.accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: t.accent,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    flexShrink: 0,
                  }}>
                    {req.fromName?.charAt(0) || '?'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>
                      {req.fromName}
                    </p>
                    <p style={{ fontSize: 10, color: t.muted }}>
                      @{req.fromUsername} · {req.fromRole === 'admin' ? 'Coach' : 'Athlete'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => acceptRequest(req.id, req)}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: '#10b981', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Check size={14} color="#fff" />
                    </button>
                    <button
                      onClick={() => rejectRequest(req.id)}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: '#ef4444', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
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

