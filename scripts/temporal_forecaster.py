"""
AthletiSense ML Pipeline: Temporal Trend Analysis
-------------------------------------------------
This module trains an autoregressive time-series forecasting model to predict 
future physiological trends (Heart Rate) based on historical sensor telemetry, 
time-of-day features, and rolling exertion metrics.

Author: AthletiSense Core Engineering
"""

import os
import logging
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import Tuple, List
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit

# Configure Production-Grade Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("TemporalForecaster")


class PhysiologicalTrendForecaster:
    def __init__(self, target_metric: str = 'heart_rate_bpm', lookback_steps: int = 6):
        """
        Initializes the forecaster.
        :param target_metric: The telemetry column to forecast.
        :param lookback_steps: How many previous intervals to use as features (e.g., 6 steps = 30 mins).
        """
        self.target_metric = target_metric
        self.lookback_steps = lookback_steps
        self.model = HistGradientBoostingRegressor(
            max_iter=200, 
            learning_rate=0.05, 
            max_depth=5,
            random_state=42
        )
        self.features: List[str] = []
        
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transforms raw IoT telemetry into a supervised learning dataset.
        Creates lag features, rolling windows, and cyclical time variables.
        """
        logger.info("Engineering temporal and lagged features...")
        df = df.copy()
        
        # 1. Temporal Features (Time of day matters for circadian rhythms)
        df['hour'] = df['timestamp'].dt.hour
        df['minute'] = df['timestamp'].dt.minute
        # Cyclical encoding for hour (so 23:00 and 01:00 are recognized as close)
        df['hour_sin'] = np.sin(df['hour'] * (2. * np.pi / 24))
        df['hour_cos'] = np.cos(df['hour'] * (2. * np.pi / 24))
        
        # 2. Lagged Features (What was the HR 5 mins ago? 10 mins ago?)
        for i in range(1, self.lookback_steps + 1):
            df[f'lag_{i}_{self.target_metric}'] = df.groupby('athlete_id')[self.target_metric].shift(i)
            df[f'lag_{i}_motion'] = df.groupby('athlete_id')['motion_accel_g'].shift(i)
            
        # 3. Rolling Statistics (Smoothing out noise to find the trend)
        df['rolling_mean_30m'] = df.groupby('athlete_id')[self.target_metric].transform(
            lambda x: x.rolling(window=6, min_periods=1).mean()
        )
        df['rolling_std_30m'] = df.groupby('athlete_id')[self.target_metric].transform(
            lambda x: x.rolling(window=6, min_periods=1).std()
        )
        
        # Drop NaN values created by shifting/rolling
        df = df.dropna()
        
        # Define the final feature set
        self.features = [
            'hour_sin', 'hour_cos', 'rolling_mean_30m', 'rolling_std_30m'
        ] + [f'lag_{i}_{self.target_metric}' for i in range(1, self.lookback_steps + 1)] + \
            [f'lag_{i}_motion' for i in range(1, self.lookback_steps + 1)]
            
        return df

    def prepare_data(self, filepath: str) -> pd.DataFrame:
        """Loads and sorts the dataset, ensuring strict chronological order."""
        logger.info(f"Loading data from {filepath}...")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Dataset not found at {filepath}")
            
        df = pd.read_csv(filepath)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values(by=['athlete_id', 'timestamp']).reset_index(drop=True)
        return self._engineer_features(df)

    def train_and_evaluate(self, df: pd.DataFrame, athlete_id: str = None) -> None:
        """
        Trains the model using a strict time-series split (predicting the future 
        using only the past) and evaluates its performance.
        """
        if athlete_id:
            logger.info(f"Filtering training data for Athlete: {athlete_id}")
            df = df[df['athlete_id'] == athlete_id]
            
        X = df[self.features]
        y = df[self.target_metric]
        timestamps = df['timestamp']
        
        # We cannot use standard random train_test_split for time-series!
        # We must split chronologically. E.g., Train on first 80%, Test on last 20%
        split_idx = int(len(df) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        time_test = timestamps.iloc[split_idx:]
        
        logger.info(f"Training set size: {len(X_train)} | Test set size: {len(X_test)}")
        
        # Train Model
        logger.info("Training HistGradientBoostingRegressor...")
        self.model.fit(X_train, y_train)
        
        # Evaluate Model
        predictions = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))
        
        logger.info(f"--- Evaluation Metrics ({athlete_id or 'All Athletes'}) ---")
        logger.info(f"Mean Absolute Error (MAE): {mae:.2f} bpm")
        logger.info(f"Root Mean Squared Error (RMSE): {rmse:.2f} bpm")
        
        self._plot_results(time_test, y_test, predictions, athlete_id)

    def _plot_results(self, time_test: pd.Series, y_actual: pd.Series, y_pred: np.ndarray, athlete_id: str):
        """Generates a visual artifact for the assignment report."""
        plt.figure(figsize=(14, 6))
        
        # Plot only a subset (e.g., last 2 days) for clarity in the chart
        subset_len = min(500, len(time_test))
        plt.plot(time_test.iloc[-subset_len:], y_actual.iloc[-subset_len:], label='Actual Heart Rate', color='lightgray', linewidth=2)
        plt.plot(time_test.iloc[-subset_len:], y_pred[-subset_len:], label='ML Predicted Trend', color='#2563EB', linewidth=2, alpha=0.8)
        
        title = f"Temporal Trend Forecasting - {athlete_id or 'All Athletes'}"
        plt.title(title, fontsize=14, fontweight='bold')
        plt.xlabel("Time", fontsize=12)
        plt.ylabel("Heart Rate (bpm)", fontsize=12)
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.5)
        plt.tight_layout()
        
        plot_path = f"trend_forecast_{athlete_id or 'global'}.png"
        plt.savefig(plot_path, dpi=300)
        logger.info(f"Saved visual forecast to {plot_path}")

    def export_model(self, filepath: str = "forecaster_model.joblib"):
        """Serializes the trained model for production deployment."""
        joblib.dump(self.model, filepath)
        logger.info(f"Model exported successfully to {filepath}")


if __name__ == "__main__":
    # Initialize the Pipeline
    forecaster = PhysiologicalTrendForecaster(target_metric='heart_rate_bpm')
    
    # 1. Load and Engineer Features
    dataset = forecaster.prepare_data('synthetic_telemetry.csv')
    
    # 2. Train and Evaluate for a specific athlete (e.g., Dulhara - ATH_001)
    # This demonstrates personalization in the ML models
    forecaster.train_and_evaluate(dataset, athlete_id='ATH_001')
    
    # 3. Export the trained artifact
    forecaster.export_model("athlete_001_trend_model.joblib")
    
    print("\n✅ Task Complete. Check the generated PNG file for your report.")