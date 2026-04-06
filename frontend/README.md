# AthletiSense Frontend Dashboard

The frontend application for the **AthletiSense IoT Athletic Performance Monitoring Platform**.

## 🚀 Overview

This repository contains the React-based Performance Dashboard that visualises live telemetry data and historical trends for athletes. It interfaces directly with the Node.js Backend API and connects to Firebase for dynamic real-time data streaming and active athlete filtering.

## 🛠️ Tech Stack

- **React 18** and **Vite** for blazing fast compilation and modern UI development.
- **Tailwind CSS** for a highly customized, fully responsive, and beautiful design.
- **Recharts** to plot high-frequency ECG and multi-axis IMU data efficiently.
- **Lucide React** for crisp, consistent iconography.

## ✨ Features

- **Role-Based Access Control (RBAC):** Distinct dashboards for Coaches (aggregate insights) and Athletes (personal data only), secured tightly.
- **Dynamic Data Filtering:** Allows coaches to actively filter data by selecting from dynamically populated athletes from the Firebase instance.
- **Premium Dark Mode:** Adaptive background styling to give users a distraction-free, professional look while analyzing performance.
- **AI Chatbot Integration:** Embedded assistant that uses RAG via the backend to contextualize insights natively in the UI.

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- Backend running locally (or pointing `VITE_API_BASE_URL` to Hugging Face deployed backend).

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

Navigate to `http://localhost:5173` to see the application.

## 🚢 Deployment

The Frontend Dashboard is configured to deploy directly to **Vercel**, enabling edge delivery, seamless PR previews, and CI/CD out-of-the-box. Ensure you have the `VITE_API_BASE_URL` set locally in Vercel to point toward your deployed backend URL.
