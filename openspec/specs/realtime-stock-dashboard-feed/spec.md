# realtime-stock-dashboard-feed Specification

## Purpose
TBD - created by archiving change build-realtime-stock-backend. Update Purpose after archive.
## Requirements
### Requirement: Tick Ingestion and Validation
The system SHALL accept tick events containing `timestamp`, `symbol`, `price`, and `volume`, and SHALL process only ticks for symbols in the configured watchlist during open session.

#### Scenario: Accept valid watchlist tick during open session
- **WHEN** a tick with valid fields is received for a watchlist symbol while session status is `OPEN`
- **THEN** the system records the tick for downstream candle and ranking updates

#### Scenario: Ignore unknown symbol
- **WHEN** a tick is received for a symbol not in the watchlist
- **THEN** the system ignores the tick and increments dropped-symbol observability counters

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

#### Scenario: Frontend applies periodic snapshots
- **WHEN** a new snapshot is received from `/topic/dashboard-snapshots`
- **THEN** the dashboard UI updates card data using the latest snapshot payload

#### Scenario: Frontend reconnect status
- **WHEN** the websocket connection is interrupted
- **THEN** the dashboard exposes a reconnecting state until feed recovery or fallback threshold is reached

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

#### Scenario: Recover session state after restart
- **WHEN** backend restarts during open session
- **THEN** the service resumes processing with previously persisted intraday state

#### Scenario: Degraded Redis handling
- **WHEN** Redis operations fail beyond retry limits
- **THEN** the system marks health as degraded and reports failure metrics

### Requirement: Daily Session Reset
The system SHALL reset prior-day intraday state at the start of the next open session.

#### Scenario: Clear stale state on new session open
- **WHEN** session transitions to the new market-open boundary on a new date
- **THEN** prior session candles, open prices, and rankings are cleared before new processing begins

