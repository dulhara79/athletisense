import joblib
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
m1 = joblib.load(os.path.join(CURRENT_DIR, "anomaly_detector_production.joblib"))

print("M1 Model Type:", type(m1.get('model')))
