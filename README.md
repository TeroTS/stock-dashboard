# Stock Dashboard

Real-time stock dashboard with:
- `frontend/`: React 19 + TypeScript + Vite UI
- `backend/`: backend rewrite target is Python 3.12 + FastAPI with in-memory state

## Rewrite status

Accepted target contracts now describe the backend rewrite:
- `DECISIONS.md`
- `SPEC.md`
- `openapi.yaml`
- `docs/contracts.md`

Legacy Spring Boot files may still exist in `backend/` until the rewrite lands. Use the contract files above as the current source of truth for new work.

## Repository layout

- `frontend/` UI app and frontend tests (Vitest + React Testing Library)
- `backend/` backend rewrite area
- `docs/` contracts and supporting docs
- `openspec/` legacy spec-driven artifacts and archives

## Quick start

From repository root:

```bash
./scripts/setup
./scripts/verify
```

During the migration, these scripts auto-detect the backend stack:
- Python mode when `backend/pyproject.toml` or `backend/requirements*.txt` exists
- legacy Maven mode otherwise, if `backend/pom.xml` still exists

## Local development prerequisites

- Node.js 22+
- `pnpm`
- Python 3.12+ for the target backend
- Docker for local container workflows
- Java 21 only while the legacy backend is still present

## Frontend commands

```bash
pnpm --dir frontend lint
pnpm --dir frontend exec tsc -b --pretty false
pnpm --dir frontend test
pnpm --dir frontend build
```

## Runtime contract

Accepted target runtime surface:
- WebSocket endpoint: `ws://localhost:8080/ws`
- Health endpoint: `GET /health`
- Transaction commands:
  - `POST /api/transactions`
  - `POST /api/transactions/{id}/close`

Frontend env vars:
- `VITE_WS_URL` (target default `ws://localhost:8080/ws`)
- `VITE_API_BASE_URL` (target default `http://localhost:8080`)

Backend env vars:
- `FEED_MODE=mock|massive` (`mock` is the default target mode)
- `MASSIVE_API_KEY` (required only for `FEED_MODE=massive`)

## Contract-first rewrite inputs

Read these before backend implementation work:
- `DECISIONS.md`
- `SPEC.md`
- `openapi.yaml`
- `docs/contracts.md`

## Notes

- `README.md`, `AGENTS.md`, and root scripts now track the rewrite plan first.
- Some older docs under `docs/` may still describe the legacy backend until they are rewritten alongside implementation.
