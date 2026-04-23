"""
AthletiSense ML Pipeline: Non-Linear Sensor Correlation
-------------------------------------------------------
This module replaces simple linear Pearson correlation with a tree-based 
Machine Learning approach (Random Forest Regressor) to discover complex, 
non-linear physiological relationships and extract feature importance.

Production enhancements include:
- Defensive data validation and exception handling
- Scikit-learn RandomForest for multi-variable interaction learning
- Automated visualization generation for academic reporting

Author: AthletiSense Core Engineering
"""

import os
import logging
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from sklearn.exceptions import NotFittedError

# Configure Production-Grade Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("CorrelationAnalyzer")


class PhysiologicalCorrelationAnalyzer:
    def __init__(self, target_sensor: str, feature_sensors: List[str]):
        """
        Initializes the tree-based correlation analyzer.
        
        Args:
            target_sensor (str): The metric we want to predict (e.g., Heart Rate).
            feature_sensors (List[str]): The metrics used to predict the target.
        """
        if not target_sensor or not feature_sensors:
            raise ValueError("Target and features must be explicitly defined.")
            
        self.target = target_sensor
        self.features = feature_sensors
        
        # Random Forest is ideal for feature importance and handles non-linear data natively
        self.model = RandomForestRegressor(
            n_estimators=150, 
            max_depth=10, 
            random_state=42, 
            n_jobs=-1  # Utilize all CPU cores for production speed
        )
        
        self.feature_importances_: Optional[Dict[str, float]] = None
        self._is_fitted: bool = False

    def load_and_validate_data(self, filepath: str, athlete_id: Optional[str] = None) -> pd.DataFrame:
        """
        Safely loads telemetry and drops missing values to prevent algorithm failure.
        """
        logger.info(f"Loading dataset from {filepath}...")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Missing dataset at {filepath}")
            
        df = pd.read_csv(filepath)
        
        # Verify required columns exist
        required_cols = self.features + [self.target]
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise KeyError(f"Dataset is missing required columns: {missing_cols}")
            
        if athlete_id:
            logger.info(f"Filtering dataset for specific athlete: {athlete_id}")
            df = df[df['athlete_id'] == athlete_id]
            
        clean_df = df.dropna(subset=required_cols).reset_index(drop=True)
        
        if clean_df.empty:
            raise ValueError("Dataset is empty after dropping missing values.")
            
        logger.info(f"Dataset validated. Rows available for training: {len(clean_df)}")
        return clean_df

    def train_and_extract_importance(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Trains the Random Forest model and extracts the learned relationships
        (Feature Importances) showing which sensors drive the target sensor the most.
        """
        logger.info(f"Training Random Forest to predict {self.target}...")
        
        X = df[self.features]
        y = df[self.target]
        
        # Split data chronologically to validate that the model actually learned real relationships
        # without suffering from time-series data leakage.
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        try:
            self.model.fit(X_train, y_train)
            self._is_fitted = True
            
            # Check model accuracy (R^2 Score)
            predictions = self.model.predict(X_test)
            r2 = r2_score(y_test, predictions)
            logger.info(f"Model R^2 Score (Predictive Power): {r2:.3f}")
            
            if r2 < 0.3:
                logger.warning("Low R^2 score. The features weakly predict the target.")
            
            # Extract and map feature importances
            importances = self.model.feature_importances_
            self.feature_importances_ = {
                feat: round(float(imp), 4) for feat, imp in zip(self.features, importances)
            }
            
            # Sort by highest importance
            self.feature_importances_ = dict(
                sorted(self.feature_importances_.items(), key=lambda item: item[1], reverse=True)
            )
            
            logger.info("Learned Feature Importances:")
            for feature, importance in self.feature_importances_.items():
                logger.info(f" -> {feature}: {importance * 100:.1f}% influence")
                
            return self.feature_importances_
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            self._is_fitted = False
            raise

    def visualize_relationships(self, athlete_id: str, output_dir: str = "."):
        """
        Generates a clean, academic bar chart for the final thesis/assignment report.
        """
        if not self._is_fitted or not self.feature_importances_:
            raise NotFittedError("Must train the model before generating visualizations.")
            
        features = list(self.feature_importances_.keys())
        importances = [val * 100 for val in self.feature_importances_.values()] # Convert to %
        
        plt.figure(figsize=(9, 6))
        
        # Create a professional, light-themed visualization
        bars = plt.barh(features, importances, color='#3B82F6', edgecolor='black', alpha=0.8)
        plt.gca().invert_yaxis()  # Highest importance at the top
        
        # Add data labels to the bars
        for bar in bars:
            width = bar.get_width()
            plt.text(width + 1, bar.get_y() + bar.get_height()/2, 
                     f'{width:.1f}%', va='center', fontsize=10, fontweight='bold')
        
        title = f"Sensor Influence on {self.target.replace('_', ' ').title()}\n(Athlete: {athlete_id})"
        plt.title(title, fontsize=14, fontweight='bold', pad=15)
        plt.xlabel("Relative Importance (%)", fontsize=12)
        plt.grid(axis='x', linestyle='--', alpha=0.7)
        plt.tight_layout()
        
        os.makedirs(output_dir, exist_ok=True)
        plot_path = os.path.join(output_dir, f"feature_importance_{athlete_id}.png")
        
        try:
            plt.savefig(plot_path, dpi=300)
            logger.info(f"Saved feature importance chart to {plot_path}")
        except Exception as e:
            logger.error(f"Failed to save visualization: {str(e)}")
        finally:
            plt.close()

    def export_artifact(self, athlete_id: str, output_dir: str = "."):
        """Serializes the trained forest for potential backend integration."""
        if not self._is_fitted:
            raise NotFittedError("Cannot export an untrained model.")
            
        artifact = {
            'target': self.target,
            'features': self.features,
            'importances': self.feature_importances_,
            'model': self.model
        }
        
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.join(output_dir, f"correlation_model_{athlete_id}.joblib")
        
        try:
            joblib.dump(artifact, filename)
            logger.info(f"Model artifact exported successfully to {filename}")
        except Exception as e:
            logger.error(f"Failed to export artifact: {str(e)}")
            raise


if __name__ == "__main__":
    # We want to understand what drives Heart Rate changes
    TARGET = 'heart_rate_bpm'
    FEATURES = ['temperature_celsius', 'respiration_rate', 'motion_accel_g']
    ATHLETE = 'ATH_001' # E.g., analyzing Dewdu's specific physiological patterns
    DATA_PATH = 'synthetic_telemetry.csv'
    
    analyzer = PhysiologicalCorrelationAnalyzer(target_sensor=TARGET, feature_sensors=FEATURES)
    
    try:
        # 1. Safely load and validate
        dataset = analyzer.load_and_validate_data(DATA_PATH, athlete_id=ATHLETE)
        
        # 2. Train the Random Forest and extract learned relationships
        importances = analyzer.train_and_extract_importance(dataset)
        
        # 3. Generate visualization for the report
        analyzer.visualize_relationships(athlete_id=ATHLETE)
        
        # 4. Export the trained model
        analyzer.export_artifact(athlete_id=ATHLETE)
        
        logger.info("✅ Correlation Pipeline execution completed successfully.")
        
    except FileNotFoundError:
        logger.error("Execution halted: Please generate the synthetic dataset first.")
    except Exception as e:
        logger.error(f"Execution halted due to unexpected error: {str(e)}")