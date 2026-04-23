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

    useEffect(() => {
        console.log("[AthleteData] Initializing global listeners...");
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
                    
                    // A. Latest Telemetry Listener
                    const latestRef = dbRef(db, `athlete_records/${aid}/latest`);
                    const unsubLat = onValue(latestRef, (lSnap) => {
                        if (!lSnap.exists()) return;
                        const lat = normaliseRecord(lSnap.val());
                        if (!lat) return;
                        
                        setLiveData(prev => {
                            const current = prev[aid] || [];
                            // Avoid duplicate points if Firebase triggers twice for same TS
                            if (current.some(r => r.timestamp === lat.timestamp)) return prev;
                            return { ...prev, [aid]: [...current, lat].slice(-100) };
                        });
                    });

                    // B. ML Insight Listener (The core of the AI Coaching system)
                    const mlInsightRef = dbRef(db, `athlete_records/${aid}/ml_insight`);
                    const unsubML = onValue(mlInsightRef, (mSnap) => {
                        if (mSnap.exists()) {
                            setMlInsights(prev => ({ ...prev, [aid]: mSnap.val() }));
                        }
                    });

                    // Store unsubs for cleanup
                    listenersRef.current[aid] = () => {
                        unsubLat();
                        unsubML();
                    };
                }
            });
            
            setLoading(false);
            setConnected(true);
        }, (err) => console.error("[AthleteData] Users Fetch Error:", err));

        return () => {
            console.log("[AthleteData] Cleaning up global listeners...");
            unsubUsers();
            Object.values(listenersRef.current).forEach(unsub => unsub());
            listenersRef.current = {};
        };
    }, []);

    const getAthleteData = (id) => liveData[id] || [];
    const getLatest = (id) => {
        const data = liveData[id];
        return data && data.length > 0 ? data[data.length - 1] : null;
    };

    const value = {
        athletes,
        liveData,
        mlInsights,
        loading,
        connected,
        getAthleteData,
        getLatest
    };

    return (
        <AthleteDataContext.Provider value={value}>
            {children}
        </AthleteDataContext.Provider>
    );
};
