# Architecture

## Overview
The stock dashboard system processes a live intraday tick stream, keeps per-symbol rolling state for a market session, and publishes full dashboard snapshots to connected clients on a fixed cadence. The same snapshot includes both stock ranking cards and transaction cards so the frontend has a single source of truth for rendering.

Primary users:
- Dashboard users viewing live gainers/losers and managing open/closed positions.
- Developers/operators validating session behavior, feed freshness, and transaction lifecycle behavior.

## Component Map
| Component | Responsibility | Key Boundary Contracts |
| --- | --- | --- |
| Tick producer | Emits normalized market ticks for watchlisted symbols | `NormalizedTick` ingest model |
| Realtime feed backend | Validates ticks, enforces session boundaries, updates rolling candles and rankings, publishes snapshots, serves transaction API | WebSocket endpoint/topic, transaction HTTP API, actuator health/metrics |
| Session/transaction state store | Persists intraday symbol state and transactions across backend restarts | Redis keyspace + JSON payload contracts |
| Dashboard frontend | Subscribes to snapshots, maps payloads to card models, triggers transaction open/close actions | Snapshot DTO contract, transaction API contract |
| Observability tooling (optional) | Scrapes and visualizes backend metrics/logs for operational insight | `/actuator/prometheus` metrics + structured logs |

System context diagram: [docs/diagrams/system_context.d2](./diagrams/system_context.d2)

## Runtime Flows
1. Realtime snapshot pipeline
- Tick events are validated and filtered by watchlist/session window.
- Accepted ticks update symbol session state and rolling candles.
- On each cadence, the backend builds a full `DashboardSnapshot` and publishes to the dashboard topic.
- Frontend applies the snapshot and renders updated stock/transaction cards.
- Diagram: [docs/diagrams/key_flow_realtime_snapshot.d2](./diagrams/key_flow_realtime_snapshot.d2)

2. Transaction open/close lifecycle
- User clicks `Buy`/`Short` (open) or `Sell`/`Cover` (close) in the frontend.
- Frontend calls transaction API endpoints.
- Backend validates session + symbol state, persists transaction state, then next snapshot reflects the changed transaction/stock grids.
- Diagram: [docs/diagrams/key_flow_transactions.d2](./diagrams/key_flow_transactions.d2)

3. Session rollover and daily reset
- During OPEN session checks, backend verifies current session date.
- If session date changed, prior intraday symbol and transaction state are cleared.
- New session state becomes the current date before new ticks are processed/published.
- Diagram: [docs/diagrams/key_flow_realtime_snapshot.d2](./diagrams/key_flow_realtime_snapshot.d2)

## System Boundaries
| Boundary Surface | Direction | Contract Definition | Authoritative Source |
| --- | --- | --- | --- |
| Tick ingest event | Inbound to backend | `timestamp`, `symbol`, `price`, `volume` validation + watchlist/session filtering | [openspec/specs/realtime-stock-dashboard-feed/spec.md](../openspec/specs/realtime-stock-dashboard-feed/spec.md), [backend/src/main/java/com/stockdashboard/backend/domain/NormalizedTick.java](../backend/src/main/java/com/stockdashboard/backend/domain/NormalizedTick.java), [backend/src/main/java/com/stockdashboard/backend/pipeline/TickIngestService.java](../backend/src/main/java/com/stockdashboard/backend/pipeline/TickIngestService.java) |
| WebSocket snapshot stream | Outbound from backend to frontend | Endpoint `/ws/dashboard`, topic `/topic/dashboard-snapshots`, `DashboardSnapshot` payload | [backend/src/main/java/com/stockdashboard/backend/ws/WebSocketConfig.java](../backend/src/main/java/com/stockdashboard/backend/ws/WebSocketConfig.java), [backend/src/main/java/com/stockdashboard/backend/snapshot/SnapshotPublisher.java](../backend/src/main/java/com/stockdashboard/backend/snapshot/SnapshotPublisher.java), [backend/src/main/java/com/stockdashboard/backend/snapshot/DashboardSnapshot.java](../backend/src/main/java/com/stockdashboard/backend/snapshot/DashboardSnapshot.java), [backend/src/test/java/com/stockdashboard/backend/ws/WebSocketSnapshotContractIntegrationTest.java](../backend/src/test/java/com/stockdashboard/backend/ws/WebSocketSnapshotContractIntegrationTest.java) |
| Transaction API | Bidirectional frontend/backend | `POST /api/transactions`, `POST /api/transactions/{id}/close`, `GET /api/transactions` | [backend/src/main/java/com/stockdashboard/backend/transaction/TransactionController.java](../backend/src/main/java/com/stockdashboard/backend/transaction/TransactionController.java), [backend/src/test/java/com/stockdashboard/backend/transaction/TransactionControllerTest.java](../backend/src/test/java/com/stockdashboard/backend/transaction/TransactionControllerTest.java), [frontend/src/live/transactionsApi.ts](../frontend/src/live/transactionsApi.ts) |
| Intraday state persistence | Backend to Redis | Session symbol state and transaction records, keyed by session date | [backend/src/main/java/com/stockdashboard/backend/state/RedisSessionStateStore.java](../backend/src/main/java/com/stockdashboard/backend/state/RedisSessionStateStore.java), [backend/src/main/java/com/stockdashboard/backend/transaction/RedisTransactionStore.java](../backend/src/main/java/com/stockdashboard/backend/transaction/RedisTransactionStore.java) |
| Health and metrics endpoints | Backend to operators/tools | `/actuator/health`, `/actuator/prometheus` (profile-dependent exposure), custom pipeline metric series | [backend/src/main/resources/application-local.yaml](../backend/src/main/resources/application-local.yaml), [backend/src/main/resources/application-prod.yaml](../backend/src/main/resources/application-prod.yaml), [docs/operations.md](./operations.md) |

## Operational Topology
High-level local and production topology diagram: [docs/diagrams/deployment_topology.d2](./diagrams/deployment_topology.d2)

Environment shape:
- Local development typically runs frontend, backend, and Redis directly, or via `docker compose`.
- Optional local observability adds Prometheus and Grafana.
- Production deployment keeps the same logical boundaries (client, backend runtime, session state store, monitoring stack), with stricter CORS/origin allowlists and profile-specific actuator exposure.

Run and ops details:
- Local runbook: [docs/running.md](./running.md)
- Operational checks and failure handling: [docs/operations.md](./operations.md)

## How To Change Safely
When changing boundary behavior, update contracts and tests first, then implementation.

1. Snapshot payload or chart/range behavior changes
- Update backend snapshot records/assembler and corresponding frontend DTO/mapping types.
- Update contract tests and frontend mapping tests.
- Update [docs/data-models.md](./data-models.md) and impacted D2 diagrams.

2. Transaction lifecycle changes
- Update transaction API/controller/service/store behavior and status handling.
- Update frontend transaction API client and UI action wiring.
- Re-run transaction controller/service tests and end-to-end live feed flow checks.

3. Session window or rollover behavior changes
- Update market/session configuration and lifecycle reset logic.
- Verify tick acceptance/rejection and reset semantics with tests.
- Update operations notes if health thresholds/metrics behavior changes.

4. Any boundary change
- Keep accepted spec aligned: [openspec/specs/realtime-stock-dashboard-feed/spec.md](../openspec/specs/realtime-stock-dashboard-feed/spec.md).
- Keep architecture/data-model docs and related diagrams aligned in the same change.
