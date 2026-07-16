# Architecture

## Overview
The stock dashboard shows a live watchlist view built from one authoritative backend snapshot stream. The backend consumes watched-symbol aggregate updates, keeps in-memory market and transaction state, and pushes full dashboard snapshots to connected browser clients. The frontend treats each snapshot as a full read-model replacement and uses HTTP only for transaction commands.

Primary users:
- Dashboard users watching top gainers, top losers, and transaction cards
- Developers running the app locally against live provider data
- Operators checking feed health, command handling, and websocket freshness

## Component Map
| Component | Responsibility | Key contracts |
| --- | --- | --- |
| Market data provider | Emits per-symbol aggregate updates | Provider update shape in [docs/contracts.md](./contracts.md) |
| Watchlist file | Defines which symbols the backend tracks | `backend/watchlist.txt` |
| Backend runtime | Consumes provider updates, owns in-memory symbol and transaction state, serves health, HTTP commands, and websocket snapshots | [openapi.yaml](../openapi.yaml), [docs/contracts.md](./contracts.md) |
| Frontend dashboard | Connects to the snapshot stream, replaces local read state from snapshots, sends transaction commands | [openapi.yaml](../openapi.yaml), [docs/contracts.md](./contracts.md) |
| Browser client | Renders stock cards, transaction cards, timestamps, and connection state | UI behavior in `frontend/src/components/` |

System context diagram:
- [docs/diagrams/system_context.d2](./diagrams/system_context.d2)

## Runtime Flows
### 1. Live snapshot flow
1. The backend reads the watchlist file at startup.
2. The backend subscribes to per-symbol aggregate updates from the market data provider.
3. Accepted updates mutate in-memory symbol state and may fill pending transactions for the same symbol.
4. The backend builds a full dashboard snapshot and pushes it to all connected websocket clients.
5. The frontend replaces its local dashboard read model from that snapshot.

Diagram:
- [docs/diagrams/key_flow_realtime_snapshot.d2](./diagrams/key_flow_realtime_snapshot.d2)

### 2. Transaction command flow
1. The user clicks `Buy`, `Short`, `Sell`, `Cover`, or pending-open cancel in the dashboard.
2. The frontend sends an HTTP command to the backend.
3. The backend validates current state and either rejects the command or updates transaction state immediately.
4. The backend publishes a fresh full snapshot showing the pending state change.
5. The next accepted provider update for that symbol fills pending open or pending close commands.
6. The backend publishes another full snapshot with the filled transaction state.

Diagram:
- [docs/diagrams/key_flow_transactions.d2](./diagrams/key_flow_transactions.d2)

### 3. Client reconnect flow
1. The frontend reconnects when the websocket closes.
2. The UI shows `reconnecting` briefly, then `fallback` if no snapshot arrives within the configured timeout.
3. After reconnect, the backend sends the latest available full snapshot to the new connection.

Diagram:
- [docs/diagrams/key_flow_realtime_snapshot.d2](./diagrams/key_flow_realtime_snapshot.d2)

## System Boundaries
| Boundary surface | Direction | Contract source |
| --- | --- | --- |
| Provider aggregate update | Inbound to backend | [docs/contracts.md](./contracts.md) |
| Health endpoint `GET /health` | Backend to operators | [openapi.yaml](../openapi.yaml) |
| Transaction commands `POST /api/transactions`, `POST /api/transactions/{transactionId}/close`, `POST /api/transactions/{transactionId}/cancel-open` | Frontend to backend | [openapi.yaml](../openapi.yaml) |
| Dashboard snapshot websocket `GET /ws` upgrade + JSON messages | Backend to frontend | [docs/contracts.md](./contracts.md) |
| Watchlist symbol file | Repo config to backend | `backend/watchlist.txt` |
| Frontend runtime URLs | Local env to frontend | `docker-compose.yml`, [docs/running.md](./running.md) |

## Operational Topology
Locally, the system usually runs as two app processes through Docker Compose: one backend service and one frontend service. The backend also depends on an external market data provider and a repo-owned watchlist file. The frontend depends on the backend for both websocket snapshots and transaction commands.

In deployed environments, the logical topology stays the same:
- browser client
- frontend app
- backend runtime
- external market data provider
- repo-managed watchlist configuration

Topology diagram:
- [docs/diagrams/deployment_topology.d2](./diagrams/deployment_topology.d2)

Run and ops details:
- [docs/running.md](./running.md)
- [docs/operations.md](./operations.md)

## How to Change Safely
### HTTP command changes
- Update [openapi.yaml](../openapi.yaml) first.
- Keep `frontend/src/live/transactionsApi.ts` aligned with the contract.
- Add or update backend tests in `backend/tests/` and frontend command tests in `frontend/src/live/test/`.

### Websocket snapshot or provider-event changes
- Update [docs/contracts.md](./contracts.md) first.
- Keep backend snapshot building and frontend DTO mapping aligned.
- Update D2 diagrams under `docs/diagrams/` when flow or payload shape changes.

### Canonical state changes
- Update [docs/data-models.md](./data-models.md).
- Preserve the current invariants around active transaction exclusivity, next-update fills, point history limits, and closed-transaction freeze behavior.

### Runtime and workflow changes
- Keep [README.md](../README.md), [docs/running.md](./running.md), [docs/operations.md](./operations.md), and root scripts aligned.
- Prefer root scripts for setup, run, and verification:
  - `./scripts/setup`
  - `./scripts/run-local`
  - `./scripts/verify`
