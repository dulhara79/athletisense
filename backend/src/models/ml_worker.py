"""
AthletiSense Live ML Inference Worker (Production Unified)
----------------------------------------------------------
This script runs continuously alongside the Node.js backend. 
It listens for live ESP32 telemetry across ALL athletes in Firebase.
"""

import time
import logging
import joblib
import pandas as pd
import numpy as np
import os
import firebase_admin
from firebase_admin import credentials, db

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] ML Worker: %(message)s')

# --- Configuration ---
FIREBASE_DB_URL = 'https://performance-monitering-glove-default-rtdb.firebaseio.com/'
CRED_PATH = "C:/Users/dulha/Downloads/GitHub/athletisense/backend/performance-monitering-glove-firebase-adminsdk.json"
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Global state to prevent re-processing same data
last_processed_ts = {}

# --- 1. Load Trained Models ---
logging.info("Loading pre-trained ML artifacts...")

try:
    # Use production unified models
    alerter_pipeline = joblib.load(os.path.join(CURRENT_DIR, "anomaly_detector_production.joblib"))
    behavior_pipeline = joblib.load(os.path.join(CURRENT_DIR, "behavior_analyzer_production.joblib"))
    logging.info("Models loaded successfully.")
except Exception as e:
    logging.error(f"Failed to load models: {e}")
    exit(1)

# --- 2. Initialize Firebase ---
try:
    cred = credentials.Certificate(CRED_PATH)
    firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})
    logging.info("Connected to Firebase.")
except Exception as e:
    logging.error(f"Firebase Init Error: {e}")
    exit(1)

def process_all_telemetry():
    """Polls all athlete nodes, runs inference, and writes insights."""
    try:
        # Get all athlete records
        root_ref = db.reference('athlete_records')
        all_records = root_ref.get()

        if not all_records:
            return

        for athlete_id, data in all_records.items():
            latest = data.get('latest')
            if not latest or 'heart_rate' not in latest:
                continue

            # Check if we already processed this timestamp
            current_ts = latest.get('timestamp')
            if last_processed_ts.get(athlete_id) == current_ts:
                continue

            # Format features for model
            try:
                features = {
                    'heart_rate_bpm': float(latest.get('heart_rate', {}).get('bpm', 70)),
                    'temperature_celsius': float(latest.get('temperature', {}).get('celsius', 36.5)),
                    'respiration_rate': float(latest.get('respiration', {}).get('rate_instant', 15)),
                    'motion_accel_g': float(latest.get('motion', {}).get('accel_z', 16384)) / 16384.0
                }
            except (ValueError, TypeError, AttributeError):
                continue

            live_df = pd.DataFrame([features])

            # Get scalers (use global or specific)
            scaler_a = alerter_pipeline['athlete_scalers'].get(athlete_id) or alerter_pipeline['athlete_scalers'].get('ATH_001')
            scaler_b = behavior_pipeline['athlete_scalers'].get(athlete_id) or behavior_pipeline['athlete_scalers'].get('ATH_001')

            if not scaler_a or not scaler_b:
                continue

            # --- A. Dynamic Alert Inference (IsolationForest) ---
            X_scaled = scaler_a.transform(live_df[alerter_pipeline['features']].values)
            
            # IsolationForest decision_function returns signed anomaly score
            # Lower means more abnormal.
            score = float(alerter_pipeline['model'].decision_function(X_scaled)[0])
            is_anomaly = bool(alerter_pipeline['model'].predict(X_scaled)[0] == -1)
            
            # Severity mapping (0 to 1 scale roughly)
            severity = round(abs(min(0, score)) * 10, 2)
            
            # --- B. Behavior Clustering Inference (K-Means) ---
            X_cluster = scaler_b.transform(live_df[behavior_pipeline['features']].values)
            cluster_id = int(behavior_pipeline['model'].predict(X_cluster)[0])
            states = {0: "Resting Base", 1: "Active Load", 2: "Peak Intensity"}

            # --- 3. Construct Insight Payload ---
            insight_payload = {
                "timestamp": current_ts,
                "dynamic_alerts": {
                    "is_anomaly": is_anomaly,
                    "severity_score": severity,
                    "action": "CRITICAL: Detected multi-sensor physiological anomaly." if is_anomaly else "Normal biometrics."
                },
                "behavior_cluster": {
                    "current_state": states.get(cluster_id, "Unknown"),
                    "cluster_id": cluster_id
                }
            }

            # Write directly to the authorized athlete path
            db.reference(f'athlete_records/{athlete_id}/ml_insight').set(insight_payload)
            
            # Update cache
            last_processed_ts[athlete_id] = current_ts
            logging.info(f"[{athlete_id}] Inference Complete. Anomaly: {is_anomaly} | State: {states.get(cluster_id)}")

    except Exception as e:
        logging.error(f"Worker Loop Error: {str(e)}")

if __name__ == "__main__":
    logging.info("Worker actively monitoring all athletes...")
    while True:
        process_all_telemetry()
        time.sleep(3)