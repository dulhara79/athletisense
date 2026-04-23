---
title: Athletisense Backend
emoji: 🏃
colorFrom: blue
colorTo: indigo
sdk: docker
app_file: Dockerfile
pinned: false
---

# 🏃 AthletiSense Backend: Logic & Inference Engine

The **AthletiSense Backend** is the high-performance core of the ecosystem. It manages real-time telemetry streaming, executes complex physiological analytics, and coordinates multi-model machine learning inference to provide "Advanced Athlete Insights."

---

## 🏗️ Architecture

The backend is split into two primary services working in tandem:

### 1. Node.js Core (API & WebSocket)
The central orchestrator for data access, authentication, and real-time push.
- **REST API**: Standardized access to historical data, summaries, and AI chat.
- **WebSocket**: Low-latency push of `live_update` events to the dashboard.
- **AI Coach**: RAG-based conversational agent using OpenAI.

### 2. ML Inference Worker (Python)
A continuous-processing engine that runs live inference on incoming telemetry.
- **Anomaly Detection**: Uses an **Isolation Forest** to detect multi-sensor physiological deviations.
- **Behavior Analysis**: Uses **GMM/K-Means** to classify the athlete's current state (Resting, Active, Peak).
- **Temporal Forecasting**: Uses **Gradient Boosting** to predict heart rate trends based on historical lags.

---

## 📁 Directory Structure

```text
src/
├── server.js              # Entry point & Express configuration
├── config/                # Firebase Admin, Logger, and Athlete metadata
├── middleware/            # Auth (JWT), Sanitization, and Error Handling
├── routes/                # API Route definitions (Athletes, Chat, Analytics)
├── services/              # Business logic (Firebase Access, Analytics Engine, WebSockets)
└── models/                # AI/ML Component
    ├── ml_worker.py       # Python Continuous Inference Engine
    └── *.joblib           # Serialized ML Models (Alerter, Analyzer, Forecaster)
```

---

## 🧠 ML Inference Pipeline

The **ML Worker** (`ml_worker.py`) performs the following steps every 3 seconds:
1. **Poll**: Fetches the latest telemetry from the Firebase `latest` node.
2. **Pre-process**: Scales and engineers features (e.g., cyclical time, rolling means, lags).
3. **Inference**:
   - `anomaly_detector`: Outputs a severity score and boolean alert.
   - `behavior_analyzer`: Maps metrics to a cluster ID (e.g., "Active Load").
   - `temporal_forecaster`: Generates a `predicted_hr` for the next interval.
4. **Push**: Writes the `ml_insight` payload back to Firebase, triggering frontend updates.

---

## 📊 Analytics Engine (Node.js)

For non-ML historical analysis, the backend implements:
- **Trend Detection**: Linear regression slope calculation for all sensors.
- **Fatigue Scoring**: A weighted index combining HR recovery, Temperature spikes, and Respiratory load.
- **Training Load (TRIMP)**: Normalized physiological load calculation based on duration and intensity.
- **Correlation Matrix**: Pearson coefficients (e.g., HR ↔ Motion) to identify gait efficiency or stress responses.

---

## 📡 API Reference

### Data & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/athletes` | List athletes with real-time snapshots |
| GET | `/api/v1/athletes/:id/trend` | slope-based trend analysis per sensor |
| GET | `/api/v1/analytics/anomalies` | Global log of ML-detected anomalies |
| GET | `/api/v1/analytics/comparison` | Cross-athlete performance matrix |

### AI Coaching
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat` | Context-aware AI coach (Live data + RAG) |
| GET | `/api/v1/chat/suggestions` | dynamic question prompts based on status |

---

## 🚀 Quick Start

### 1. Environment Configuration
Create a `.env` file with the following:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/key.json
FIREBASE_DATABASE_URL=https://your-db.firebaseio.com
OPENAI_API_KEY=sk-....
```

### 2. Execution
```bash
# Install dependencies
npm install

# Start Node.js Core
npm start

# (In separate terminal) Start ML Worker
cd src/models
python ml_worker.py
```

---

## 🚢 Deployment (Hybrid Strategy)

The backend is containerized via **Docker** and deployed to **Hugging Face Spaces**.
- **CI/CD**: GitHub Actions sync the codebase and trigger a Docker build.
- **Port 3001**: Main API & WebSocket.
- **ML Worker**: Runs as a background process within the same container or as a sidecar.