# RailPulse — AI-Powered Indian Railway Tracking SaaS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Pages](https://img.shields.io/badge/Frontend-Cloudflare_Pages_Live-green?logo=cloudflare)](https://railpulse-01i.pages.dev)
[![Render Backend](https://img.shields.io/badge/Backend-Render_Live-46E3B7?logo=render)](https://railpulse-backend-fv1m.onrender.com)
[![Neon Postgres](https://img.shields.io/badge/Database-Neon_Postgres_18-00E599?logo=postgresql)](https://neon.tech)
[![Upstash Redis](https://img.shields.io/badge/Cache-Upstash_Redis_TLS-FF4F8B?logo=redis)](https://upstash.com)

> **Live Production App**: [https://railpulse-01i.pages.dev](https://railpulse-01i.pages.dev)  
> **Backend API & Swagger Docs**: [https://railpulse-backend-fv1m.onrender.com/docs](https://railpulse-backend-fv1m.onrender.com/docs)

A production-oriented Indian Railway tracking platform built with **Next.js 15+**, **FastAPI**, **PostgreSQL (Neon)**, **Redis (Upstash)**, **MapLibre GL + OpenStreetMap**, **WebSockets**, and a grounded **LangGraph AI travel assistant** powered by the **xKiro API**.

---

## 1. System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │    Frontend: Next.js 15+ (App Router)        │
                    │    - MapLibre GL + OpenStreetMap Free Tiles  │
                    │    - WebSocket Live Telemetry Age Counter    │
                    │    - Coach Rake Visualizer (Loco to SLR)     │
                    │    - LangGraph AI Travel Assistant Drawer    │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTPS REST / WebSockets
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         Backend Gateway: FastAPI             │
                    │    - WebSocket Hub (/ws/live-tracking)       │
                    │    - Capability-Aware Provider Registry      │
                    │    - Circuit Breakers (Closed/Open/Half-Open)│
                    │    - Telescopic Distance Fare Engine         │
                    └───────┬──────────────┬──────────────┬────────┘
                            │              │              │
             ┌──────────────┴─┐     ┌──────┴──────┐ ┌─────┴──────────┐
             ▼                ▼     ▼             ▼ ▼                ▼
     ┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ ┌─────────────┐
     │Railway Engine│ │RailRadar │ │NTES Stub   │ │Postgres│ │Redis Pub/Sub│
     │(60 req/min)  │ │(Developer│ │(CRIS Ref)  │ │(Async) │ │+ Memory TTL │
     └──────────────┘ └──────────┘ └────────────┘ └────────┘ └─────────────┘
```

---

## 2. Core Technical Standards

1. **Zero-Fake Telemetry Guarantee**:
   - The data provider reports stations, not coordinates. Between stations the position is an estimate and is labelled as one, and passenger GPS replaces it when available. Unknown positions remain `null`.
   - Location types are strictly categorized: `GPS_OBSERVED`, `STATION_OBSERVED`, `PROVIDER_ESTIMATED`, `APPLICATION_ESTIMATED`, `SIMULATED`.
   - The offline simulator is for local demos and never runs in production.
2. **Honest WebSocket Freshness**:
   - Upstream data ingestion is decoupled from the 5-second WebSocket transport heartbeat.
   - The UI shows the exact observation timestamp in Indian Standard Time (IST) and a real-time counter of elapsed seconds since the physical event occurred.
3. **Capability-Aware Fallback & Circuit Breakers**:
   - Primary: **Railway Engine** (60 req/min). Yesterday's and today's journeys are both checked, because a train that started yesterday can still be running.
   - Secondary: **RailRadar** (Developer API).
   - Reference: **NTES** (Official reference stub without brittle unauthorized scraping).
   - Each provider has a circuit breaker with failure thresholds, recovery timeouts, and exponential backoff.
4. **Telescopic Distance Fare Calculation**:
   - Computes official Railway Board distance tariffs (Base Fare, Reservation Fee, Superfast Surcharge, GST, Tatkal caps) across 1A, 2A, 3A, 3E, CC, SL, 2S.
5. **Grounded LangGraph AI Assistant with xKiro API**:
   - Integrated with `https://api.xkiro.com/v1` via OpenAI/Anthropic format.
   - Uses verified railway tools for train location, delays, ETAs, fares, and coach compositions.
   - Natural query example:
     > *"Where is train 12101 currently? How late is it, and when will it reach Pune?"*

---

## 3. API Endpoints Directory

| Feature | Method | Path | Description |
| :--- | :--- | :--- | :--- |
| **Live Status** | `GET` | `/api/v1/trains/{train_number}/status` | Real-time delay, current/next station, speed, GPS lat/lng, halts |
| **Schedule** | `GET` | `/api/v1/trains/{train_number}/schedule` | Official timetable, halts list, days of run |
| **Route** | `GET` | `/api/v1/trains/{train_number}/route` | GeoJSON route geometry coordinates for MapLibre |
| **Train Search** | `GET` | `/api/v1/trains/search?q={query}` | Search trains by partial name or 5-digit number |
| **Station Search** | `GET` | `/api/v1/stations/search?q={query}` | Search stations by city name or code |
| **Station Details** | `GET` | `/api/v1/stations/{station_code}` | Station coordinates, state, zone, division |
| **Station Live Board** | `GET` | `/api/v1/stations/{code}/live?hours=4` | Arrivals and departures within 2, 4, or 8 hours |
| **Coach Composition** | `GET` | `/api/v1/trains/{number}/coaches` | Physical rake sequence (Locomotive to SLR) |
| **Platform Numbers** | `GET` | `/api/v1/trains/{number}/platforms` | Platform numbers across all scheduled halts |
| **Fare Enquiry** | `GET` | `/api/v1/trains/{number}/fare` | Telescopic fare breakdown across all classes & quotas |
| **PNR Status** | `GET` | `/api/v1/pnr/{pnr}` | 10-digit PNR enquiry with privacy guarantee |
| **AI Assistant** | `POST`| `/api/v1/ai/chat` | Conversational LangGraph AI travel assistant |
| **Live WebSockets** | `WS` | `/ws/live-tracking/{train_number}` | Real-time telemetry broadcast with heartbeat |
| **Provider Health** | `GET` | `/providers/status` | Live circuit breaker states, latencies, failure counts |

---

## 4. Local Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- (Optional) Docker & Docker Compose

### 1. Launch Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Backend API will be available at: `http://localhost:8000`  
Interactive OpenAPI Documentation at: `http://localhost:8000/docs`

### 2. Run Backend Tests
```bash
cd backend
pytest tests/ -v
```

### 3. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend UI will be live at: `http://localhost:3000`

---

## 5. Docker Deployment

To launch the complete stack (PostgreSQL + Redis + FastAPI Backend) using Docker Compose:
```bash
cd backend
docker-compose up --build -d
```

---

## 6. Cloud Deployment

### Frontend $\rightarrow$ Cloudflare Pages
1. Push this repository to GitHub: `https://github.com/Aniketchavan7/Railway-App`
2. Connect your GitHub repository to **Cloudflare Pages**.
3. Set build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next` (or `out` if using static export)
   - **Environment variables**:
     - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://railpulse-backend.onrender.com/api/v1`)
     - `NEXT_PUBLIC_WS_URL`: Your deployed WebSocket URL (e.g. `wss://railpulse-backend.onrender.com/ws/live-tracking`)

### Backend $\rightarrow$ Render / Railway / Koyeb
1. Deploy `backend/` using the included `render.yaml` or `Dockerfile`.
2. Configure environment variables in the Render/Railway dashboard:
   - `DATABASE_URL`: Managed PostgreSQL connection string (or leave default for local SQLite).
   - `REDIS_URL`: Managed Redis URL (e.g. Upstash Redis).
   - `RAILWAY_ENGINE_API_KEY`: Your key from `railengine.vercel.app`.
   - `RAILRADAR_API_KEY`: Your key from `railradar.in`.
   - `XKIRO_API_KEY`: Your xKiro key from `api.xkiro.com`.
   - `XKIRO_BASE_URL`: `https://api.xkiro.com/v1`.
   - `XKIRO_MODEL`: Your model ID (e.g. `google/gemini-2.5-flash`).

---

## 7. Data Sources

Station coordinates in `backend/app/data/stations.json` are derived from [DataMeet's Indian Railways data](https://github.com/datameet/railways) (CC0).

---

## 8. License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
