import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserMinus, Users } from 'lucide-react';

export default function ManageConnections({ t }) {
  const { user, connectedCoaches, connectedAthletes, removeConnection } = useAuth();
  const isAdmin = user?.role === 'admin';

  const connections = isAdmin ? connectedAthletes : connectedCoaches;
  const label = isAdmin ? 'Connected Athletes' : 'Your Coaches';
  const emptyMsg = isAdmin
    ? 'No athletes connected yet. Send a request from the bell icon.'
    : 'No coaches connected. You are training independently!';

  return (
    <main style={{
      flex: 1, overflow: 'auto', padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800,
          color: t.text, letterSpacing: '0.02em',
        }}>
          {label}
        </h1>
        <p style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
          Manage your {isAdmin ? 'athletes' : 'coaches'} · Use the bell icon to send new requests
        </p>
      </div>

      <div className="card-fadein" style={{
        background: t.card, border: `1px solid ${t.border}`,
        borderRadius: 14, padding: '1rem 1.25rem', boxShadow: t.shadow,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        }}>
          <Users size={14} color={t.accent} />
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.10em', color: t.muted,
            fontFamily: "'DM Sans',monospace",
          }}>
            {connections.length} {isAdmin ? 'Athlete' : 'Coach'}{connections.length !== 1 ? 's' : ''}
          </p>
        </div>

        {connections.length === 0 ? (
          <div style={{
            padding: '30px 20px', textAlign: 'center',
            borderRadius: 12, background: t.surface,
          }}>
            <p style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>{emptyMsg}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {connections.map((conn) => (
              <div key={conn.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 12,
                background: t.surface, border: `1px solid ${t.border}`,
                transition: 'box-shadow 0.15s',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${t.accent}30, ${t.accent}15)`,
                  border: `1px solid ${t.accent}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: t.accent,
                  fontFamily: "'DM Sans',monospace", flexShrink: 0,
                }}>
                  {conn.name?.split(' ').map(w => w[0]).join('') || '?'}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{conn.name}</p>
                  <p style={{ fontSize: 11, color: t.muted }}>
                    @{conn.username}
                    {isAdmin && conn.athleteId && <span> · {conn.athleteId}</span>}
                    {isAdmin && conn.sport && <span> · {conn.sport}</span>}
                    {!isAdmin && conn.title && <span> · {conn.title}</span>}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => {
                    if (window.confirm(`Remove ${conn.name} from your ${isAdmin ? 'athletes' : 'coaches'}?`)) {
                      removeConnection(conn.uid);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 8,
                    background: 'transparent',
                    border: `1px solid ${t.border}`,
                    cursor: 'pointer', transition: 'all 0.15s',
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
    </main>
  );
}
