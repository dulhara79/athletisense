"""
AthletiSense ML Pipeline: Usage & Behavior Pattern Analysis
-----------------------------------------------------------
This module uses K-Means clustering (unsupervised learning) to automatically
discover physiological states and behavior patterns from raw IoT telemetry. 
It replaces hard-coded HR zones (like Z1-Z5) with dynamic, personalized 
clusters based on multidimensional sensor interactions.

Production enhancements include:
- Unsupervised centroid profiling for explainability
- Automated 2D cluster visualization
- Robust error handling and scaling validation
- Model serialization for backend API inference

Author: AthletiSense Core Engineering
"""

import os
import logging
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Optional
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.exceptions import NotFittedError

# Configure Production-Grade Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("BehaviorAnalyzer")


class PhysiologicalBehaviorAnalyzer:
    def __init__(self, features: List[str], n_clusters: int = 3):
        """
        Initializes the unsupervised clustering model.
        
        Args:
            features (List[str]): The physiological metrics to cluster.
            n_clusters (int): The number of states to discover (e.g., 3 = Rest, Active, Peak).
        """
        if not features:
            raise ValueError("Feature list cannot be empty.")
            
        self.features = features
        self.n_clusters = n_clusters
        
        # KMeans groups data into k distinct clusters based on feature variance
        self.model = KMeans(
            n_clusters=self.n_clusters, 
            random_state=42, 
            n_init=10  # Run 10 times with different centroid seeds to find the best fit
        )
        self.scaler = StandardScaler()
        self._is_fitted: bool = False

    def load_and_validate_data(self, filepath: str, athlete_id: Optional[str] = None) -> pd.DataFrame:
        """
        Safely loads telemetry and filters out incomplete records.
        """
        logger.info(f"Loading dataset from {filepath}...")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Missing dataset at {filepath}")
            
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            logger.error(f"Failed to read CSV: {str(e)}")
            raise

        missing_cols = [col for col in self.features if col not in df.columns]
        if missing_cols:
            raise KeyError(f"Dataset is missing required features: {missing_cols}")
            
        if athlete_id:
            logger.info(f"Filtering dataset for Athlete: {athlete_id}")
            df = df[df['athlete_id'] == athlete_id]
            
        clean_df = df.dropna(subset=self.features).reset_index(drop=True)
        
        if clean_df.empty:
            raise ValueError("Dataset is empty after dropping missing values.")
            
        logger.info(f"Dataset validated. Rows ready for clustering: {len(clean_df)}")
        return clean_df

    def discover_patterns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Scales the data, fits the K-Means algorithm, and assigns a behavior
        cluster to every historical reading.
        """
        logger.info(f"Discovering {self.n_clusters} physiological behavior patterns...")
        
        # Deep copy to prevent mutating the original dataframe
        result_df = df.copy()
        X = result_df[self.features].values
        
        try:
            # Scaling is absolutely critical for distance-based algorithms like K-Means.
            # Without it, HR (e.g., 150) would overpower Motion (e.g., 1.5g) mathematically.
            X_scaled = self.scaler.fit_transform(X)
            
            # Fit and predict the clusters simultaneously
            cluster_labels = self.model.fit_predict(X_scaled)
            self._is_fitted = True
            
            result_df['behavior_cluster'] = cluster_labels
            
            # Extract and log the real-world values of the discovered cluster centers
            self._profile_centroids()
            
            return result_df
            
        except Exception as e:
            logger.error(f"Pattern discovery failed: {str(e)}")
            self._is_fitted = False
            raise

    def predict_live_state(self, live_df: pd.DataFrame) -> pd.DataFrame:
        """
        Evaluates new, live streaming data without re-fitting the scaler or model.
        """
        if not self._is_fitted:
            raise NotFittedError("The model must be trained via discover_patterns first.")
            
        if live_df.empty:
            logger.warning("Empty live stream provided. Skipping evaluation.")
            return live_df

        logger.info("Evaluating live telemetry behavior state...")
        
        eval_data = live_df.dropna(subset=self.features).copy()
        X_live = eval_data[self.features].values
        
        # Notice we use .transform(), NOT .fit_transform()
        X_scaled = self.scaler.transform(X_live)
        
        eval_data['behavior_cluster'] = self.model.predict(X_scaled)
        
        return eval_data

    def _profile_centroids(self):
        """
        Translates the mathematical cluster centers back into real-world units
        (bpm, Celsius, etc.) so coaches can interpret what the ML discovered.
        """
        # Inverse transform the scaled centroids back to original metric units
        raw_centroids = self.scaler.inverse_transform(self.model.cluster_centers_)
        
        logger.info("\n--- Discovered Physiological States (Cluster Profiles) ---")
        for i, centroid in enumerate(raw_centroids):
            profile = ", ".join([f"{feat}: {val:.2f}" for feat, val in zip(self.features, centroid)])
            logger.info(f"State {i} Baseline -> {profile}")
        logger.info("----------------------------------------------------------")

    def visualize_clusters(self, df: pd.DataFrame, x_feature: str, y_feature: str, 
                           athlete_id: str = "Global", output_dir: str = "."):
        """
        Generates a scatter plot to visually prove the ML algorithm successfully 
        separated the physiological data into distinct behavior states.
        """
        if not self._is_fitted or 'behavior_cluster' not in df.columns:
            raise NotFittedError("Must run `discover_patterns` before visualizing.")
            
        if x_feature not in self.features or y_feature not in self.features:
            raise ValueError("Requested visualization features are not in the model.")

        plt.figure(figsize=(10, 7))
        
        # Use a distinct color palette for the clusters
        colors = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6']
        
        for cluster_id in range(self.n_clusters):
            cluster_data = df[df['behavior_cluster'] == cluster_id]
            plt.scatter(
                cluster_data[x_feature], 
                cluster_data[y_feature], 
                alpha=0.6, 
                color=colors[cluster_id % len(colors)], 
                label=f'Discovered State {cluster_id}',
                s=25,
                edgecolors='w',
                linewidths=0.5
            )

        title = f"Unsupervised Behavior Pattern Discovery\n(Athlete: {athlete_id})"
        plt.title(title, fontsize=14, fontweight='bold', pad=15)
        plt.xlabel(x_feature.replace('_', ' ').title(), fontsize=12)
        plt.ylabel(y_feature.replace('_', ' ').title(), fontsize=12)
        plt.legend(loc='best')
        plt.grid(True, linestyle='--', alpha=0.4)
        plt.tight_layout()
        
        os.makedirs(output_dir, exist_ok=True)
        plot_path = os.path.join(output_dir, f"behavior_clusters_{athlete_id}.png")
        
        try:
            plt.savefig(plot_path, dpi=300)
            logger.info(f"Saved cluster visualization to {plot_path}")
        except Exception as e:
            logger.error(f"Failed to save visualization: {str(e)}")
        finally:
            plt.close()

    def export_pipeline(self, athlete_id: str, output_dir: str = "."):
        """Serializes the scaler and K-Means model for production API use."""
        if not self._is_fitted:
            raise NotFittedError("Cannot export an untrained pipeline.")
            
        artifact = {
            'features': self.features,
            'scaler': self.scaler,
            'model': self.model,
            'n_clusters': self.n_clusters
        }
        
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.join(output_dir, f"behavior_analyzer_{athlete_id}.joblib")
        
        try:
            joblib.dump(artifact, filename)
            logger.info(f"Pipeline exported successfully to {filename}")
        except Exception as e:
            logger.error(f"Failed to export artifact: {str(e)}")
            raise


if __name__ == "__main__":
    # The metrics we want the unsupervised model to analyze together
    SENSORS = ['heart_rate_bpm', 'temperature_celsius', 'respiration_rate', 'motion_accel_g']
    ATHLETE = 'ATH_001' 
    DATA_PATH = 'synthetic_telemetry.csv'
    
    # We ask the model to discover 3 distinct states (e.g., Rest, Moderate, Peak)
    analyzer = PhysiologicalBehaviorAnalyzer(features=SENSORS, n_clusters=3)
    
    try:
        # 1. Safely load and validate data
        dataset = analyzer.load_and_validate_data(DATA_PATH, athlete_id=ATHLETE)
        
        # 2. Execute unsupervised pattern discovery
        clustered_data = analyzer.discover_patterns(dataset)
        
        # 3. Generate a 2D projection of the multidimensional clusters
        # We plot Heart Rate vs Motion as it provides the most intuitive visual proof
        analyzer.visualize_clusters(
            clustered_data, 
            x_feature='motion_accel_g', 
            y_feature='heart_rate_bpm', 
            athlete_id=ATHLETE
        )
        
        # 4. Export the artifact
        analyzer.export_pipeline(athlete_id=ATHLETE)
        
        logger.info("✅ Behavior Analysis Pipeline execution completed successfully.")
        
    except FileNotFoundError:
        logger.error("Execution halted: Please generate the synthetic dataset first.")
    except Exception as e:
        logger.error(f"Execution halted due to unexpected error: {str(e)}")