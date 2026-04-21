"""
AthletiSense ML Pipeline: Multi-Dimensional Anomaly Detection
-------------------------------------------------------------
This module utilizes an Isolation Forest to detect complex, multi-sensor 
anomalies in IoT telemetry. It isolates extreme physiological events or 
hardware glitches that univariate statistical bounds (like Z-scores) miss.

Production enhancements include:
- Robust error handling for data ingestion
- Anomaly severity scoring
- Automated time-series visualization for academic reporting
- Model serialization for production deployment

Author: AthletiSense Core Engineering
"""

import os
import logging
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from typing import List, Dict, Optional
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.exceptions import NotFittedError

# Configure Production-Grade Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("AnomalyDetector")


class TelemetryAnomalyDetector:
    def __init__(self, features: List[str], contamination: float = 0.015):
        """
        Initializes the Isolation Forest anomaly detector.
        
        Args:
            features (List[str]): Sensor metrics to evaluate simultaneously.
            contamination (float): The expected proportion of outliers in the dataset.
                                   Set to 1.5% to match our expected hardware/physiological noise.
        """
        if not features:
            raise ValueError("Feature list cannot be empty.")
            
        self.features = features
        self.contamination = contamination
        
        # Isolation Forest isolates anomalies using random decision trees
        self.model = IsolationForest(
            n_estimators=200, 
            max_samples='auto', 
            contamination=self.contamination, 
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self._is_fitted: bool = False

    def load_and_validate_data(self, filepath: str, athlete_id: Optional[str] = None) -> pd.DataFrame:
        """
        Safely loads telemetry, parsing timestamps for time-series visualization.
        """
        logger.info(f"Loading dataset from {filepath}...")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Missing dataset at {filepath}")
            
        try:
            df = pd.read_csv(filepath)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        except Exception as e:
            logger.error(f"Failed to parse CSV or timestamps: {str(e)}")
            raise

        required_cols = self.features + ['timestamp', 'athlete_id']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise KeyError(f"Dataset missing required columns: {missing_cols}")
            
        if athlete_id:
            logger.info(f"Filtering dataset for Athlete: {athlete_id}")
            df = df[df['athlete_id'] == athlete_id]
            
        clean_df = df.dropna(subset=self.features).sort_values('timestamp').reset_index(drop=True)
        
        if clean_df.empty:
            raise ValueError("Dataset is empty after cleaning.")
            
        logger.info(f"Successfully loaded {len(clean_df)} records.")
        return clean_df

    def detect_anomalies(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Trains the model and predicts anomalies on the dataset.
        Assigns an anomaly score to rank the severity of the outlier.
        """
        logger.info("Scaling features and executing Isolation Forest...")
        
        # Deep copy to avoid mutating the original dataframe
        result_df = df.copy()
        
        X = result_df[self.features].values
        
        try:
            # While Isolation Forests don't strictly require scaling, it stabilizes
            # multi-dimensional distance calculations under the hood.
            X_scaled = self.scaler.fit_transform(X)
            
            self.model.fit(X_scaled)
            self._is_fitted = True
            
            # Predict returns 1 for normal, -1 for anomaly
            predictions = self.model.predict(X_scaled)
            
            # Score samples returns negative anomaly scores (lower = more abnormal)
            # We invert it so higher positive score = worse anomaly
            scores = self.model.decision_function(X_scaled)
            
            result_df['is_anomaly'] = predictions == -1
            result_df['anomaly_severity_score'] = scores * -1 
            
            anomaly_count = result_df['is_anomaly'].sum()
            logger.info(f"Detection complete. Found {anomaly_count} anomalies "
                        f"({(anomaly_count/len(result_df))*100:.2f}% of data).")
            
            return result_df
            
        except Exception as e:
            logger.error(f"Anomaly detection failed: {str(e)}")
            self._is_fitted = False
            raise

    def visualize_anomalies(self, df: pd.DataFrame, target_metric: str = 'heart_rate_bpm', 
                            athlete_id: str = "Global", output_dir: str = "."):
        """
        Plots a time-series graph highlighting where the ML algorithm detected anomalies.
        """
        if not self._is_fitted or 'is_anomaly' not in df.columns:
            raise NotFittedError("Data must be processed by `detect_anomalies` first.")
            
        if target_metric not in self.features:
            raise ValueError(f"Target metric {target_metric} not in feature list.")

        plt.figure(figsize=(14, 6))
        
        # Plot normal data timeline
        normal_data = df[df['is_anomaly'] == False]
        plt.plot(df['timestamp'], df[target_metric], color='#94A3B8', alpha=0.5, label=f'Normal {target_metric}', linewidth=1.5)
        
        # Overlay anomalies as distinct red scatter points
        anomalies = df[df['is_anomaly'] == True]
        plt.scatter(anomalies['timestamp'], anomalies[target_metric], 
                    color='#EF4444', s=50, label='Detected Anomaly', edgecolor='black', zorder=5)

        title = f"Isolation Forest Anomaly Detection: {target_metric}\n(Athlete: {athlete_id})"
        plt.title(title, fontsize=14, fontweight='bold', pad=10)
        plt.xlabel("Time", fontsize=12)
        plt.ylabel(target_metric.replace('_', ' ').title(), fontsize=12)
        
        # Format X-axis for better time readability
        plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%m-%d %H:%M'))
        plt.xticks(rotation=45)
        
        plt.legend(loc='upper right')
        plt.grid(True, linestyle='--', alpha=0.4)
        plt.tight_layout()
        
        os.makedirs(output_dir, exist_ok=True)
        plot_path = os.path.join(output_dir, f"anomaly_detection_{athlete_id}.png")
        
        try:
            plt.savefig(plot_path, dpi=300)
            logger.info(f"Saved anomaly visualization to {plot_path}")
        except Exception as e:
            logger.error(f"Failed to save visualization: {str(e)}")
        finally:
            plt.close()

    def export_pipeline(self, athlete_id: str, output_dir: str = "."):
        """Serializes the scaler and Isolation Forest model."""
        if not self._is_fitted:
            raise NotFittedError("Cannot export an untrained pipeline.")
            
        artifact = {
            'features': self.features,
            'scaler': self.scaler,
            'model': self.model,
            'contamination': self.contamination
        }
        
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.join(output_dir, f"anomaly_detector_{athlete_id}.joblib")
        
        try:
            joblib.dump(artifact, filename)
            logger.info(f"Pipeline exported successfully to {filename}")
        except Exception as e:
            logger.error(f"Failed to export artifact: {str(e)}")
            raise


if __name__ == "__main__":
    # We feed ALL physiological sensors into the model so it can find multi-dimensional outliers
    SENSORS = ['heart_rate_bpm', 'temperature_celsius', 'respiration_rate', 'motion_accel_g']
    ATHLETE = 'ATH_001'  # E.g., isolating Uvindu's telemetry
    DATA_PATH = 'synthetic_telemetry.csv'
    
    # Set contamination to 1.5% to match the injected noise in our synthetic data generator
    detector = TelemetryAnomalyDetector(features=SENSORS, contamination=0.015)
    
    try:
        # 1. Load and validate data
        dataset = detector.load_and_validate_data(DATA_PATH, athlete_id=ATHLETE)
        
        # 2. Execute ML-driven Anomaly Detection
        analyzed_data = detector.detect_anomalies(dataset)
        
        # Show the most severe anomalies based on the severity score
        top_anomalies = analyzed_data[analyzed_data['is_anomaly']].sort_values(by='anomaly_severity_score', ascending=False)
        logger.info("\nMost Severe Anomalies Detected:")
        print(top_anomalies[['timestamp'] + SENSORS + ['anomaly_severity_score']].head())
        
        # 3. Generate visualization for the project report
        detector.visualize_anomalies(analyzed_data, target_metric='heart_rate_bpm', athlete_id=ATHLETE)
        
        # 4. Export the model
        detector.export_pipeline(athlete_id=ATHLETE)
        
        logger.info("✅ Anomaly Detection Pipeline execution completed successfully.")
        
    except FileNotFoundError:
        logger.error("Execution halted: Please generate the synthetic dataset first.")
    except Exception as e:
        logger.error(f"Execution halted due to unexpected error: {str(e)}")