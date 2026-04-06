# AthletiSense Backend v2.0

Production-grade Node.js backend for the **AthletiSense IoT Athletic Performance Monitoring Platform**.

---

## Architecture

```
src/
├── server.js                      # Entry point, route wiring, graceful shutdown
├── config/
│   ├── firebase.js                # Firebase Admin SDK singleton
│   ├── logger.js                  # Winston (JSON prod / coloured dev)
│   └── athletes.js                # Static athlete metadata
├── middleware/
│   ├── index.js                   # requireFirebase, requestId, sanitiseInput, validateBody, errorHandler
│   └── auth.js                    # requireAuth, requireAdmin, optionalAuth (Firebase ID token)
├── routes/
│   ├── athleteRoutes.js           # CRUD data endpoints
│   ├── chatRoutes.js              # OpenAI conversational agent
│   ├── analyticsRoutes.js         # Visual analytics & decision-support
│   └── metricsRoutes.js           # /health + /api/v1/metrics
├── services/
│   ├── athleteService.js          # Firebase data access layer
│   ├── analyticsService.js        # Pure analytics functions (no Firebase)
│   └── websocketService.js        # Real-time push + heartbeat
└── __tests__/
    ├── athleteService.test.js
    └── analyticsService.test.js   # 20+ unit tests, no credentials needed
```

---

## API Reference

### Data Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Liveness probe |
| GET | `/api/v1/metrics` | Optional | System + Firebase metrics |
| GET | `/api/v1/athletes` | None | All athletes + latest snapshots |
| GET | `/api/v1/athletes/:id` | None | Full profile + stats |
| GET | `/api/v1/athletes/:id/latest` | None | Latest snapshot only |
| GET | `/api/v1/athletes/:id/history` | None | Archived readings (`?limit=N`) |
| GET | `/api/v1/summary` | None | Cross-athlete summary + alerts |

### Analytics Endpoints (all require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/athlete/:id/trend` | Trend, slope, anomaly, correlations, training load |
| GET | `/api/v1/analytics/athlete/:id/fatigue` | Fatigue/recovery score + status |
| GET | `/api/v1/analytics/athlete/:id/timeseries` | Hourly/daily bucketed series (`?granularity=hourly\|daily`) |
| GET | `/api/v1/analytics/athlete/:id/narrative` | Storytelling narrative for Visual Analytics page |
| GET | `/api/v1/analytics/comparison` | Cross-athlete comparison matrix |
| GET | `/api/v1/analytics/leaderboard` | Ranked by metric (`?metric=hr\|temp\|load\|fatigue\|steps&order=asc\|desc`) |
| GET | `/api/v1/analytics/anomalies` | All z-score anomalies across all athletes |
| GET | `/api/v1/analytics/performance-zones` | HR training zone distribution (Z1-Z5) |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat` | AI conversational agent (OpenAI) |
| GET | `/api/v1/chat/suggestions` | Starter question chips |

### WebSocket

Connect to `ws://localhost:3001`.  
Messages: `snapshot`, `live_update`, `error`, `pong`.

---

## Analytics Logic

| Feature | Implementation |
|---------|---------------|
| Trend detection | Linear regression slope over time series |
| Anomaly detection | Z-score (default threshold: 2.5σ) |
| Correlation | Pearson coefficient (HR↔Temp, HR↔Resp, HR↔Motion) |
| Fatigue score | Weighted: HR penalty (40%) + Temp penalty (30%) + Resp penalty (30%) |
| Training load | TRIMP-inspired: duration × normalised HR × motion factor |
| Performance zones | Karvonen 5-zone model (Z1 Recovery → Z5 Max) |
| Time bucketing | Hourly and daily aggregation with avg HR/Temp/Resp |
| Storytelling | `sessionNarrative()` → headline + insights + recommendation |

---

## Security

| Layer | Detail |
|-------|--------|
| Helmet | 11 HTTP security headers |
| CORS | Origin whitelist from `ALLOWED_ORIGINS` |
| Rate limiting | 120/min API, 60/min analytics, 30/min chat |
| Input sanitisation | Strips `<>`, `${}`, null bytes from all string inputs |
| Firebase Auth | `requireAuth` middleware verifies ID tokens on analytics routes |
| RBAC & AI Privacy | Strict data isolation preventing users from querying other athletes' biometric data via the Chatbot (`requireAdmin` / ownership verification) |
| Request tracing | `X-Request-Id` on every response |
| Graceful shutdown | SIGTERM/SIGINT with 10s forced-exit fallback |
| Non-root Docker | Runs as `appuser` |

---

## Quick Start

```bash
cp .env.example .env
# Fill FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_DATABASE_URL, OPENAI_API_KEY
# For local dev without Firebase: set DISABLE_AUTH=true

npm install
npm run dev       # development (nodemon)
npm start         # production
npm test          # unit tests (no credentials needed)
```

---

## Docker & Deployment

```bash
docker compose up --build
curl http://localhost:3001/health
```

### Hugging Face Deployment Automation
This backend is continuously deployed to **Hugging Face Spaces**. We use a GitHub Actions CI/CD pipeline (`.github/workflows/huggingface-deploy.yml`) that:
1. Syncs the backend directory to Hugging Face on push.
2. Triggers an automated Docker build via the Space's configuration (`Dockerfile`).
3. Ensures all environments variables and secrets (like OpenAI and Firebase keys) are securely mapped.

---

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `PORT` | No | `3001` |
| `NODE_ENV` | No | `development` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | **Yes** | — |
| `FIREBASE_DATABASE_URL` | **Yes** | — |
| `OPENAI_API_KEY` | No* | — |
| `ALLOWED_ORIGINS` | No | *(all)* |
| `DISABLE_AUTH` | No | `false` |
| `CHAT_RATE_LIMIT_RPM` | No | `30` |
| `ANALYTICS_RATE_LIMIT_RPM` | No | `60` |
| `API_RATE_LIMIT_RPM` | No | `120` |
| `LOG_LEVEL` | No | `info` |

\* Chat returns 503 without this key; all other endpoints still work.

---

## Assignment Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| 10+ variables | HR, BPM avg, ECG, Temp (C/F), Accel X/Y/Z, Gyro X/Y/Z, Step count, Resp rate, Strain, RSSI, Heap free |
| Multi-dimensional analysis | `athleteTrend()` covers HR, Temp, Resp, Motion simultaneously |
| Comparisons | `buildComparison()` → `/analytics/comparison` |
| Trends | `linearSlope()` per metric → rising/falling/stable |
| Visual storytelling | `sessionNarrative()` → headline, insights, alerts, recommendation |
| Conversational agent | OpenAI chat with live Firebase data context |
| Decision support | Fatigue score, recovery recommendation, anomaly flags, leaderboard |
| Interactive features | WebSocket live updates, filter by `?limit`, `?granularity`, `?metric` |
| UX / dashboard support | Narrative endpoint feeds storytelling section directly |
| Security | Auth, CORS, helmet, sanitisation, rate limiting |
| Scalability | Modular service layer, Docker, graceful shutdown |