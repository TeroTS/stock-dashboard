# Current Slice

Status: done

## Slice Goal
- Let the user open a transaction that appears immediately as pending and disappears from the stock grids.

## Stories In Scope
- `US-04 Open transaction enters pending state immediately`

## Stories Completed In This Slice
- `US-04 Open transaction enters pending state immediately`

## Stories Remaining In This Slice
- None.

## Contract Inputs
- `openapi.yaml` `/api/transactions`
- `docs/contracts.md` Contract 1: Dashboard Snapshot Stream

## Decision Inputs
- None.

## Shared State Required Now
- In-memory watchlist symbol state with latest accepted chart points.
- In-memory transactions with `PENDING_OPEN` status and snapshot serialization.
- One active or pending transaction invariant per symbol.

## Operations / Endpoints / Surfaces In This Slice
- Backend `POST /api/transactions`
- Existing `GET /ws` snapshot stream
- Transaction entries in snapshot `transactions`
- Stock-grid exclusion for symbols with pending transactions

## Tests Required
- Backend integration test proving `POST /api/transactions` returns `202 Accepted` and the next websocket snapshot shows a `PENDING_OPEN` transaction.
- Backend integration test proving the pending symbol is removed from stock-card arrays in the same snapshot.
- Backend test proving duplicate open requests for the same symbol are rejected while the transaction is pending.
- Backend test proving open requests without live symbol state are rejected.

## Not Now
- `US-05 Pending open fills on the next symbol update`
- `US-06 Pending close fills and freezes the transaction`
- Remaining `US-07` close-command and post-close rejection paths.

## Done When
- `POST /api/transactions` accepts a valid open command and returns a backend transaction id with `PENDING_OPEN` status.
- The backend immediately publishes a full websocket snapshot with the pending transaction.
- The symbol is excluded from `topGainers` and `topLosers` while the transaction is pending open.
- Automated tests cover acceptance, snapshot publication, duplicate rejection, and unavailable-symbol rejection.

## Completion Summary
- Backend now implements `POST /api/transactions` and returns `202 Accepted` with a backend transaction id and `PENDING_OPEN` status.
- Accepted open commands immediately publish a full websocket snapshot that moves the symbol out of the stock grids and into `transactions` as a pending card.
- Backend validation now rejects duplicate pending opens for the same symbol and rejects opens when no live symbol snapshot exists.
- Automated verification passed with backend integration tests and `./scripts/verify`.

## Next Slice Recommendation
- `US-05 Pending open fills on the next symbol update`
- Keep `US-06 Pending close fills and freezes the transaction` and the remaining `US-07` rejection paths in view because they extend the same transaction lifecycle state.
