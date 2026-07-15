# Agent Guide

## Project
This repository is rewriting the backend from Spring Boot + Redis + STOMP to a Python 3.12 + FastAPI service with in-memory state, plain WebSocket snapshots, and HTTP transaction commands.

Treat these as the target source of truth during the rewrite:
- `DECISIONS.md`
- `SPEC.md`
- `openapi.yaml`
- `docs/contracts.md`

Until the rewrite finishes, legacy Java/Maven files may still exist under `backend/`.

## Repo Layout
- `frontend/`: React 19 + TypeScript + Vite UI.
- `frontend/src/components/`: UI building blocks.
- `frontend/src/live/`: WebSocket client, DTO mapping, connection state, transaction API client.
- `frontend/src/observability/`: frontend telemetry helpers.
- `frontend/src/**/*.test.ts(x)`: frontend tests.
- `backend/`: backend rewrite area. New Python/FastAPI code stays here; legacy Java files may remain temporarily during migration.
- `backend/tests/`: target location for backend Python tests.
- `docs/`: repository docs. `docs/contracts.md` is current for non-HTTP contracts; some older runtime docs may still reflect the legacy backend until rewritten.
- `openspec/specs/realtime-stock-dashboard-feed/spec.md`: legacy accepted boundary spec; use `SPEC.md`, `openapi.yaml`, and `docs/contracts.md` for the rewrite.
- `frontend/dist/`, `backend/target/`, `__pycache__/`: generated outputs; never edit manually.

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

## Verification Contract
Run `./scripts/verify` before committing. It executes checks in a deterministic order:
1. format-check (currently explicit skip)
2. frontend lint
3. frontend typecheck
4. frontend tests + backend tests
5. frontend build + backend build check

During the rewrite, `./scripts/setup` and `./scripts/verify` auto-detect the backend stack:
- Python mode when `backend/pyproject.toml` or `backend/requirements*.txt` exists
- legacy Maven mode otherwise, if `backend/pom.xml` still exists

## Rules
- Prefer root scripts over ad hoc backend commands during the rewrite.
- Add new backend implementation code under `backend/` as Python, not new Java packages.
- Add backend Python tests under `backend/tests/`.
- Keep frontend changes in:
  - `frontend/src/components/` for UI
  - `frontend/src/live/` for feed/API integration
  - `frontend/src/types.ts` for shared UI models
- For HTTP changes, update `openapi.yaml` first.
- For WebSocket/event payload changes, update `docs/contracts.md`.
- Keep `README.md` and workflow-critical scripts aligned with the active backend stack.
- Do not manually edit generated output in `frontend/dist/` or `backend/target/`.

## Common Pitfalls
- Required tools for target state: Node.js 22+, Python 3.12+, Docker.
- Java 21/Maven are only needed while the legacy backend still exists.
- Frontend package manager is pinned in `frontend/package.json` (`packageManager`).
- Default local ports:
  - Frontend: `5173`
  - Backend: `8080`
- Rewrite env vars used most often:
  - `VITE_WS_URL`
  - `VITE_API_BASE_URL`
  - `FEED_MODE`
  - `MASSIVE_API_KEY`
- Massive SDK notes for the rewrite:
  - example client: /Users/terosuhonen/omat/massive-test/main.py
  - Use `massive.WebSocketClient` with `Market.Stocks`.
  - Subscribe per watchlist symbol with `A.<SYMBOL>`; do not use `A.*`.
  - Callback receives a list of websocket messages; for aggregates use `symbol`, `official_open_price`, `close`, and `end_timestamp`.
  - Never hardcode API keys in repo code.
