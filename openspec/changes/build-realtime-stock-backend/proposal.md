## Why

The project currently renders a static dashboard and cannot deliver live market behavior required by the product specification. A backend change is needed now to ingest intraday ticks, compute ranked movers, and stream coherent chart snapshots to the UI.

## What Changes

- Add a backend real-time market data pipeline that ingests normalized ticks from a mock stream source for local testing.
- Add intraday candle aggregation for 5-minute, 30-minute, and 120-minute windows with 30 candles per window.
- Add ranking logic that computes top 5 gainers and top 5 losers using percent change from market-open price.
- Add WebSocket snapshot broadcasting at 1-second cadence for dashboard consumption.
- Add Redis-backed intraday state so active-session data survives backend restarts.
- Add market session lifecycle handling in `America/New_York` with daily reset at open and update stop at close.
- Add health visibility for ingest connectivity and snapshot freshness.

## Capabilities

### New Capabilities
- `realtime-stock-dashboard-feed`: Ingest ticks, maintain intraday state, rank movers, and publish snapshot payloads for the dashboard over WebSocket.

### Modified Capabilities
- None.

## Impact

- Affects `backend/` with a new Spring Boot 3 (Java 21) service.
- Introduces Redis as a required runtime dependency for backend state persistence.
- Adds a WebSocket feed contract consumed by the frontend dashboard.
- Establishes backend-side market session and watchlist configuration requirements.
