# Current Slice

Status: done

## Slice Goal
- Show ranked stock cards with one close-price line chart per card.

## Stories In Scope
- `US-03 Ranked stock cards with one line chart`

## Stories Completed In This Slice
- `US-03 Ranked stock cards with one line chart`

## Stories Remaining In This Slice
- None.

## Contract Inputs
- `docs/contracts.md` Contract 1: Dashboard Snapshot Stream
- `docs/contracts.md` Contract 2: Aggregate Update Input

## Decision Inputs
- None.

## Shared State Required Now
- In-memory watchlist symbol state with latest close, official open price, percent change, and up to 300 line points.
- Snapshot ordering for top gainers and top losers.
- Frontend stock-card rendering from backend-owned `points` arrays.

## Operations / Endpoints / Surfaces In This Slice
- Backend market-state update shaping for stock-card points
- Existing `GET /ws` snapshot stream
- Frontend stock-card rendering in `Top Gainers` and `Top Losers`

## Tests Required
- Backend test proving same-price updates overwrite the last point instead of appending.
- Backend test proving point history caps at 300 items.
- Frontend test proving stock cards render a line chart from snapshot `points`.
- Frontend test proving gainers and losers sections render ranked cards from snapshot state.

## Not Now
- `US-04 Open transaction enters pending state immediately`
- `US-05 Pending open fills on the next symbol update`
- Transaction-card chart rendering beyond the current stock-card story.

## Done When
- Backend ignores aggregates with missing open price, computes percent change from provider open, and preserves the append-or-update point rules with a 300-point cap.
- Frontend renders top 5 gainers and top 5 losers as stock cards with one close-price line chart each.
- Automated tests cover the chart-shaping and stock-card rendering behavior.

## Completion Summary
- Backend market-state coverage now proves accepted aggregates are ranked by percent change, same-price updates overwrite the last point instead of appending, and point history is capped at 300 items.
- Frontend stock cards now render one close-price SVG line chart from backend-owned `points` arrays in both the Top Gainers and Top Losers sections.
- Automated verification passed with frontend tests, backend tests, `react-doctor`, and `./scripts/verify`.

## Next Slice Recommendation
- `US-04 Open transaction enters pending state immediately`
- Keep `US-05 Pending open fills on the next symbol update` and `US-06 Pending close fills and freezes the transaction` in view because they share transaction lifecycle state and snapshot updates.
