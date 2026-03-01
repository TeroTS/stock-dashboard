## Why

Users need an immediate textual signal for realtime movement per symbol. Today cards show symbol and candlestick chart, but percent change is not displayed in the card header even though backend snapshots already provide it.

## What Changes

- Show realtime signed percent change next to each symbol in the stock card header.
- Use backend snapshot `percentChange` for live cards.
- Show neutral `0.00%` for fallback/static cards.
- Color-code change text by direction (positive/negative/neutral).

## Capabilities

### Modified Capabilities
- `realtime-stock-dashboard-feed`: frontend now displays per-card realtime percent change in header.

## Impact

- Frontend type and mapping updates to carry `percentChange`.
- Stock card UI and CSS updates for formatted percent display.
- Frontend tests updated for mapping and rendered header content.
