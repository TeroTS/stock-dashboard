## Why

The dashboard currently supports realtime stock cards with Buy/Short actions, but there is no formalized transaction lifecycle for opened and closed positions. Users need a transaction view that tracks position state, closure outcome, and symbol availability rules during the same trading day.

## What Changes

- Add transaction lifecycle behavior for opening LONG/SHORT positions from stock cards.
- Add Transactions Grid behavior (placement below stock grids, dynamic layout, max 5 items per row).
- Add close actions (`Sell` for LONG, `Cover` for SHORT), hide close action after closure, and fixed-size profit/loss calculation requirements.
- Add Redis persistence contract for transaction records and update-on-close behavior.
- Add symbol availability rules across OPEN/CLOSED transaction states and same-day re-trading.
- Add frozen closed-transaction behavior so closed cards stop changing for the rest of the trading day.

## Capabilities

### Modified Capabilities
- `realtime-stock-dashboard-feed`: extends snapshot/UI contract with transaction lifecycle and transactions grid behavior.

## Impact

- Backend: add transaction domain model, state transitions, Redis persistence, and snapshot payload enrichment.
- Frontend: add transactions grid UI, newest-first ordering, open/close actions, and hidden-close-button behavior for closed items.
- Tests: add backend lifecycle/persistence tests and frontend interaction/rendering tests.
