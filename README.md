# Stock Dashboard

Real-time stock dashboard with:
- `frontend/`: React 19 + TypeScript + Vite UI
- `backend/`: Spring Boot 3.5 (Java 21) realtime feed service
- `redis`: session/state storage for backend runtime

The backend publishes dashboard snapshots over WebSocket/STOMP, and the frontend renders live stock cards from that stream.

## Repository layout

- `frontend/` UI app and frontend tests (Vitest + React Testing Library)
- `backend/` realtime pipeline, WebSocket publishing, health endpoints, backend tests (JUnit + Testcontainers)
- `infra/` infrastructure scaffolding
- `openspec/` spec-driven artifacts (active specs and archived changes)
- `docs/local-testing.md` local Docker Compose E2E workflow

## Quick start (Docker Compose, recommended)

From repository root:

```bash
docker compose up --build -d
```

Check status:

```bash
docker compose ps
curl http://localhost:8080/actuator/health
```

Open app:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/actuator/health`

Stop:

```bash
docker compose down
```

Full cleanup:

```bash
docker compose down -v
```

Detailed E2E steps: see `docs/local-testing.md`.
Operational checks and metrics catalog: see `docs/operations.md`.

## Local development (without Compose)

Prerequisites:
- Node.js 22+
- `pnpm`
- Java 21
- Maven 3.9+
- Redis on `localhost:6379`

Run backend (from `backend/`):

```bash
mvn spring-boot:run
```

Run frontend (from `frontend/`):

```bash
pnpm install
pnpm dev
```

## Test and quality commands

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

## Runtime contract

- WebSocket endpoint: `ws://localhost:8080/ws/dashboard`
- STOMP topic: `/topic/dashboard-snapshots`
- Health endpoint: `GET /actuator/health`

Frontend feed config (optional):
- `VITE_WS_URL` (default `ws://localhost:8080/ws/dashboard`)
- `VITE_WS_TOPIC` (default `/topic/dashboard-snapshots`)

Backend Redis/session config (optional via env):
- `SPRING_DATA_REDIS_HOST` (default `localhost`)
- `SPRING_DATA_REDIS_PORT` (default `6379`)
- `MARKET_SESSION_OPEN` (example `09:30`)
- `MARKET_SESSION_CLOSE` (example `16:00`)

## Spec-driven development

Canonical accepted spec:
- `openspec/specs/realtime-stock-dashboard-feed/spec.md`

Archived changes:
- `openspec/changes/archive/`
