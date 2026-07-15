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

From repository root:

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

Backend:

```bash
uv run --no-project uvicorn stock_dashboard_backend.app:app --reload --port 8080
```

Frontend:

```bash
pnpm --dir frontend dev
```

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
- `FEED_MODE=mock|massive`
- `MASSIVE_API_KEY` for `FEED_MODE=massive`

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
