# Current Slice

Status: done

## Slice Goal
- Let the user submit a close command that becomes pending immediately and fills on the next same-symbol update.

## Stories In Scope
- `US-06 Pending close fills and freezes the transaction`

## Stories Completed In This Slice
- `US-06 Pending close fills and freezes the transaction`

## Stories Remaining In This Slice
- None.

## Contract Inputs
- `openapi.yaml` `/api/transactions/{transactionId}/close`
- `docs/contracts.md` Contract 1: Dashboard Snapshot Stream
- `docs/contracts.md` Contract 2: Aggregate Update Input

## Decision Inputs
- None.

## Shared State Required Now
- In-memory transactions that can transition from `OPEN` to `PENDING_CLOSE` to `CLOSED`.
- Fixed realized P/L calculation for 100 shares using the transaction position type.
- Frozen transaction chart points after the close fill while the symbol returns to stock-card arrays.

## Operations / Endpoints / Surfaces In This Slice
- Backend `POST /api/transactions/{transactionId}/close`
- Existing `GET /ws` snapshot stream
- Backend symbol-update handling that fills pending closes
- Transaction cards driven by snapshot `transactions`

## Tests Required
- Backend integration test proving `POST /api/transactions/{transactionId}/close` returns `202 Accepted` and the next websocket snapshot shows `PENDING_CLOSE`.
- Backend integration test proving the next accepted same-symbol update closes the transaction, computes realized P/L, and returns the symbol to stock-card arrays.
- Backend test proving closed transaction points freeze after close while later symbol updates continue on stock cards.

## Not Now
- Remaining `US-07` rejection-path cleanup or additional guardrail coverage beyond the close endpoint contract.
- Any frontend UI changes beyond the existing close button wiring.

## Done When
- `POST /api/transactions/{transactionId}/close` accepts an open transaction and returns `PENDING_CLOSE`.
- The backend immediately publishes a full websocket snapshot showing the pending close state.
- The next accepted same-symbol update marks the transaction `CLOSED`, sets `exitPrice`, `closedAt`, and realized `profitLoss`, and returns the symbol to `topGainers` or `topLosers`.
- Closed transaction chart points freeze after close.
- Automated tests cover pending close, close fill, realized P/L, and chart freezing.

## Completion Summary
- Backend now implements `POST /api/transactions/{transactionId}/close` and immediately publishes `PENDING_CLOSE` snapshots.
- Pending closes now fill on the next accepted same-symbol update, compute realized P/L for both long and short positions, and return the symbol to stock-card arrays.
- Closed transaction chart points now freeze after close while later symbol updates continue on stock cards.
- Automated verification passed with backend integration coverage plus `./scripts/verify`.

## Next Slice Recommendation
- `US-07 Transaction rejection and duplicate protection`
- Keep the close-command trust-boundary checks in view so the remaining rejection paths are completed and verified explicitly.
