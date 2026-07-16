# Data Model

## Purpose and Scope
This document defines the storage-neutral records and derived projections that make up the stock dashboard system. It describes the authoritative runtime state the backend owns, the constraints that shape that state, and the projections exposed to the frontend.

Authoritative boundary contracts still live in:
- [openapi.yaml](../openapi.yaml) for HTTP commands
- [docs/contracts.md](./contracts.md) for websocket snapshots and provider updates

## Shared Conventions
### Identifier rules
- `symbol` is an uppercase watchlist symbol.
- `transactionId` is backend-generated and unique within a running backend instance.
- Timestamps use Unix epoch milliseconds.

### Common audit metadata expectations
- `updatedAt` on snapshots is backend-owned and represents the time of the latest accepted state change.
- Transactions record `submittedAt` when the command is accepted.
- Fill times come from provider `end_timestamp`, not browser clock time.

### Authoritative vs derived state
- The backend-owned authoritative state is in-memory only.
- The frontend read model is fully derived from websocket snapshots.
- Top gainer/loser lists are derived rankings, not stored authoritative records.
- Closed transaction profit/loss is derived from entry price, exit price, position type, and fixed quantity.

### Update and delete posture
- Accepted provider updates mutate symbol state in place.
- Accepted transaction commands mutate or remove transaction state in place.
- Canceling a pending open deletes that transaction record from authoritative state.
- Backend restart clears all symbol history and transaction state.

## Authoritative Records
### Record: Watchlist Symbol
- Purpose: defines whether a symbol is in scope for ingestion, ranking, and trading.
- Owning boundary: repo-owned watchlist configuration file.
- Required fields:
  - `symbol`
- Optional fields:
  - None
- Lifecycle/state:
  - No runtime status field
  - Exists when present in `backend/watchlist.txt`

### Record: Symbol State
- Purpose: stores the latest accepted market state and chart history for one watched symbol.
- Owning boundary: backend runtime.
- Required fields:
  - `symbol`
  - `officialOpenPrice`
  - `close`
  - `percentChange`
  - `points`
- Optional fields:
  - None
- Lifecycle/state:
  - Created on the first accepted provider update for that symbol
  - Updated on each accepted provider update
  - Removed only when the backend process restarts

### Record: Line Point
- Purpose: stores one close-price point in symbol or transaction history.
- Owning boundary: embedded inside symbol and transaction state.
- Required fields:
  - `timestamp`
  - `close`
- Optional fields:
  - None
- Lifecycle/state:
  - Appended when price changes
  - Rewrites the last point when the price is unchanged
  - Oldest points are dropped once history exceeds 300 items

### Record: Transaction State
- Purpose: stores the lifecycle and chart history of one user transaction.
- Owning boundary: backend runtime.
- Required fields:
  - `transactionId`
  - `symbol`
  - `positionType`
  - `status`
  - `submittedAt`
  - `points`
- Optional fields:
  - `openedAt`
  - `closedAt`
  - `entryPrice`
  - `exitPrice`
  - `profitLoss`
- Lifecycle/state:
  - `PENDING_OPEN`: command accepted, waiting for next accepted update for the same symbol
  - `OPEN`: filled from the next accepted symbol update
  - `PENDING_CLOSE`: close command accepted, waiting for next accepted update for the same symbol
  - `CLOSED`: filled close state with frozen chart history
  - There is no persisted `CANCELED` transaction state; canceling a pending open removes the record

## Relationship Rules
- One watchlist symbol can have at most one current symbol state record.
- One transaction references exactly one watchlist symbol.
- One watchlist symbol can have many transaction records over backend lifetime, but at most one active or pending transaction at a time.
- One symbol state contains zero to 300 line points.
- One transaction state contains zero to 300 line points.
- Transaction chart history mirrors the symbol history for the same symbol until the transaction is closed.

Cross-record invariants:
- Pending open and pending close fills use the next accepted provider update for the same symbol only.
- Closed transactions stop inheriting future symbol points.
- Symbols with `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE` transactions are excluded from stock ranking projections.

## Constraint Rules
### Uniqueness
- Watchlist symbols must be unique after trim and uppercase normalization.
- `transactionId` must be unique within the running backend process.

### Active transaction limits
- At most one transaction per symbol may be in `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE`.
- Opening a transaction requires current symbol state to exist.
- Closing a transaction is valid only from `OPEN`.
- Canceling a transaction open is valid only from `PENDING_OPEN`.

### Field and lifecycle constraints
- Provider updates with missing `officialOpenPrice` are ignored.
- Provider updates for symbols outside the watchlist are ignored.
- `percentChange` is derived from `close` and `officialOpenPrice`.
- `profitLoss` stays `null` until the transaction reaches `CLOSED`.
- Fixed quantity for realized profit/loss is 100 shares.
- Point history length must never exceed 300.

## Derived Projections
### Projection: Dashboard Snapshot
- Source authoritative records:
  - symbol state
  - transaction state
- Rebuildability expectation:
  - fully rebuildable from current in-memory authoritative state
- Audience visibility:
  - sent to every connected websocket client
- Notes:
  - contains `updatedAt`, `topGainers`, `topLosers`, and `transactions`
  - acts as a full read-model replacement, not a patch

### Projection: Stock Ranking Cards
- Source authoritative records:
  - symbol state
  - transaction state
- Rebuildability expectation:
  - recalculated on every accepted symbol-state change
- Audience visibility:
  - visible to dashboard clients through snapshot `topGainers` and `topLosers`
- Notes:
  - ordered by `percentChange`
  - limited to five gainers and five losers
  - excludes symbols with active or pending transactions

### Projection: Transaction Cards
- Source authoritative records:
  - transaction state
- Rebuildability expectation:
  - recalculated on every accepted transaction or relevant symbol update
- Audience visibility:
  - visible to dashboard clients through snapshot `transactions`
- Notes:
  - includes pending, open, pending-close, and closed transactions
  - closed cards keep frozen points and realized profit/loss

## Mapping Notes for Implementers
- Preserve the difference between authoritative runtime state and derived snapshot payloads.
- Preserve timestamp semantics: command acceptance uses backend clock; fills use provider event time.
- Preserve the next-accepted-update fill rule for both open and close transitions.
- Preserve point-copy semantics when a transaction is created and while it remains live.
- Preserve freeze semantics for closed transactions.
- Preserve full-snapshot websocket behavior; clients should not need patch merging.
- If persistence is added later, the concrete store must still preserve these record boundaries, status transitions, timestamp rules, and active-transaction constraints.

Model diagrams:
- [docs/diagrams/models/api_models.d2](./diagrams/models/api_models.d2)
- [docs/diagrams/models/state_models.d2](./diagrams/models/state_models.d2)
