# Stock Dashboard

Real-time stock dashboard with:
- `frontend/`: React 19 + TypeScript + Vite UI
- `backend/`: Python 3.12+ + FastAPI backend with in-memory state

## Source of Truth
Backend-facing contract and behavior inputs:
- `DECISIONS.md`
- `SPEC.md`
- `openapi.yaml`
- `docs/contracts.md`

## Quick Start
```bash
./scripts/setup
export MASSIVE_API_KEY='your-api-key'
./scripts/run-local
```

Stop the local stack:

```bash
docker compose down --remove-orphans
```

## Local URLs
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/health`
- WebSocket: `ws://localhost:8080/ws`

## Verification
```bash
./scripts/verify
```

## Runtime Contract
- Health: `GET /health`
- Open transaction: `POST /api/transactions`
- Close transaction: `POST /api/transactions/{transactionId}/close`
- Cancel pending open: `POST /api/transactions/{transactionId}/cancel-open`
- Snapshot stream: `ws://localhost:8080/ws`

## Configuration
Frontend local defaults:
- `VITE_WS_URL`
- `VITE_API_BASE_URL`

Backend inputs:
- `MASSIVE_API_KEY`
- `backend/watchlist.txt`

## Docs
- [docs/architecture.md](./docs/architecture.md)
- [docs/data-models.md](./docs/data-models.md)
- [docs/running.md](./docs/running.md)
- [docs/operations.md](./docs/operations.md)
- [docs/local-testing.md](./docs/local-testing.md)
- [docs/contracts.md](./docs/contracts.md)
