# Stock Dashboard

Real-time stock dashboard with:
- `frontend/`: React 19 + TypeScript + Vite UI
- `backend/`: Python 3.12+ + FastAPI backend with in-memory state

## Source of truth

Backend rewrite inputs:
- `DECISIONS.md`
- `SPEC.md`
- `openapi.yaml`
- `docs/contracts.md`

## Quick start

Run the app locally with Docker:

```bash
export MASSIVE_API_KEY='your-api-key'
./scripts/run-local
```

Edit `backend/watchlist.txt` to change the tracked symbols.

Set up a host development environment and verify changes:

```bash
./scripts/setup
./scripts/verify
```

## Local development prerequisites

- Node.js 22+
- `pnpm`
- Python 3.12+
- `uv`
- Docker

## Run locally

Start both services with Docker Compose:

```bash
export MASSIVE_API_KEY='your-api-key'
./scripts/run-local
```

Stop them with:

```bash
docker compose down --remove-orphans
```

App URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws`

## Verification commands

Frontend:

```bash
pnpm --dir frontend lint
pnpm --dir frontend exec tsc -b --pretty false
pnpm --dir frontend test
pnpm --dir frontend build
```

Backend:

```bash
uv run --no-project pytest backend/tests
uv run --no-project python -m compileall backend/stock_dashboard_backend
```

## Runtime contract

- WebSocket endpoint: `ws://localhost:8080/ws`
- Health endpoint: `GET /health`
- Transaction commands:
  - `POST /api/transactions`
  - `POST /api/transactions/{id}/close`

Frontend env vars:
- `VITE_WS_URL` (target default `ws://localhost:8080/ws`)
- `VITE_API_BASE_URL` (target default `http://localhost:8080`)

Backend env vars:
- `MASSIVE_API_KEY`

Backend watchlist config:
- `backend/watchlist.txt`
- One symbol per line
- Blank lines are ignored

## Backend environment

- Backend dependencies are locked in `backend/uv.lock`.
- `./scripts/setup` syncs them into the active Python interpreter with `uv`.
- You do not need to manually create a repo-local backend `.venv`.

## Contract-first inputs

Read these before backend implementation work:
- `DECISIONS.md`
- `SPEC.md`
- `openapi.yaml`
- `docs/contracts.md`
