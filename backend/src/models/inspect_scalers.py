import joblib
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
m1 = joblib.load(os.path.join(CURRENT_DIR, "anomaly_detector_production.joblib"))

print("M1 Athlete Scalers:", m1.get('athlete_scalers').keys() if m1.get('athlete_scalers') else "None")
