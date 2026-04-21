import React from 'react';
import { BrainCircuit, AlertTriangle, Activity, CheckCircle, Info } from 'lucide-react';

export function AIInsightsPanel({ mlData, athleteName, t }) {
    if (!mlData) return null;

    const { dynamic_alerts, behavior_cluster } = mlData;
    const isAnomaly = dynamic_alerts?.is_anomaly;

    return (
        <div style={{
            background: t.card,
            border: `1px solid ${isAnomaly ? t.danger : t.border}`,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: isAnomaly ? '0 0 15px rgba(225, 29, 72, 0.2)' : t.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            transition: 'all 0.3s ease'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${t.border}`, paddingBottom: '12px' }}>
                <BrainCircuit size={20} color={t.accent} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: t.text }}>
                    Live AI Coaching Assistant
                </h3>
            </div>

            {/* 1. Dynamic Threshold Alerter (GMM Model) */}
            <div style={{
                background: isAnomaly ? t.dangerBg : t.successBg,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${isAnomaly ? t.danger : 'transparent'}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {isAnomaly ? <AlertTriangle size={18} color={t.danger} /> : <CheckCircle size={18} color={t.success} />}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isAnomaly ? t.danger : t.success }}>
                        {isAnomaly ? 'Critical Physiological Anomaly Detected' : 'Physiological Parameters Normal'}
                    </span>
                </div>

                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: t.text, fontWeight: isAnomaly ? 600 : 400 }}>
                    {dynamic_alerts?.action}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={12} color={t.muted} />
                    <span style={{ fontSize: '11px', color: t.muted }}>
                        Unsupervised Density Score: {dynamic_alerts?.severity_score || 'N/A'}
                    </span>
                </div>
            </div>

            {/* 2. Behavior Clustering (K-Means Model) */}
            <div style={{ background: t.surface, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Activity size={16} color={t.muted} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: t.muted }}>
                        Discovered Behavior State
                    </span>
                </div>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: t.text }}>
                    {athleteName} is currently in: <span style={{ color: t.accent }}>{behavior_cluster?.current_state || 'Analyzing...'}</span>
                </p>
                <span style={{ fontSize: '11px', color: t.muted, marginTop: '4px', display: 'block' }}>
                    Determined via multidimensional K-Means clustering.
                </span>
            </div>
        </div>
    );
}