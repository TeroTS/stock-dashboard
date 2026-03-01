## Why

The time window buttons (`5min`, `30min`, `120min`) are currently rendered but non-interactive in the dashboard cards. Users cannot switch chart windows even though range chips are visible, which breaks expected dashboard behavior.

## What Changes

- Make time window buttons interactive per stock card.
- Preserve selected range per card across live snapshot refreshes when that range remains available.
- Ensure fallback/static mode supports the same time-window switching behavior.
- Update frontend card model/mapping so each card retains candle and axis data for all ranges.
- Add tests covering range switching and mapped multi-range data behavior.

## Capabilities

### Modified Capabilities
- `realtime-stock-dashboard-feed`: frontend cards now allow range selection among `5min`, `30min`, and `120min` and render selected-range chart data.

## Impact

- Frontend type/model updates (`StockCardModel`) and rendering logic (`StockCard`).
- Snapshot mapping logic in `frontend/src/live/mapSnapshotToCards.ts`.
- Frontend tests for dashboard interaction and card mapping.
