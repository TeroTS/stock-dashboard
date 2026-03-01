# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` contains the React 19 + TypeScript + Vite dashboard UI.
- `frontend/src/components/` holds UI modules (`StockDashboard`, `StockCard`, `CandlestickChart`).
- `frontend/src/data/dashboardData.ts` stores static dashboard seed data (fallback/demo data).
- `frontend/src/types.ts` contains shared frontend TypeScript models/interfaces.
- `frontend/dist/` is generated build output; do not edit it manually.
- `backend/` contains the Spring Boot 3.5 (Java 21) real-time feed service.
- `backend/src/main/java/com/stockdashboard/backend/` is organized by feature packages (`config`, `domain`, `pipeline`, `ranking`, `session`, `snapshot`, `state`, `ws`, `health`).
- `backend/src/test/java/com/stockdashboard/backend/` includes unit and integration tests (Redis Testcontainers + WebSocket contract tests).
- `infra/` is reserved for infrastructure artifacts.
- `openspec/specs/realtime-stock-dashboard-feed/spec.md` is the canonical accepted spec for the realtime backend capability.
- `openspec/changes/archive/` stores archived change proposals.

## Build, Test, and Development Commands
Frontend commands (run from `frontend/`):

```bash
pnpm install     # install dependencies
pnpm dev         # start Vite dev server with HMR
pnpm lint        # run ESLint on TS/TSX files
pnpm build       # type-check (tsc -b) and build production bundle
pnpm preview     # serve the built app locally
```

Backend commands (run from `backend/`):

```bash
mvn spring-boot:run  # run backend locally
mvn test             # run unit + integration tests
mvn package          # compile, test, and package jar
```

## Coding Style & Naming Conventions
- Use TypeScript with strict compiler settings (`frontend/tsconfig.app.json`) for frontend changes.
- Follow ESLint rules in `frontend/eslint.config.js` before opening PRs.
- Backend uses Java 21 with Spring Boot conventions; keep package boundaries feature-oriented.
- Follow existing formatting in each module (frontend semicolon-free TS style, backend existing Java style).
- Components, interfaces, and type aliases use `PascalCase` (`StockCardModel`).
- Variables/functions use `camelCase`; constants use `UPPER_SNAKE_CASE`.
- CSS class names use descriptive `kebab-case` (for example, `trade-button-buy`).

## Testing Guidelines
- Backend tests are configured with JUnit 5, Spring Boot Test, Testcontainers, and Awaitility.
- Backend integration tests require Docker (for Redis Testcontainers).
- For backend behavior changes, add or update tests under `backend/src/test/java/...`.
- Frontend has no test runner configured yet; for new frontend behavior, add Vitest + React Testing Library tests when introducing that setup.
- Minimum local verification:
  - Frontend-only changes: `pnpm lint` and `pnpm build` (from `frontend/`)
  - Backend-only changes: `mvn test` (from `backend/`)
  - Cross-stack changes: run both frontend and backend checks

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) for consistency.
- Keep commits focused to one logical change.
- PRs should include: purpose, affected paths, verification steps, and screenshots/GIFs for UI changes.
- Link related OpenSpec artifacts:
  - Active work: `openspec/changes/...`
  - Completed capabilities: `openspec/specs/...`
