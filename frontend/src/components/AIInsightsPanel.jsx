import React from 'react';
import { BrainCircuit, AlertTriangle, Activity, CheckCircle, Info, TrendingUp, Zap, Brain } from 'lucide-react';
import { getPredictionTrend } from '../utils/dataHelpers';

export function AIInsightsPanel({ mlData, athleteName, currentHR, t }) {
    if (!mlData) return null;

    const { dynamic_alerts, behavior_cluster, predicted_hr } = mlData;
    const isAnomaly = dynamic_alerts?.is_anomaly;
    const trend = getPredictionTrend(currentHR, predicted_hr, t);

    return (
        <div style={{
            background: t.card,
            border: `1px solid ${isAnomaly ? t.danger : t.border}`,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: isAnomaly ? '0 0 20px rgba(225, 29, 72, 0.15)' : t.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Subtle background glow for AI feel */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '40%',
                height: '60%',
                background: `radial-gradient(circle, ${t.accent}15 0%, transparent 70%)`,
                pointerEvents: 'none'
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${t.border}`, paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: `${t.accent}15`, padding: '6px', borderRadius: '8px' }}>
                        <BrainCircuit size={18} color={t.accent} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: t.text, letterSpacing: '0.02em' }}>
                        AI PERFORMANCE COACH
                    </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: t.surface, padding: '4px 8px', borderRadius: '20px', border: `1px solid ${t.border}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.success, animation: 'pulse-dot 2s infinite' }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: t.muted }}>ENGINE ACTIVE</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Dynamic Threshold Alerter */}
                <div style={{
                    background: isAnomaly ? t.dangerBg : t.successBg,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${isAnomaly ? t.danger : 'transparent'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            {isAnomaly ? <AlertTriangle size={18} color={t.danger} /> : <CheckCircle size={18} color={t.success} />}
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isAnomaly ? t.danger : t.success }}>
                                {isAnomaly ? 'Anomaly Detected' : 'Vitals Stable'}
                            </span>
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: t.text, lineHeight: 1.4 }}>
                            {dynamic_alerts?.action || "All physiological markers are within expected ranges."}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                        <Info size={10} color={t.muted} />
                        <span style={{ fontSize: '10px', color: t.muted, fontWeight: 600 }}>
                            AI Confidence Score: {((1 - (dynamic_alerts?.severity_score || 0) / 10) * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>

                {/* 2. Performance Forecast */}
                <div style={{ background: t.surface, borderRadius: '12px', padding: '16px', border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={16} color={t.accent} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: t.muted }}>Heart Rate Forecast</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: t.text, fontFamily: "'DM Mono', monospace" }}>
                            {predicted_hr ? Math.round(predicted_hr) : '--'}
                            <span style={{ fontSize: '12px', color: t.muted, marginLeft: '4px' }}>BPM</span>
                        </div>
                        {predicted_hr ? (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                background: `${trend.color}15`, 
                                color: trend.color, 
                                padding: '2px 8px', 
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800
                            }}>
                                {trend.icon} {trend.dir.toUpperCase()}
                            </div>
                        ) : (
                            <div style={{ 
                                fontSize: '10px', 
                                fontWeight: 700, 
                                color: t.muted, 
                                background: t.surface, 
                                padding: '2px 8px', 
                                borderRadius: '6px',
                                border: `1px solid ${t.border}`
                            }}>
                                LEARNING...
                            </div>
                        )}
                    </div>
                    
                    <p style={{ margin: 0, fontSize: '11px', color: t.muted, fontStyle: 'italic' }}>
                        {!predicted_hr ? "Analyzing biometric history (needs ~7 readings)..." :
                         trend.dir === 'up' ? "Activity level increasing. Heart rate expected to rise." :
                         trend.dir === 'down' ? "Recovery phase detected. Heart rate trending down." :
                         "Maintaining steady intensity. No significant changes expected."}
                    </p>
                </div>
            </div>

            {/* 3. Behavior Insights */}
            <div style={{ 
                background: `linear-gradient(135deg, ${t.surface} 0%, ${t.card} 100%)`, 
                borderRadius: '12px', 
                padding: '16px',
                border: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    background: `${t.accent}10`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: `1px solid ${t.accent}20`
                }}>
                    <Activity size={20} color={t.accent} />
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                        Detected Activity State
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>
                        {athleteName} is in <span style={{ color: t.accent }}>{behavior_cluster?.current_state || 'Analyzing...'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}