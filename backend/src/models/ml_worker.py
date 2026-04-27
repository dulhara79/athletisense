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

from dotenv import load_dotenv

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] ML Worker: %(message)s')

# --- Configuration ---
# Load environment variables from backend/.env
# Since ml_worker.py is in backend/src/models/, we look two levels up.
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_dotenv(env_path)

FIREBASE_DB_URL = os.getenv('FIREBASE_DATABASE_URL', 'https://performance-monitering-glove-default-rtdb.firebaseio.com/').strip('"')
CRED_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', './performance-monitering-glove-firebase-adminsdk.json').strip('"'))
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Global state to prevent re-processing same data
last_processed_ts = {}
# History buffer for forecasting lags (Store last 6 readings per athlete)
athlete_history = {} 

# --- 1. Load Trained Models ---
logging.info("Loading pre-trained ML artifacts...")

try:
    # Use production unified models
    alerter_pipeline = joblib.load(os.path.join(CURRENT_DIR, "anomaly_detector_production.joblib"))
    behavior_pipeline = joblib.load(os.path.join(CURRENT_DIR, "behavior_analyzer_production.joblib"))
    # Load the temporal forecaster for live predictions
    forecaster_model = joblib.load(os.path.join(CURRENT_DIR, "temporal_forecaster_global.joblib"))
    
    import sklearn
    logging.info(f"All models (including Forecaster) loaded successfully. sklearn version: {sklearn.__version__}")
except Exception as e:
    logging.error(f"Failed to load models: {e}")
    exit(1)

# --- 2. Initialize Firebase ---
try:
    import json
    if not os.path.exists(CRED_PATH):
        logging.error(f"Service account file NOT FOUND at: {CRED_PATH}")
        exit(1)
        
    with open(CRED_PATH, 'r') as f:
        service_account_info = json.load(f)
    
    # Critical Fix: Ensure private key newlines are correctly interpreted
    if 'private_key' in service_account_info:
        service_account_info['private_key'] = service_account_info['private_key'].replace('\\n', '\n')
    
    logging.info(f"Connecting to Firebase Project: {service_account_info.get('project_id')} | DB: {FIREBASE_DB_URL}")
    logging.info(f"Using Service Account: {service_account_info.get('client_email')} | Key ID: {service_account_info.get('private_key_id')}")
    
    # Check for potential time drift
    import datetime
    logging.info(f"Current System Time (UTC): {datetime.datetime.utcnow().isoformat()}")
    
    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})
    logging.info("Connected to Firebase.")
except Exception as e:
    logging.error(f"Firebase Init Error: {e}")
    exit(1)

def engineer_forecast_features(athlete_id, current_features, current_ts_str):
    """Calculates lags, rolling stats, and cyclical time for the forecaster."""
    if athlete_id not in athlete_history:
        athlete_history[athlete_id] = []
    
    # Add current reading to history
    athlete_history[athlete_id].append(current_features)
    
    # Keep only enough for lookback (6 lags + current = 7)
    if len(athlete_history[athlete_id]) > 10: 
        athlete_history[athlete_id].pop(0)
    
    if len(athlete_history[athlete_id]) < 7:
        return None # Not enough history for the model yet
    
    history_df = pd.DataFrame(athlete_history[athlete_id])
    
    # 1. Cyclical Time
    try:
        dt = pd.to_datetime(current_ts_str)
        hour = dt.hour
        hour_sin = np.sin(hour * (2. * np.pi / 24))
        hour_cos = np.cos(hour * (2. * np.pi / 24))
    except:
        hour_sin, hour_cos = 0, 1

    # 2. Rolling Stats (last 6)
    recent_hr = history_df['heart_rate_bpm'].tail(6)
    rolling_mean = recent_hr.mean()

    # 3. Lags (1 to 6)
    # The production model expects 15 features:
    # [hour_sin, hour_cos, rolling_mean] + 6 lags HR + 6 lags Motion
    lags_hr_ordered = history_df['heart_rate_bpm'].iloc[-7:-1].tolist()[::-1] 
    lags_motion_ordered = history_df['motion_accel_g'].iloc[-7:-1].tolist()[::-1]

    input_row = [hour_sin, hour_cos, rolling_mean] + lags_hr_ordered + lags_motion_ordered
    return np.array(input_row).reshape(1, -1)

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
            score = float(alerter_pipeline['model'].decision_function(X_scaled)[0])
            is_anomaly = bool(alerter_pipeline['model'].predict(X_scaled)[0] == -1)
            severity = round(abs(min(0, score)) * 10, 2)
            
            # --- B. Behavior Clustering Inference (K-Means) ---
            X_cluster = scaler_b.transform(live_df[behavior_pipeline['features']].values)
            cluster_id = int(behavior_pipeline['model'].predict(X_cluster)[0])
            states = {0: "Resting Base", 1: "Active Load", 2: "Peak Intensity"}

            # --- C. Temporal Trend Forecasting (Gradient Boosting) ---
            predicted_hr = None
            X_forecast = engineer_forecast_features(athlete_id, features, current_ts)
            
            # DEBUG LOG
            buffer_size = len(athlete_history.get(athlete_id, []))
            logging.info(f"[{athlete_id}] History buffer size: {buffer_size}")

            if X_forecast is not None:
                try:
                    predicted_hr = float(forecaster_model.predict(X_forecast)[0])
                    logging.info(f"[{athlete_id}] SUCCESS: Generated Prediction: {predicted_hr}")
                except Exception as e:
                    logging.error(f"[{athlete_id}] Forecasting FAILURE: {e}")
            else:
                logging.info(f"[{athlete_id}] Forecasting SKIPPED: Waiting for more history...")

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
                },
                "predicted_hr": round(predicted_hr, 2) if predicted_hr else None
            }

            # Write directly to the authorized athlete path (latest snapshot)
            db.reference(f'athlete_records/{athlete_id}/ml_insight').set(insight_payload)
            
            # ALSO: Write to a historical node for chart rendering
            # We use a push ID to ensure every prediction is saved uniquely
            db.reference(f'athlete_records/{athlete_id}/ml_predictions').push(insight_payload)

            # Update cache
            last_processed_ts[athlete_id] = current_ts
            logging.info(f"[{athlete_id}] Inference Complete. Anomaly: {is_anomaly} | State: {states.get(cluster_id)} | Pred HR: {predicted_hr}")

    except Exception as e:
        import traceback
        logging.error(f"Worker Loop Error: {str(e)}")
        logging.error(traceback.format_exc())

if __name__ == "__main__":
    logging.info("Worker actively monitoring all athletes...")
    while True:
        process_all_telemetry()
        time.sleep(3)