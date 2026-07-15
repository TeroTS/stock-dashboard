# Agent Guide

## Project
- `frontend/`: React 19 + TypeScript + Vite UI
- `backend/`: Python 3.12+ + FastAPI backend with in-memory state, plain WebSocket snapshots, and HTTP transaction commands
- Backend-facing source of truth:
  - `DECISIONS.md`
  - `SPEC.md`
  - `openapi.yaml`
  - `docs/contracts.md`

## Repo Layout
- `frontend/src/components/`: UI components
- `frontend/src/live/`: WebSocket client, DTO mapping, connection state, transaction API client
- `frontend/src/types.ts`: shared UI models
- `backend/stock_dashboard_backend/`: backend code
- `backend/tests/`: backend tests
- `docs/`: contracts and slice notes
- Do not edit generated output such as `frontend/dist/`, `backend/.pytest_cache/`, `backend/__pycache__/`, `backend/*.egg-info`, or `backend/.venv/`

## Golden Path
```bash
./scripts/run-local
./scripts/setup
./scripts/verify
```

## Verification Contract
- Run `./scripts/verify` before committing.
- Every behavior change must include automated tests.
- Coverage must not decrease; changed code must be covered.
- Prefer root scripts over ad hoc verification commands.

## Required Start-of-Work Protocol
- Before the first repo-tracked edit in a task, reread `AGENTS.md`.
- Identify the sections that govern the task, such as `Repo Layout`, `Verification Contract`, `Rules`, `Naming Convention`, `TypeScript Return Types`, `Commenting Convention`, and `Backend Logging Rule`.
- In the last progress update before the first edit, explicitly name the applicable sections.
- If any repo rule conflicts with a higher-priority instruction, state the conflict before editing.
- Applies to code, config, docs, and tests.

Exemption:
- read-only exploration, review, or planning

## Simplicity Rule
- Prefer the simplest real solution that fully satisfies the current requirement.
- Implement the needed functionality and nothing else.
- Do not add complexity unless required for correctness, safety, readability, or an existing repo rule.
- Small refactors are acceptable when they directly simplify the implementation.

## Integration Fidelity Rule
- Do not use mocks, fakes, or in-memory replacements when a real integration path already exists in the repo or can be run locally.
- Prefer the real FastAPI backend, real HTTP command endpoints, and the real plain WebSocket `/ws` feed when available.
- Use mocks only when no practical real integration path exists, and say why.

## Naming Convention
- Follow the existing folder structure before introducing a new location or file shape.
- Place UI in `frontend/src/components/`, live feed and API integration in `frontend/src/live/`, shared UI models in `frontend/src/types.ts`, backend code in `backend/stock_dashboard_backend/`, and backend tests in `backend/tests/`.
- Use accepted terms from `SPEC.md`, `openapi.yaml`, and `docs/contracts.md` at module and API boundaries.
- Do not invent alternate business synonyms for existing terms such as transaction, snapshot, watchlist symbol, or position type.
- Treat broad renames as separate migrations, not incidental cleanup.

## TypeScript Return Types
This policy applies to authored TypeScript in `frontend/src/`.

- Add explicit return types to exported functions, exported methods, hooks, and public module-boundary helpers.
- Add explicit `Promise<...>` return types to async API, feed, and shared data helpers.
- Allow inference for React components, inline callbacks, small local helpers, and obvious one-line transformations.

## Commenting Convention
- Add a short file header comment to new authored Python modules in `backend/stock_dashboard_backend/` and new authored TypeScript modules in `frontend/src/live/`.
- Add concise comments above new non-trivial functions or methods when behavior depends on domain rules, contract mapping, invariants, retry behavior, or other non-obvious intent.
- For React components in `frontend/src/components/`, comment only when rendering or interaction behavior is non-obvious.
- Do not add comments that only restate obvious code.

Exemptions:
- generated files
- trivial barrel files
- tests where comments would be pure noise
- framework-owned stubs or machine-owned placeholders

## Backend Logging Rule
When implementing backend code for a user story from `SPEC.md`:

- Add structured logs for state-changing actions and external side effects.
- Use standard-library `logging` via `logger.info`, `logger.warning`, and `logger.error`.
- Include `event`, relevant IDs such as `transactionId` or `symbol`, `outcome`, and `reason` or `errorCode` for warnings and errors when available.

## Rules
- Prefer root scripts over ad hoc commands.
- Use `./scripts/run-local` for local app startup unless the task specifically needs separate manual processes.
- Treat `docker-compose.yml` as the local runtime entrypoint and keep it aligned with the active backend/frontend contract.
- Add backend code under `backend/stock_dashboard_backend/`.
- Add backend tests under `backend/tests/`.
- For HTTP changes, update `openapi.yaml` first.
- For WebSocket or event payload changes, update `docs/contracts.md`.
- Keep `README.md`, `AGENTS.md`, and root scripts aligned with active workflow changes.

## Common Pitfalls
- Required tools: Node.js 22+, Python 3.12+, `pnpm`, `uv`, Docker, Docker Compose
- Frontend package manager is pinned in `frontend/package.json`
- Backend dependencies are locked in `backend/uv.lock` and synced by `./scripts/setup`
- Default local ports: frontend `5173`, backend `8080`
- Common env vars: `VITE_WS_URL`, `VITE_API_BASE_URL`, `MASSIVE_API_KEY`
- Massive feed: subscribe per watchlist symbol with `A.<SYMBOL>`; do not use `A.*`
- Ignore provider updates with `official_open_price=None`
- Never hardcode API keys
