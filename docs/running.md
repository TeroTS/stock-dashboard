# Running The System

## Prerequisites
- Docker + Docker Compose plugin (recommended path), or:
- Node.js 22+, `pnpm`, Java 21, Maven 3.9+, and a Redis instance on `localhost:6379`

## Option A: Run with Docker Compose (Recommended)
From repository root:

```bash
docker compose up --build -d
```

Optional observability profile:

```bash
docker compose --profile observability up --build -d
```

Verify services:

```bash
docker compose ps
curl http://localhost:8080/actuator/health
```

Access points:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/actuator/health`
- Prometheus (optional): `http://localhost:9090`
- Grafana (optional): `http://localhost:3000`

Stop:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

## Option B: Run services directly
1. Start Redis (example with Docker):

```bash
docker run --rm -p 6379:6379 redis:7.2-alpine
```

2. Start backend:

```bash
cd backend
mvn spring-boot:run
```

3. Start frontend (new terminal):

```bash
cd frontend
pnpm install
pnpm dev
```

## Test Commands
Frontend (from `frontend/`):

```bash
pnpm test
pnpm lint
pnpm build
```

Backend (from `backend/`):

```bash
mvn test
mvn package
```

## Runtime Contract Quick Check
Use these checks after startup:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/prometheus | rg pipeline_
```

Expected stream/API surfaces:
- WebSocket endpoint: `ws://localhost:8080/ws/dashboard`
- Topic: `/topic/dashboard-snapshots`
- Transactions API: `POST /api/transactions`, `POST /api/transactions/{id}/close`, `GET /api/transactions`

## First-Run Troubleshooting
1. Frontend loads but shows fallback/no live updates
- Check backend health endpoint and backend logs.
- Validate websocket URL/topic defaults or `VITE_WS_URL` and `VITE_WS_TOPIC`.
- Verify session window values (`MARKET_SESSION_OPEN`, `MARKET_SESSION_CLOSE`) are appropriate for local testing.

2. Transaction actions fail from UI
- Confirm backend CORS/origin allowlist includes frontend origin.
- Check backend logs for transaction validation errors (session closed, missing live price, symbol already open).
- Verify `VITE_API_BASE_URL` points to the backend instance.

3. Backend starts but no persisted state
- Confirm Redis connectivity (`SPRING_DATA_REDIS_HOST`, `SPRING_DATA_REDIS_PORT`).
- Check for Redis retry/degraded signals in metrics (`pipeline_redis_degraded`).

4. Metrics endpoint unavailable
- `application-local.yaml` exposes `/actuator/prometheus`.
- `application-prod.yaml` hides it by default unless reconfigured.

## Related Runbooks
- Local testing flow: [docs/local-testing.md](./local-testing.md)
- Operational checks and recovery: [docs/operations.md](./operations.md)
- Production hardening checklist: [docs/production-hardening-checklist.md](./production-hardening-checklist.md)
