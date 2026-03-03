# Agent Guide

## Project
This repository contains a real-time stock dashboard with a React + TypeScript frontend and a Spring Boot backend. The backend ingests ticks, maintains session state in Redis, and publishes dashboard snapshots over WebSocket/STOMP. The frontend renders live stock/transaction cards and sends transaction open/close commands through HTTP.

## Repo Layout
- `frontend/`: React 19 + TypeScript + Vite UI.
- `frontend/src/components/`: UI building blocks (`StockDashboard`, `StockCard`, `TransactionCard`, `CandlestickChart`).
- `frontend/src/live/`: Realtime feed client, DTO mapping, connection state, transaction API client.
- `frontend/src/observability/`: frontend telemetry helpers.
- `frontend/src/**/*.test.ts(x)`: frontend tests (Vitest + RTL).
- `backend/`: Spring Boot 3.5 (Java 21) realtime service.
- `backend/src/main/java/com/stockdashboard/backend/`: backend feature packages (`pipeline`, `snapshot`, `transaction`, `state`, `session`, `ws`, `health`, `config`).
- `backend/src/test/java/com/stockdashboard/backend/`: backend unit/integration tests.
- `docs/`: architecture, data model, running, operations, and D2 diagrams.
- `openspec/specs/realtime-stock-dashboard-feed/spec.md`: accepted boundary behavior spec.
- `frontend/dist/`, `backend/target/`: generated build outputs; never edit manually.

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

### Build
```bash
pnpm --dir frontend build
./backend/mvnw -f backend/pom.xml -B -DskipTests package
```

### Test
```bash
pnpm --dir frontend test
./backend/mvnw -f backend/pom.xml -B test
```

### Lint
```bash
pnpm --dir frontend lint
```

### Format / Format-Check
There is currently no dedicated formatter task configured in this repo.
`./scripts/verify` runs a format-check phase and explicitly reports that it is skipped.

### Typecheck
```bash
pnpm --dir frontend exec tsc -b --pretty false
```

## Verification Contract
Run `./scripts/verify` before committing. It executes checks in a deterministic order:
1. format-check (currently explicit skip)
2. lint
3. typecheck
4. tests
5. build

If CI is added or updated, it should call `./scripts/verify` so local and CI validation stay aligned.
GitHub Actions already enforces this via `.github/workflows/verify.yml`.

## Single-Test Commands

### Frontend: one test file
```bash
pnpm --dir frontend vitest run src/live/useDashboardFeed.test.tsx
```

### Backend: one test class
```bash
./backend/mvnw -f backend/pom.xml -B -Dtest=TransactionServiceTest test
```

### Backend: one test case
```bash
./backend/mvnw -f backend/pom.xml -B -Dtest=TransactionServiceTest#opensLongTransactionAtLatestPriceAndPersistsIt test
```

## Rules
- Where to add frontend features:
  - UI components in `frontend/src/components/`.
  - Feed/api integration in `frontend/src/live/`.
  - Shared UI models in `frontend/src/types.ts`.
- Where to add backend features:
  - HTTP endpoints in package `backend/.../transaction` (or relevant feature package) with controller + service + tests.
  - WebSocket snapshot behavior in `backend/.../snapshot`.
  - Session/state behavior in `backend/.../session` and `backend/.../state`.
- Where to add tests:
  - Frontend tests colocated under `frontend/src/**`.
  - Backend tests under `backend/src/test/java/com/stockdashboard/backend/**`.
- API/spec contract policy:
  - Update `openspec/specs/realtime-stock-dashboard-feed/spec.md` for boundary behavior changes.
  - Update `docs/architecture.md` and `docs/data-models.md` when API/event/persistence contracts change.
- Generated code/output policy:
  - Do not manually edit generated output in `frontend/dist/` or `backend/target/`.
  - If generated artifacts are needed, regenerate via documented build commands.

## Common Pitfalls
- Required tools: Node.js 22 (see `.nvmrc`), Java 21, Docker.
- Tooling pinning:
  - Frontend package manager is pinned in `frontend/package.json` (`packageManager`).
  - Backend Maven runtime is pinned in `backend/.mvn/wrapper/maven-wrapper.properties`.
- `./scripts/setup` will auto-use `corepack` when `pnpm` is missing but Node provides corepack.
- Redis dependency:
  - Backend expects Redis (`SPRING_DATA_REDIS_HOST`, `SPRING_DATA_REDIS_PORT`).
  - Docker Compose sets this automatically.
- Backend integration tests use Testcontainers and require Docker daemon access.
- Default local ports:
  - Frontend: `5173`
  - Backend: `8080`
  - Redis: `6379`
  - Prometheus (optional): `9090`
  - Grafana (optional): `3000`
- Feed/API env vars used most often:
  - `VITE_WS_URL`, `VITE_WS_TOPIC`, `VITE_API_BASE_URL`
  - `MARKET_SESSION_OPEN`, `MARKET_SESSION_CLOSE`
  - `APP_SECURITY_ALLOWED_ORIGINS`
