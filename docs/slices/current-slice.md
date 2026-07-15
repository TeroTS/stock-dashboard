# Current Slice

Status: done

## Slice Goal
- Reject invalid repeat transaction commands without changing the visible snapshot state.

## Stories In Scope
- `US-07 Transaction rejection and duplicate protection`

## Stories Completed In This Slice
- `US-07 Transaction rejection and duplicate protection`

## Stories Remaining In This Slice
- None.

## Contract Inputs
- `openapi.yaml` `/api/transactions`
- `openapi.yaml` `/api/transactions/{transactionId}/close`
- `docs/contracts.md` Contract 1: Dashboard Snapshot Stream

## Decision Inputs
- None.

## Shared State Required Now
- Active transaction invariant per symbol across `PENDING_OPEN`, `OPEN`, and `PENDING_CLOSE`.
- Close-command validation across `PENDING_OPEN`, `PENDING_CLOSE`, and `CLOSED` transaction states.
- Snapshot authority remaining on the websocket read model after rejected commands.

## Operations / Endpoints / Surfaces In This Slice
- Backend `POST /api/transactions`
- Backend `POST /api/transactions/{transactionId}/close`
- Existing `GET /ws` snapshot stream
- Frontend transaction command hook behavior on rejected commands

## Tests Required
- Backend integration test proving open commands are rejected while a symbol is `OPEN`.
- Backend integration test proving open commands are rejected while a symbol is `PENDING_CLOSE`.
- Backend integration test proving close commands are rejected while a transaction is `PENDING_CLOSE` and after it is `CLOSED`.
- Frontend test proving rejected command promises resolve without corrupting the command hook contract.

## Not Now
- Any new UI for error messages.
- Any retry, toast, or optimistic-state behavior beyond keeping snapshots authoritative.

## Done When
- Open commands are rejected for symbols with `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE` transactions.
- Close commands are rejected for unknown ids, `PENDING_CLOSE`, and `CLOSED` transactions.
- Rejected commands do not require frontend rollback because snapshots remain authoritative.
- Automated tests cover the remaining rejection and duplicate-protection paths.

## Completion Summary
- Added backend integration coverage for duplicate open rejection while a transaction is `OPEN` and while it is `PENDING_CLOSE`.
- Added backend integration coverage for close-command rejection while a transaction is already `PENDING_CLOSE` and after it is `CLOSED`.
- Existing frontend command-hook behavior already kept snapshot authority intact by resolving rejected command promises without local rollback.
- Automated verification passed with `./scripts/verify`.

## Next Slice Recommendation
- No explicit next story remains in `SPEC.md`.
