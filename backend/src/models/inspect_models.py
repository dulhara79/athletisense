import joblib
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
m1 = joblib.load(os.path.join(CURRENT_DIR, "anomaly_detector_production.joblib"))
m2 = joblib.load(os.path.join(CURRENT_DIR, "behavior_analyzer_production.joblib"))

print("M1 Keys:", m1.keys())
print("M2 Keys:", m2.keys())
print("M1 Features:", m1.get('features'))
print("M2 Features:", m2.get('features'))
