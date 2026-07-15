# Current Slice

Status: done

## Slice Goal
- Let a pending open transaction fill on the next accepted update for the same symbol.

## Stories In Scope
- `US-05 Pending open fills on the next symbol update`

## Stories Completed In This Slice
- `US-05 Pending open fills on the next symbol update`

## Stories Remaining In This Slice
- None.

## Contract Inputs
- `openapi.yaml` `/api/transactions`
- `docs/contracts.md` Contract 1: Dashboard Snapshot Stream
- `docs/contracts.md` Contract 2: Aggregate Update Input

## Decision Inputs
- None.

## Shared State Required Now
- In-memory watchlist symbol state with latest accepted chart points.
- In-memory transactions that can transition from `PENDING_OPEN` to `OPEN` on the next same-symbol accepted update.
- Transaction chart points that stay aligned with accepted symbol updates while the transaction is live.

## Operations / Endpoints / Surfaces In This Slice
- Existing `POST /api/transactions`
- Existing `GET /ws` snapshot stream
- Backend symbol-update handling that fills pending opens
- Transaction cards driven by snapshot `transactions`

## Tests Required
- Backend integration test proving a pending open becomes `OPEN` on the next accepted update for the same symbol and the websocket publishes that filled snapshot.
- Backend test proving a pending open does not fill from another symbol's accepted update.
- Backend test proving the filled transaction uses the update `close` as `entryPrice`, the update `end_timestamp` as `openedAt`, and includes updated chart history.

## Not Now
- `US-06 Pending close fills and freezes the transaction`
- Remaining `US-07` close-command and post-close rejection paths.
- Close command HTTP handler implementation.

## Done When
- A `PENDING_OPEN` transaction becomes `OPEN` only after the next accepted update for that same symbol.
- The filled transaction uses that update's `close` as `entryPrice` and `end_timestamp` as `openedAt`.
- The backend publishes a full websocket snapshot showing the filled transaction and updated chart history.
- The symbol stays excluded from `topGainers` and `topLosers` while the transaction is open.
- Automated tests cover same-symbol fill behavior, non-fill on other-symbol updates, and snapshot contents.

## Completion Summary
- Pending opens now become `OPEN` on the next accepted update for the same symbol.
- Live transaction chart points now stay aligned with accepted symbol updates, and the fill snapshot carries `entryPrice`, `openedAt`, and updated points.
- Backend verification passed with websocket integration coverage plus `./scripts/verify`.

## Next Slice Recommendation
- `US-06 Pending close fills and freezes the transaction`
- Keep the remaining `US-07` close-command rejection paths in view because they share the same close lifecycle state.
