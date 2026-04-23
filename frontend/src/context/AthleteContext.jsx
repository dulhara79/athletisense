import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue, query, limitToLast, get } from "firebase/database";

const AthleteDataContext = createContext();

export const useAthleteData = () => {
    const context = useContext(AthleteDataContext);
    if (!context) {
        throw new Error("useAthleteData must be used within an AthleteDataProvider");
    }
    return context;
};

/**
 * Global Provider for all Athlete-related Realtime Data
 * ---------------------------------------------------
 * This context maintains ONE set of listeners for the entire app,
 * preventing redundant Firebase connections.
 */
export const AthleteDataProvider = ({ children }) => {
    const [athletes, setAthletes] = useState([]);
    const [liveData, setLiveData] = useState({});
    const [mlInsights, setMlInsights] = useState({});
    const [mlHistory, setMlHistory] = useState({}); // Stores historical predictions
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    
    // Use a ref to track active listeners to avoid duplicates
    const listenersRef = useRef({});

    const normaliseRecord = (r) => {
        if (!r) return null;
        return {
            ...r,
            heart_rate: r.heart_rate || { bpm: 0 },
            temperature: r.temperature || { celsius: 0 },
            respiration: r.respiration || { rate_instant: 0 },
            motion: r.motion || { accel_z: 0 },
            timestamp: r.timestamp || new Date().toISOString()
        };
    };
    
    /**
     * Fetches historical readings and ML insights for an athlete from Firebase.
     */
    const fetchHistoricalData = async (aid) => {
        try {
            console.log(`[AthleteData] Fetching history for ${aid}...`);
            const readingsRef = dbRef(db, `athlete_records/${aid}/readings`);
            const mlHistoryRef = dbRef(db, `athlete_records/${aid}/ml_history`);
            
            const historyQuery = query(readingsRef, limitToLast(200));
            const mlQuery = query(mlHistoryRef, limitToLast(200));
            
            const [snap, mlSnap] = await Promise.all([get(historyQuery), get(mlQuery)]);
            
            if (snap.exists()) {
                const data = snap.val();
                const historicalRecords = Object.values(data)
                    .map(normaliseRecord)
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                setLiveData(prev => ({ ...prev, [aid]: historicalRecords }));
            }

            if (mlSnap.exists()) {
                const data = mlSnap.val();
                const historicalML = Object.values(data)
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                setMlHistory(prev => ({ ...prev, [aid]: historicalML }));
            }
        } catch (err) {
            console.error(`[AthleteData] Error fetching history for ${aid}:`, err);
        }
    };

    useEffect(() => {
        console.log("[AthleteData] Initializing global listeners...");
        
        // 0. Listen for browser's connection to Firebase
        const connectedRef = dbRef(db, ".info/connected");
        const unsubConn = onValue(connectedRef, (snap) => {
            setConnected(snap.val() === true);
        });

        const usersRef = dbRef(db, "users");

        // 1. Listen for the athlete list (via users node)
        const unsubUsers = onValue(usersRef, (snap) => {
            const val = snap.val() || {};
            const athletesList = [];
            
            Object.values(val).forEach((u) => {
                if (u?.athleteId) {
                    athletesList.push({ ...u, id: u.athleteId });
                }
            });
            
            setAthletes(athletesList);

            // 2. Set up granular listeners for each detected athlete
            athletesList.forEach((a) => {
                const aid = a.id;
                if (!listenersRef.current[aid]) {
                    console.log(`[AthleteData] Attaching listeners for ${aid}`);
                    
                    // 0. Fetch initial history
                    fetchHistoricalData(aid);
                    
                    // A. Latest Telemetry Listener
                    const latestRef = dbRef(db, `athlete_records/${aid}/latest`);
                    const unsubLat = onValue(latestRef, (lSnap) => {
                        if (!lSnap.exists()) return;
                        const lat = normaliseRecord(lSnap.val());
                        if (!lat) return;
                        
                        setLiveData(prev => {
                            const current = prev[aid] || [];
                            if (current.some(r => r.timestamp === lat.timestamp)) return prev;
                            return { ...prev, [aid]: [...current, lat].slice(-200) };
                        });
                    });

                    // B. ML Insight Listener (Latest Snapshot)
                    const mlInsightRef = dbRef(db, `athlete_records/${aid}/ml_insight`);
                    const unsubML = onValue(mlInsightRef, (mSnap) => {
                        if (mSnap.exists()) {
                            setMlInsights(prev => ({ ...prev, [aid]: mSnap.val() }));
                        }
                    });

                    // C. ML Predictions Listener (Trend Tracking)
                    const mlPredsRef = dbRef(db, `athlete_records/${aid}/ml_predictions`);
                    const unsubMLPreds = onValue(mlPredsRef, (mhSnap) => {
                        if (mhSnap.exists()) {
                            const data = mhSnap.val();
                            const sortedML = Object.values(data)
                                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                            console.log(`[AthleteContext] Received ${sortedML.length} predictions for ${aid}`);
                            setMlHistory(prev => ({ ...prev, [aid]: sortedML.slice(-200) }));
                        }
                    });

                    // Store unsubs for cleanup
                    listenersRef.current[aid] = () => {
                        unsubLat();
                        unsubML();
                        unsubMLPreds();
                    };
                }
            });
            
            setLoading(false);
            setConnected(true);
        }, (err) => console.error("[AthleteData] Users Fetch Error:", err));

        return () => {
            console.log("[AthleteData] Cleaning up global listeners...");
            unsubConn();
            unsubUsers();
            Object.values(listenersRef.current).forEach(unsub => unsub());
            listenersRef.current = {};
        };
    }, []);

    const getAthleteData = (id) => liveData[id] || [];
    const getMLHistory = (id) => mlHistory[id] || [];
    const getLatest = (id) => {
        const data = liveData[id];
        return data && data.length > 0 ? data[data.length - 1] : null;
    };

    const value = {
        athletes,
        liveData,
        mlInsights,
        mlHistory,
        loading,
        connected,
        getAthleteData,
        getMLHistory,
        getLatest
    };

    return (
        <AthleteDataContext.Provider value={value}>
            {children}
        </AthleteDataContext.Provider>
    );
};
