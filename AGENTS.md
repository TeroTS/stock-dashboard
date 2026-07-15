# Agent Guide

## Project
This repository contains a real-time stock dashboard with:
- `frontend/`: React 19 + TypeScript + Vite UI
- `backend/`: Python 3.12+ + FastAPI backend with in-memory state, plain WebSocket snapshots, and HTTP transaction commands

Current source of truth for backend-facing work:
- `DECISIONS.md`
- `SPEC.md`
- `openapi.yaml`
- `docs/contracts.md`

## Repo Layout
- `frontend/`: React app and frontend tests.
- `frontend/src/components/`: UI components.
- `frontend/src/live/`: WebSocket client, DTO mapping, connection state, transaction API client.
- `frontend/src/observability/`: frontend telemetry helpers.
- `frontend/src/**/*.test.ts(x)`: frontend tests.
- `backend/stock_dashboard_backend/`: backend FastAPI code.
- `backend/tests/`: backend pytest tests.
- `backend/uv.lock`: locked backend dependency graph for uv.
- `docs/`: docs and contracts.
- `frontend/dist/`, `backend/.pytest_cache/`, `backend/__pycache__/`, `backend/*.egg-info`, `backend/.venv/`: generated output; never edit manually.

## Golden Path
```bash
./scripts/setup
./scripts/verify
```

## Common Commands

### Install
```bash
./scripts/setup
```

### Verify
```bash
./scripts/verify
```

### Frontend
```bash
pnpm --dir frontend lint
pnpm --dir frontend exec tsc -b --pretty false
pnpm --dir frontend test
pnpm --dir frontend build
```

### Backend
```bash
uv run --no-project pytest backend/tests
uv run --no-project python -m compileall backend/stock_dashboard_backend
uv run --no-project uvicorn stock_dashboard_backend.app:app --reload --port 8080
```

## Verification Contract
Run `./scripts/verify` before committing. It executes checks in a deterministic order:
1. format-check (currently explicit skip)
2. frontend lint
3. frontend typecheck
4. frontend tests + backend tests with coverage
5. frontend build + backend compile check

## Rules
- Prefer root scripts over ad hoc commands.
- Add backend code under `backend/stock_dashboard_backend/`.
- Add backend tests under `backend/tests/`.
- Keep frontend changes in:
  - `frontend/src/components/` for UI
  - `frontend/src/live/` for feed/API integration
  - `frontend/src/types.ts` for shared UI models
- For HTTP changes, update `openapi.yaml` first.
- For WebSocket/event payload changes, update `docs/contracts.md`.
- Keep `README.md`, `AGENTS.md`, and root scripts aligned with the active backend.
- Do not manually edit generated output.

## Common Pitfalls
- Required tools: Node.js 22+, Python 3.12+, uv, Docker.
- Frontend package manager is pinned in `frontend/package.json` (`packageManager`).
- Backend dependencies are locked in `backend/uv.lock` and synced into the active Python interpreter; no manual repo-local `.venv` setup is required.
- Default local ports:
  - Frontend: `5173`
  - Backend: `8080`
- Rewrite env vars used most often:
  - `VITE_WS_URL`
  - `VITE_API_BASE_URL`
  - `FEED_MODE`
  - `MASSIVE_API_KEY`
- Massive SDK notes for the rewrite:
  - Use `massive.WebSocketClient` with `Market.Stocks`.
  - Subscribe per watchlist symbol with `A.<SYMBOL>`; do not use `A.*`.
  - Callback receives a list of websocket messages; for aggregates use `symbol`, `official_open_price`, `close`, and `end_timestamp`.
  - Never hardcode API keys in repo code.
