# Current Slice

Status: done

## Slice Goal
- Run the backend only against Massive 1-second aggregates.

## Stories In Scope
- `US-01 Massive-backed dashboard startup`

## Stories Completed In This Slice
- `US-01 Massive-backed dashboard startup`

## Stories Remaining In This Slice
- None.

## Contract Inputs
- `docs/contracts.md` Contract 1: Dashboard Snapshot Stream
- `docs/contracts.md` Contract 2: Aggregate Update Input

## Decision Inputs
- None.

## Shared State Required Now
- Massive API key validation and provider websocket subscription state.
- Existing in-memory watchlist symbol state and snapshot publishing path.

## Operations / Endpoints / Surfaces In This Slice
- Backend feed runtime startup
- Massive provider websocket ingestion
- Existing `GET /ws` snapshot stream fed by provider updates

## Tests Required
- Backend test proving startup requires `MASSIVE_API_KEY`.
- Backend integration test proving Massive startup authenticates, subscribes per watchlist symbol, and turns provider aggregates into `/ws` snapshots.

## Not Now
- Additional provider observability beyond required structured logs.
- Any frontend changes; the snapshot contract stays the same.

## Done When
- Backend starts the Massive provider websocket feed when a valid `MASSIVE_API_KEY` is present.
- Massive provider aggregates with open price, close, and end timestamp flow through the existing market-state and snapshot path.
- The `/ws` snapshot contract stays unchanged while legacy alternate-feed references are removed.
- Automated tests cover the Massive startup and ingestion path.

## Completion Summary
- The backend now runs only against the official `massive` Python websocket client path and no longer contains an alternate local feed generator or feed-mode selection.
- Startup now requires `MASSIVE_API_KEY`, subscribes per watchlist symbol, consumes parsed aggregate objects with `official_open_price`, `close`, and `end_timestamp`, and publishes `/ws` snapshots.
- Automated coverage now includes local websocket tests for startup validation, provider protocol subscription, and closed-socket handling without any alternate local feed path.

## Next Slice Recommendation
- `US-03 Ranked stock cards with one line chart`
- Keep `US-04 Open transaction enters pending state immediately` and `US-05 Pending open fills on the next symbol update` in view because they depend on the stock-card state already flowing through snapshots.
