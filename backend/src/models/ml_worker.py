"""
AthletiSense Live ML Inference Worker
-------------------------------------
This script runs continuously alongside the Node.js backend. 
It listens for live ESP32 telemetry in Firebase, runs the data through 
the pre-trained Machine Learning pipelines, and pushes the actionable 
insights back to the React dashboard via the /ml_insights node.
"""

import time
import logging
import joblib
import pandas as pd
import os
import firebase_admin
from firebase_admin import credentials, db

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] ML Worker: %(message)s')

# --- Configuration ---
# Update this with your actual Firebase DB URL
FIREBASE_DB_URL = 'https://performance-monitering-glove-default-rtdb.firebaseio.com/'
ATHLETE_ID = 'ATH_001' # The athlete you are demonstrating in the Viva

# --- 1. Load Trained Models ---
logging.info("Loading pre-trained ML artifacts...")

# This gets the exact folder where ml_worker.py is currently sitting
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    alerter_path = os.path.join(CURRENT_DIR, f"alerter_pipeline_{ATHLETE_ID}.joblib")
    behavior_path = os.path.join(CURRENT_DIR, f"behavior_analyzer_{ATHLETE_ID}.joblib")
    
    alerter_pipeline = joblib.load(alerter_path)
    behavior_pipeline = joblib.load(behavior_path)
    logging.info("Models loaded successfully.")
except FileNotFoundError as e:
    logging.error(f"Model files not found. Exact path checked: {e}")
    exit(1)
# --- 2. Initialize Firebase ---
logging.info("Connecting to Firebase...")
cred = credentials.Certificate("C:/Users/dulha/Downloads/GitHub/athletisense/backend/performance-monitering-glove-firebase-adminsdk.json")
firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})

def process_latest_telemetry():
    """Fetches the latest ESP32 data, runs inference, and writes insights."""
    try:
        # Fetch the latest 1-minute reading from the ESP32
        ref = db.reference(f'athlete_records/{ATHLETE_ID}/latest')
        latest_data = ref.get()

        if not latest_data or 'heart_rate' not in latest_data:
            return

        # Format the data exactly how the models expect it
        features = {
            'heart_rate_bpm': latest_data['heart_rate']['bpm'],
            'temperature_celsius': latest_data['temperature']['celsius'],
            'respiration_rate': latest_data['respiration']['rate_instant'],
            'motion_accel_g': latest_data['motion']['accel_z'] / 16384.0 # Convert raw to G
        }
        
        live_df = pd.DataFrame([features])

        # --- A. Dynamic Alert Inference (GMM) ---
        X_scaled = alerter_pipeline['scaler'].transform(live_df[alerter_pipeline['features']].values)
        log_prob = alerter_pipeline['gmm_model'].score_samples(X_scaled)[0]
        is_anomaly = bool(log_prob < alerter_pipeline['threshold'])
        
        # --- B. Behavior Clustering Inference (K-Means) ---
        X_cluster = behavior_pipeline['scaler'].transform(live_df[behavior_pipeline['features']].values)
        cluster_id = int(behavior_pipeline['model'].predict(X_cluster)[0])
        states = {0: "Resting Base", 1: "Active Load", 2: "Peak Intensity"}

        # --- 3. Construct and Push the Insight Payload ---
        insight_payload = {
            "timestamp": latest_data['timestamp'],
            "dynamic_alerts": {
                "is_anomaly": is_anomaly,
                "severity_score": round(abs(log_prob), 2),
                "action": "MEDICAL ALERT: Complex anomaly detected across multiple sensors." if is_anomaly else "Normal parameters."
            },
            "behavior_cluster": {
                "current_state": states.get(cluster_id, "Unknown"),
                "cluster_id": cluster_id
            }
        }

        # Push to the node that our Node.js WebSocket is listening to
        db.reference(f'ml_insights/{ATHLETE_ID}').set(insight_payload)
        logging.info(f"Processed telemetry. Anomaly: {is_anomaly} | State: {states.get(cluster_id)}")

    except Exception as e:
        logging.error(f"Inference error: {str(e)}")

# --- 4. The Main Loop ---
if __name__ == "__main__":
    logging.info("Worker actively monitoring Firebase...")
    while True:
        # Run inference every 60 seconds to match the ESP32 upload interval
        process_latest_telemetry()
        # time.sleep(60)
        time.sleep(5)