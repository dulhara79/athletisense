# 🏃 AthletiSense: IoT Athletic Performance Dashboard

A real-time athletic performance monitoring dashboard built for IoT sensor data. Supports role-based access for athletes, head coaches, and physiotherapists.

![AthletiSense Dashboard](./docs/preview.png)

---

## 🏗️ Architecture

```
athletisense/
├── backend/                # Node.js + Express + WebSocket server
│   ├── data/
│   │   └── athlete_data.csv    # Your IoT sensor CSV data
│   ├── server.js               # Main server (REST + WebSocket)
│   └── package.json
│
└── frontend/               # React + Vite + Tailwind CSS
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx        # Navigation sidebar
    │   │   ├── MetricCard.jsx     # Reusable metric display
    │   │   ├── MotionGauge.jsx    # SVG gauge for motion intensity
    │   │   └── AlertsPanel.jsx    # Live alerts with thresholds
    │   ├── context/
    │   │   └── AuthContext.jsx    # Role-based auth (athlete/admin)
    │   ├── hooks/
    │   │   └── useAthleteData.js  # WebSocket + REST data fetching
    │   ├── pages/
    │   │   ├── LoginPage.jsx      # Authentication
    │   │   ├── MonitoringView.jsx # Live real-time charts
    │   │   ├── PerformanceView.jsx# Analytics & stats
    │   │   ├── RecoveryView.jsx   # Recovery score & recommendations
    │   │   └── AthletesOverview.jsx # Admin: all athletes at once
    │   └── App.jsx
    └── package.json
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Start the backend
```bash
cd backend
npm start
# Server runs on http://localhost:3001
# WebSocket on ws://localhost:3001
```

### 3. Start the frontend
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

---

## 📊 CSV Data Format

Place your CSV file at `backend/data/athlete_data.csv` with these columns:

| Column | Type | Description |
|--------|------|-------------|
| Timestamp | string | `YYYY-MM-DD HH:MM:SS` |
| Athlete_ID | string | e.g., `ATH_001` |
| BMI160_Acc_X/Y/Z | float | Accelerometer (m/s²) |
| BMI160_Gyro_X/Y/Z | float | Gyroscope (°/s) |
| Motion_Magnitude | float | Combined motion (g) |
| MAX30102_Heart_Rate_bpm | float | Heart rate |
| MAX30102_PPG_Signal | float | PPG raw signal |
| DS18B20_Skin_Temperature_C | float | Skin temperature |
| StrainGauge_Force_N | float | Strain gauge force (N) |
| Fatigue_Index | float | 0.0 – 1.0 |

---

## 👥 Role-Based Access

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Head Coach | coach@athletisense.io | coach123 | All athletes |
| Physiotherapist | physio@athletisense.io | physio123 | All athletes |
| Athlete (Marcus) | ath001@athletisense.io | ath001 | Own data only |
| Athlete (Sarah) | ath002@athletisense.io | ath002 | Own data only |
| Athlete (Diego) | ath003@athletisense.io | ath003 | Own data only |
| Athlete (Aisha) | ath004@athletisense.io | ath004 | Own data only |

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/athletes` | List all athletes + latest record |
| GET | `/api/athletes/:id` | Full history for one athlete |
| GET | `/api/athletes/:id/latest` | Latest reading |
| GET | `/api/summary` | Aggregated stats for all athletes |

---

## 🔌 WebSocket Events

Connect to `ws://localhost:3001`

| Event | Direction | Description |
|-------|-----------|-------------|
| `snapshot` | Server → Client | Initial full data on connect |
| `live_update` | Server → Client | New reading every 4 seconds |

---

## 🔥 Firebase Integration (Future)

When ready to switch from CSV to Firebase Realtime Database, replace the data layer in `backend/server.js`:

```javascript
// Install Firebase Admin SDK
// npm install firebase-admin

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.database();

// Replace CSV loading with:
const snapshot = await db.ref('athletes').once('value');
const data = snapshot.val();

// For real-time streaming, use Firebase listeners:
db.ref('athletes/ATH_001/readings').on('child_added', (snap) => {
  const newReading = snap.val();
  // broadcast to WebSocket clients
  wss.clients.forEach(client => {
    client.send(JSON.stringify({ type: 'live_update', data: [newReading] }));
  });
});
```

---

## 📱 Responsive Design

The dashboard is fully responsive:
- **Desktop**: Full sidebar + multi-column grid
- **Tablet**: Collapsible sidebar, 2-column grid
- **Mobile**: Hamburger menu, single column

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js + Express |
| Real-time | WebSocket (ws) |
| CSV Parsing | csv-parse |
| Database (future) | Firebase Realtime DB |
