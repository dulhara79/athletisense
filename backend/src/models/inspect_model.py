import joblib
import os

model_path = 'c:/Users/dulha/Downloads/GitHub/athletisense/backend/src/models/temporal_forecaster_global.joblib'
try:
    model = joblib.load(model_path)
    print(f"Features in model: {model.n_features_in_}")
    # If it's a HistGradientBoostingRegressor, it might not have feature_names_in_ unless it was fitted with a DataFrame
    if hasattr(model, 'feature_names_in_'):
        print(f"Feature names: {model.feature_names_in_}")
except Exception as e:
    print(f"Error: {e}")
