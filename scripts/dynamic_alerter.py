"""
AthletiSense ML Pipeline: Dynamic Threshold Alerts (Production Release)
---------------------------------------------------------------------
This module replaces hard-coded clinical limits with learned, multidimensional
probability boundaries using Gaussian Mixture Models (GMM). 

Production enhancements include:
- Defensive state validation (NotFittedError prevention)
- Comprehensive exception handling for I/O and data streams
- Strict type hinting and modular execution

Author: AthletiSense Core Engineering
"""

import os
import logging
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Tuple, Optional
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.exceptions import NotFittedError

# Configure Production-Grade Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("DynamicAlerter")


class DensityBasedAlerter:
    def __init__(self, features: List[str], anomaly_percentile: float = 1.5):
        """
        Initializes the dynamic thresholding model.
        
        Args:
            features (List[str]): Sensor metrics for the multidimensional space.
            anomaly_percentile (float): Percentage of historical data considered "abnormal".
        """
        if not features:
            raise ValueError("Feature list cannot be empty.")
            
        self.features = features
        self.anomaly_percentile = anomaly_percentile
        
        # 3 components for 3 primary physiological states: Resting, Active, High Intensity
        self.model = GaussianMixture(n_components=3, covariance_type='full', random_state=42)
        self.scaler = StandardScaler()
        
        self.learned_log_prob_threshold: Optional[float] = None 
        self._is_fitted: bool = False

    def load_and_prep_data(self, filepath: str, athlete_id: str) -> pd.DataFrame:
        """
        Loads historical telemetry safely and isolates a specific athlete.
        """
        logger.info(f"Loading data for Athlete {athlete_id} from {filepath}...")
        
        if not os.path.exists(filepath):
            logger.error(f"Data source not found: {filepath}")
            raise FileNotFoundError(f"Missing telemetry dataset at {filepath}")
            
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            logger.error(f"Failed to read CSV: {str(e)}")
            raise

        if 'athlete_id' not in df.columns:
            raise KeyError("Dataset is missing the required 'athlete_id' column.")

        athlete_df = df[df['athlete_id'] == athlete_id].copy()
        
        if athlete_df.empty:
            logger.warning(f"No historical records found for {athlete_id}.")
            raise ValueError(f"Insufficient data for athlete {athlete_id}")
            
        # Drop rows missing critical sensor data, resetting index for clean processing
        clean_df = athlete_df.dropna(subset=self.features).reset_index(drop=True)
        logger.info(f"Successfully loaded {len(clean_df)} clean records for {athlete_id}.")
        
        return clean_df

    def train_dynamic_threshold(self, df: pd.DataFrame) -> None:
        """
        Learns the multivariate probability distribution and sets the anomaly threshold.
        """
        if df.empty:
            raise ValueError("Cannot train model on an empty DataFrame.")
            
        logger.info("Scaling features and fitting Gaussian Mixture Model...")
        
        try:
            X = df[self.features].values
            X_scaled = self.scaler.fit_transform(X)
            
            # Learn the physiological distribution
            self.model.fit(X_scaled)
            self._is_fitted = True
            
            # Calculate log probability density for training baseline
            log_probs = self.model.score_samples(X_scaled)
            
            # Define threshold based on the specified percentile
            self.learned_log_prob_threshold = float(np.percentile(log_probs, self.anomaly_percentile))
            
            logger.info(f"Learned Log-Probability Threshold set at: {self.learned_log_prob_threshold:.4f}")
            
        except Exception as e:
            logger.error(f"Model training failed: {str(e)}")
            self._is_fitted = False
            raise

    def evaluate_live_stream(self, live_data: pd.DataFrame) -> pd.DataFrame:
        """
        Evaluates incoming telemetry against the learned threshold.
        """
        if not self._is_fitted or self.learned_log_prob_threshold is None:
            raise NotFittedError("The GMM model must be trained before evaluating live data.")
            
        if live_data.empty:
            logger.warning("Empty live stream provided. Skipping evaluation.")
            return live_data

        logger.info("Evaluating new telemetry against dynamic threshold...")
        
        # Ensure we only evaluate complete records
        eval_data = live_data.dropna(subset=self.features).copy()
        
        X_live = eval_data[self.features].values
        X_scaled = self.scaler.transform(X_live)
        
        log_probs = self.model.score_samples(X_scaled)
        
        eval_data['log_probability'] = log_probs
        eval_data['is_alert'] = log_probs < self.learned_log_prob_threshold
        
        alerts_triggered = int(eval_data['is_alert'].sum())
        logger.info(f"Evaluation complete: {alerts_triggered} anomalies flagged out of {len(eval_data)} readings.")
        
        return eval_data

    def visualize_learned_boundary(self, df: pd.DataFrame, athlete_id: str, output_dir: str = "."):
        """
        Generates a 2D contour visualization of the learned ML boundary vs hard-coded rules.
        """
        if 'heart_rate_bpm' not in self.features or 'temperature_celsius' not in self.features:
            logger.warning("HR and Temp not in features; skipping visualization.")
            return
            
        if 'is_alert' not in df.columns:
            logger.warning("Data has not been evaluated. Run `evaluate_live_stream` first.")
            return

        plt.figure(figsize=(10, 8))
        
        # Historical / Normal Data
        normal_data = df[df['is_alert'] == False]
        plt.scatter(normal_data['heart_rate_bpm'], normal_data['temperature_celsius'], 
                    alpha=0.4, color='#94A3B8', label='Normal Physiological Range', s=15)
        
        # Anomalies
        anomalies = df[df['is_alert'] == True]
        plt.scatter(anomalies['heart_rate_bpm'], anomalies['temperature_celsius'], 
                    color='#EF4444', label='ML-Triggered Alerts', s=40, edgecolor='black', zorder=5)

        # Legacy Hard-Coded Rules (for contrast)
        plt.axvline(x=185, color='black', linestyle='--', linewidth=2, label='Static HR Limit (>185)')
        plt.axhline(y=38.5, color='orange', linestyle='--', linewidth=2, label='Static Temp Limit (>38.5)')

        plt.title(f"Learned Multidimensional Threshold vs Static Rules ({athlete_id})", fontsize=14, fontweight='bold')
        plt.xlabel("Heart Rate (bpm)", fontsize=12)
        plt.ylabel("Skin Temperature (°C)", fontsize=12)
        plt.legend(loc='upper left')
        plt.grid(True, linestyle=':', alpha=0.6)
        plt.tight_layout()
        
        os.makedirs(output_dir, exist_ok=True)
        plot_path = os.path.join(output_dir, f"dynamic_threshold_{athlete_id}.png")
        
        try:
            plt.savefig(plot_path, dpi=300)
            logger.info(f"Saved boundary visualization to {plot_path}")
        except Exception as e:
            logger.error(f"Failed to save visualization: {str(e)}")
        finally:
            plt.close()

    def export_pipeline(self, athlete_id: str, output_dir: str = "."):
        """Saves the scaler, model, and threshold for backend API integration."""
        if not self._is_fitted:
            raise NotFittedError("Cannot export an untrained pipeline.")
            
        artifact = {
            'features': self.features,
            'scaler': self.scaler,
            'gmm_model': self.model,
            'threshold': self.learned_log_prob_threshold
        }
        
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.join(output_dir, f"alerter_pipeline_{athlete_id}.joblib")
        
        try:
            joblib.dump(artifact, filename)
            logger.info(f"Pipeline exported successfully to {filename}")
        except Exception as e:
            logger.error(f"Failed to export pipeline artifact: {str(e)}")
            raise


if __name__ == "__main__":
    # Define the sensors we are monitoring simultaneously
    target_sensors = ['heart_rate_bpm', 'temperature_celsius', 'respiration_rate', 'motion_accel_g']
    athlete = 'ATH_001'
    data_path = '/content/synthetic_telemetry.csv'
    
    # Initialize Alerter
    alerter = DensityBasedAlerter(features=target_sensors, anomaly_percentile=1.5)
    
    try:
        # 1. Safely load Data
        dataset = alerter.load_and_prep_data(data_path, athlete_id=athlete)
        
        # Simulate chronological streaming: Train on the first 80%, test on the last 20%
        split_idx = int(len(dataset) * 0.8)
        train_df = dataset.iloc[:split_idx].copy()
        live_df = dataset.iloc[split_idx:].copy()
        
        # 2. Learn dynamic threshold
        alerter.train_dynamic_threshold(train_df)
        
        # 3. Evaluate live stream
        evaluated_data = alerter.evaluate_live_stream(live_df)
        
        # 4. Generate visualization
        alerter.visualize_learned_boundary(evaluated_data, athlete_id=athlete)
        
        # 5. Export for backend consumption
        alerter.export_pipeline(athlete_id=athlete)
        
        logger.info("✅ Pipeline execution completed successfully.")
        
    except FileNotFoundError:
        logger.error("Execution halted: Please generate the synthetic dataset first.")
    except Exception as e:
        logger.error(f"Execution halted due to unexpected error: {str(e)}")