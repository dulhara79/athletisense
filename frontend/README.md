# 🏃 AthletiSense Frontend: Performance Dashboard

The **AthletiSense Frontend** is a high-performance, real-time web application designed for elite athletic monitoring. Built with **React 18** and **Vite**, it provides a seamless, low-latency interface for visualizing complex physiological telemetry and interacting with AI-driven insights.

---

## 🏗️ Architecture Overview

The frontend follows a modern, component-driven architecture with a focus on real-time data synchronization and modularity.

### 1. State Management (Context API)
We utilize a multi-context strategy to manage global state without the overhead of Redux:
- **`AthleteDataProvider`**: The core data engine. It establishes persistent Firebase listeners for live telemetry and ML insights, distributing data to all dashboard components.
- **`NotificationContext`**: Manages real-time alerts and system notifications, including ML-detected anomalies.
- **`ThemeContext`**: Handles the premium dark-mode state and UI styling tokens.

### 2. Real-time Data Pipeline
The application uses a "Push-over-Pull" strategy:
1. **Firebase Listener**: A persistent listener is established for each active athlete.
2. **Context Sync**: As new data arrives (every 4-6 seconds), the `AthleteDataProvider` updates its internal state.
3. **Reactive Re-renders**: UI components (Charts, Vitals) reactively re-render to reflect the latest metrics with zero manual refreshing.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/) (optimized for high-frequency time-series data)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Communication**: [Firebase SDK](https://firebase.google.com/docs/web/setup) & [Axios](https://axios-http.com/)

---

## ✨ Key Features

### 📊 Real-time Physiological Charts
High-frequency rendering of ECG-derived Heart Rate, 6-axis IMU data, and Respiratory trends. Uses decimated data points for optimal performance on mobile devices.

### 🤖 AI Coaching Panel
A dedicated interface for interacting with the OpenAI-powered coach. It provides context-aware advice based on the athlete's live and historical data.

### 🔐 Role-Based Access Control (RBAC)
- **Coach View**: Aggregate team performance, cross-athlete comparisons, and team-wide anomaly detection.
- **Athlete View**: Personalized view focused on individual recovery, progress, and private AI feedback.

### 🌑 Premium Dark Mode
A meticulously designed dark interface reduces eye strain and provides a high-contrast environment for analyzing technical data.

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- A running instance of the AthletiSense Backend.

### Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/athletisense.git
cd athletisense/frontend

# Install dependencies
npm install

# Configure Environment
cp .env.example .env
# Set VITE_API_BASE_URL to your backend URL
```

### Development
```bash
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 📁 Directory Structure

```text
src/
├── components/        # Reusable UI components (Charts, VitalsCards, Sidebar)
├── context/           # Global State (AthleteData, Notifications, Auth)
├── hooks/             # Custom hooks for Firebase and API interactions
├── pages/             # Page-level components (Dashboard, Analytics, Chat)
├── utils/             # Data formatting and calculation helpers
└── firebase.js        # Firebase SDK initialization
```

---

## 🚢 Deployment

The dashboard is optimized for deployment on **Vercel**. It uses a CI/CD pipeline that automatically builds and deploys on every push to the `main` branch.

