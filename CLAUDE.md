# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

RailPulse is an Indian Railways live-tracking app: a FastAPI backend (`backend/`) and a statically exported Next.js frontend (`frontend/`). The README has the endpoint table and deployment steps.

## Commands

Backend, run from `backend/`. `.env` is resolved relative to the working directory, so running elsewhere silently drops `backend/.env`.

```bash
venv\Scripts\activate                                   # Windows; venv already exists at backend/venv
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000     # API docs at /docs

pytest tests/ -v                                        # full suite, about 1 minute
pytest tests/test_fare_engine.py -v                     # one file
pytest tests/test_train_schedule.py::test_12101_and_12102_days_of_run   # one test
```

Frontend, run from `frontend/`:

```bash
npm run dev                # http://localhost:3000
npm run build              # static export to frontend/out, and type-checks
npx tsc --noEmit           # the fastest correctness check
```

`npm run lint` is not usable: ESLint is not installed, and `next.config.ts` skips it during builds. There are no frontend tests.

Live audit scripts in `backend/tests/` are not collected by pytest. They are run directly (`python tests/verify_all_trains_internet.py`, `verify_all_states_trains_internet.py`, `e2e_live_production_test.py`) and hit the production backend at `railpulse-backend-fv1m.onrender.com`.

## Architecture

### Backend request flow

Routers → `services/orchestrator.py` → `providers/registry.py` → providers. `orchestrator.get_live_status` is the one source of truth for a train, used by REST, WebSockets and the assistant. Each read runs these steps:

1. **`journey_resolver.py`** picks the journey. A train number is not one train: yesterday's departure can still be running while today's has not started, so it asks the provider about both (`?date=`, which only covers yesterday to +7 days). It sets `service_state`: `RUNNING`, `NOT_STARTED`, `COMPLETED`, `NOT_RUNNING_TODAY`, `CANCELLED` or `UNKNOWN`. Each journey is cached separately.
2. **Timetable halts**, from the provider's schedule or `reference_lookup.py`, then `mark_progress` from the reported position.
3. **`position_service.py`** decides where to draw the train and labels how we know (`position_basis`, `position_label`). The provider sends station codes and no coordinates, so between stations a position is an estimate. Unknown stays `null`.
4. **`crowd_service.py`** overlays passenger GPS on position and speed only. State and delay stay with the provider.

Provider contract: returning `None` means "answered, no record". Raising `ProviderUnavailable` means "could not ask" (429, 5xx, timeout). Keep these distinct, because a rate limit must never read as "this train is not running". Only live status calls feed the circuit breaker, since `/schedule` and `/station` have stricter limits and must not block status.

- **Simulator:** local demos only. `settings.simulator_enabled` is always false when `ENVIRONMENT=production`. It never invents unknown trains, and only the demo PNR `1234567890` returns a booking.
- **Mounting:** `main.py` mounts routers under both `/api/v1` and `/v1`, and train routers under both `/trains` and `/train`.
- **Responses:** REST responses are wrapped in `ResponseEnvelope`; the frontend's `fetchJson` unwraps `.data`.

### Live updates

`services/websocket_hub.py` runs one broadcaster per watched train, forwarding pub/sub messages and re-reading status on a 5-second tick. Redis `get_message` returns `None` on timeout rather than raising, and the memory queue raises; both must count as a tick.

`CacheManager` uses Redis when `REDIS_URL` connects and otherwise an in-process cache and pub/sub, which only works with a single worker.

### Passenger GPS

Reports go through `crowd_service.ingest`: accuracy, near the route, near the reported position, plausible speed, and 2 consistent pings before a reporter counts. Fusion takes the median and drops outliers. Reports last 60 seconds and hold a random per-trip id; never log coordinates. The frontend hook is `lib/useLocationShare.ts`, held at page level so refreshes can't interrupt it, and it pings on a timer because phones stop reporting while a train is stationary.

**Testing warning:** `backend/.env` points at production Redis, and a test ping publishes to real viewers. Run locally with `REDIS_URL=` and a SQLite `DATABASE_URL`.

### Train data lives in several places

Provider responses win; bundled data is the fallback. Adding a train can touch `KNOWN_TRAINS` in `orchestrator.py` (every entry needs a profile, enforced by `test_all_32_known_trains_indexed`), `TRAIN_PROFILES` in `train_schedule_service.py`, `REFERENCE_TRAINS` in `providers/simulator.py` (real timetable data despite the file name), and `TRAIN_STATE_MAPPING` in `verify_all_states_trains_internet.py`. Station coordinates come from `app/data/stations.json`, a CC0 DataMeet snapshot.

### AI assistant

Status questions and bare train numbers skip the LLM (`ai/agent.py`, `ai/status_format.py`), so they can't be misworded. Everything else uses a LangGraph agent over `ai/tools.py` with xKiro's OpenAI-compatible API, with a system prompt built per request that includes the current IST time. Without `XKIRO_API_KEY` a limited deterministic handler answers. Responses include a structured `train` that drives the live card in `ChatDrawer`. The client's `model` field is deliberately ignored.

### Database

There are no migrations: `Base.metadata.create_all` runs at startup, so changes to existing columns need manual handling. The default is local SQLite. `db/session.py` rewrites Postgres URLs to `asyncpg`, strips query params, and forces `ssl=require`.

### Frontend

- **Static export:** `output: "export"` means no API routes, server actions, or dynamic path segments. Pages are client components that read parameters from the query string (`/train?number=...` style, via `useSearchParams`).
- **Backend access:** all calls go through `src/lib/api.ts` and `src/lib/ws.ts`, with types in `src/lib/types.ts`. Keep `types.ts` in step with `backend/app/schemas/`.
- **Environment:** `NEXT_PUBLIC_*` values are inlined at build time and default to `localhost:8000`.
- **Styling:** design tokens are CSS variables in `src/app/tokens.css`.

## Rules the code depends on

- **No fabricated data:** never invent positions, delays, trains, bookings or alerts. Label every position with its real basis, and leave unknown values `null`. `disruption_service.py` is empty on purpose until a verified feed exists.
- **Honest freshness:** the 5-second WebSocket tick is transport only. Displayed age comes from `observed_at`, not from when the packet arrived.
- **Privacy:** PNR results are never cached, and passenger telemetry must stay free of PII (no accounts, IPs, or device identifiers).

## Known gotchas

- **Provider limits:** Railway Engine allows about 60 requests a minute and its `/schedule` and `/station` endpoints can stay rate limited for long periods. RailRadar's free plan is 100 requests a month, and was exhausted when last checked.
- **Conflicting data:** provider records can freeze as `RUNNING`; `_is_frozen` handles this. Provider train names can be raw, such as "NDLS TEJAS RAJ", which is why `KNOWN_TRAINS` overrides them.
- **Tests never use the network:** `tests/conftest.py` blocks providers and the LLM. Scripts named `verify_*` and `e2e_*` do hit production.
- **Two Render blueprints:** `render.yaml` and `backend/render.yaml` differ in region, health check, and env vars, so check both when changing deployment config.
- **Outdated README detail:** it gives `.next` as the Cloudflare Pages output directory, but the static export writes to `frontend/out`.
