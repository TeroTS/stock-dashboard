# realtime-stock-dashboard-feed Specification

## Purpose
TBD - created by archiving change build-realtime-stock-backend. Update Purpose after archive.
## Requirements
### Requirement: Tick Ingestion and Validation
The system SHALL accept tick events containing `timestamp`, `symbol`, `price`, and `volume`, and SHALL process only ticks for symbols in the configured watchlist during open session.

#### Scenario: Track ingest outcomes by result
- **WHEN** the system processes a tick attempt
- **THEN** it records an observability metric for tick result (`accepted`, `invalid`, `dropped_symbol`, `dropped_session`, or `redis_failed`) with bounded symbol labels

### Requirement: Session Window Enforcement
The system SHALL evaluate session state in `America/New_York` and SHALL allow live updates only from `09:30:00` through `16:00:00`.

#### Scenario: Out-of-session tick rejection
- **WHEN** a tick arrives while session state is not `OPEN`
- **THEN** the system ignores the tick for candle and ranking updates

#### Scenario: Session close freeze
- **WHEN** session time transitions to `16:00:00` in `America/New_York`
- **THEN** the system stops processing new ticks for intraday updates

### Requirement: Market Open Price Capture
The system SHALL capture one market-open price per symbol per session from the first valid in-session tick.

#### Scenario: Set open price on first in-session tick
- **WHEN** the first valid tick for a symbol arrives after session open
- **THEN** the system stores that price as the symbol market-open price

#### Scenario: Preserve open price for the remainder of session
- **WHEN** subsequent ticks arrive for a symbol in the same session
- **THEN** the stored market-open price remains unchanged

### Requirement: Multi-Window Rolling Candles
The system SHALL maintain rolling candles for each symbol with exactly 30 buckets for each range: `5min` (`10s` buckets), `30min` (`60s` buckets), and `120min` (`240s` buckets).

#### Scenario: Update current bucket OHLCV
- **WHEN** a tick falls into the active bucket interval for a range
- **THEN** the bucket OHLCV values are updated using the tick

#### Scenario: Evict oldest bucket on rotation
- **WHEN** a new bucket is created beyond 30 buckets for a range
- **THEN** the oldest bucket is evicted and exactly 30 buckets remain

### Requirement: Gainer and Loser Ranking
The system SHALL rank symbols by percent change from market-open price using `((lastPrice - openPrice) / openPrice) * 100` and SHALL produce top 5 gainers and top 5 losers.

#### Scenario: Rank symbols with known open prices
- **WHEN** ranking is computed
- **THEN** symbols with known open prices are ordered by percent change and split into top 5 highest and top 5 lowest groups

#### Scenario: Exclude symbols with unknown open price
- **WHEN** a symbol has not established a market-open price
- **THEN** the symbol is excluded from ranking output

### Requirement: Snapshot Broadcast Cadence
The system SHALL publish full dashboard snapshots over WebSocket every second while session is open, and the dashboard frontend SHALL consume and render these snapshots in near-real-time.

#### Scenario: Track snapshot publish outcomes
- **WHEN** the publisher executes on cadence
- **THEN** it records snapshot observability outcomes (`published`, `skipped`, or `error`) and publish timing metrics

### Requirement: Snapshot Payload Contract
Each snapshot card SHALL include symbol identity, ranges, candle data, y-axis labels formatted with exactly 2 decimal places, x-axis labels in 24-hour format, and action labels `Buy` and `Short`.

#### Scenario: Frontend payload mapping
- **WHEN** a snapshot card is mapped to the dashboard UI model
- **THEN** symbol, ranges, axis labels, action labels, and active-range candle data are preserved for rendering

#### Scenario: Frontend fallback behavior
- **WHEN** live websocket feed is unavailable beyond retry window
- **THEN** dashboard remains usable via static fallback data and indicates fallback status

### Requirement: Redis Intraday Persistence
The system SHALL persist active-session state in Redis so backend restarts do not lose intraday candles, open prices, or latest prices.

#### Scenario: Track Redis operation retries and failures
- **WHEN** Redis operations are executed with retry semantics
- **THEN** the system records operation-level success/failure metrics and structured retry/failure logs

### Requirement: Daily Session Reset
The system SHALL reset prior-day intraday state at the start of the next open session.

#### Scenario: Clear stale state on new session open
- **WHEN** session transitions to the new market-open boundary on a new date
- **THEN** prior session candles, open prices, and rankings are cleared before new processing begins

### Requirement: Backend Metrics Export
The backend SHALL expose Prometheus-compatible metrics for realtime pipeline observability.

#### Scenario: Prometheus endpoint exposure
- **WHEN** backend is running
- **THEN** `GET /actuator/prometheus` responds with default runtime metrics and custom pipeline metric series

### Requirement: Structured Backend Logging
The backend SHALL emit structured logs with stable event keys for pipeline and Redis error/retry flows.

#### Scenario: Structured failure event
- **WHEN** tick processing or snapshot publishing fails
- **THEN** logs include machine-parseable event metadata (event key, symbol/session context where applicable, and exception details)

