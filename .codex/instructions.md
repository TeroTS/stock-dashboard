# Repository-local Codex Instructions

- Use `./scripts/setup` for dependency/bootstrap work.
- Use `./scripts/verify` for pre-commit verification.
- CI parity: `.github/workflows/verify.yml` runs the same two commands.
- For backend integration tests, ensure Docker is running (Testcontainers).
- Prefer backend Maven Wrapper commands (`./backend/mvnw ...`) over host `mvn`.
- For boundary contract changes, update:
  - `openspec/specs/realtime-stock-dashboard-feed/spec.md`
  - `docs/architecture.md`
  - `docs/data-models.md`
- Do not edit generated output directories directly:
  - `frontend/dist/`
  - `backend/target/`
