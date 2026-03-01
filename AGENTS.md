# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` contains the working app (React 19 + TypeScript + Vite).
- `frontend/src/components/` holds UI modules (`StockDashboard`, `StockCard`, `CandlestickChart`).
- `frontend/src/data/dashboardData.ts` stores static dashboard seed data.
- `frontend/src/types.ts` contains shared TypeScript models/interfaces.
- `frontend/src/assets/` holds bundled static assets.
- `frontend/dist/` is generated build output; do not edit it manually.
- `backend/` and `infra/` exist as scaffolding (`infra/aws`, `infra/azure`) and are currently minimal.
- `openspec/` tracks spec-driven work (`changes/`, `specs/`, `config.yaml`).

## Build, Test, and Development Commands
Run app commands from `frontend/`:

```bash
pnpm install     # install dependencies
pnpm dev         # start Vite dev server with HMR
pnpm lint        # run ESLint on TS/TSX files
pnpm build       # type-check (tsc -b) and build production bundle
pnpm preview     # serve the built app locally
```

## Coding Style & Naming Conventions
- Use TypeScript with strict compiler settings (`frontend/tsconfig.app.json`).
- Follow ESLint rules in `frontend/eslint.config.js` before opening PRs.
- Use 2-space indentation and the existing semicolon-free style.
- Components, interfaces, and type aliases use `PascalCase` (`StockCardModel`).
- Variables/functions use `camelCase`; constants use `UPPER_SNAKE_CASE`.
- CSS class names use `kebab-case` and stay descriptive (for example, `trade-button-buy`).

## Testing Guidelines
- No automated test runner is currently configured.
- For new logic/UI behavior, add tests with Vitest + React Testing Library.
- Prefer co-located test files: `ComponentName.test.tsx` or `module.test.ts`.
- Minimum local verification before PR: `pnpm lint` and `pnpm build` both pass.

## Commit & Pull Request Guidelines
- Git history is not available in this workspace; use Conventional Commits (`feat:`, `fix:`, `chore:`) for consistency.
- Keep commits focused to one logical change.
- PRs should include: purpose, affected paths, verification steps, and screenshots/GIFs for UI changes.
- Link related issue/spec entries (for spec work, reference `openspec/changes/...`).
