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

#### Scenario: Frontend applies selected range view
- **WHEN** a user clicks a range chip (`5min`, `30min`, `120min`) on a stock card
- **THEN** the frontend updates that card’s chart and axis labels to the selected range data without requiring a page reload

#### Scenario: Frontend preserves range selection on live updates
- **WHEN** a new snapshot arrives for a symbol whose currently selected range still exists
- **THEN** the frontend keeps the user’s selected range for that card

### Requirement: Snapshot Payload Contract
Each snapshot card SHALL include symbol identity, ranges, candle data, y-axis labels formatted with exactly 2 decimal places, x-axis labels in 24-hour format, and action labels `Buy` and `Short`.

#### Scenario: Frontend stores per-range chart data
- **WHEN** a snapshot card is mapped to frontend card state
- **THEN** the frontend stores candle and axis information for each available range so range switching is interactive

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

### Requirement: Transaction Opening and Grid Migration
When a user opens a position from a stock card (`Buy` for LONG or `Short` for SHORT), the system SHALL create a transaction and move that symbol from Stocks Grid to Transactions Grid.

#### Scenario: Open LONG or SHORT transaction
- **WHEN** a user triggers `Buy` or `Short` on a symbol card
- **THEN** a transaction record is created with `symbol`, `positionType`, `openTimestamp`, `entryPrice`, and `status=OPEN`
- **AND** the symbol is removed from Stocks Grid and inserted into Transactions Grid

#### Scenario: Transaction header initial metadata
- **WHEN** a transaction card is first rendered in Transactions Grid
- **THEN** its header shows the open timestamp and position type indicator (`LONG` or `SHORT`)

### Requirement: Transactions Grid Layout
The dashboard SHALL render Transactions Grid below the Stocks Grids with a dynamic layout that supports a maximum width of 5 items per row and newest-first ordering.

#### Scenario: Enforce transaction row width
- **WHEN** more than five transactions are visible
- **THEN** additional transaction cards wrap to the next row while preserving grid placement below Stocks Grids

#### Scenario: Render newest transaction first
- **WHEN** multiple transactions exist in Transactions Grid
- **THEN** transactions are ordered by open timestamp descending (newest first)

### Requirement: Transaction Close Actions and Realized P/L
Each OPEN transaction SHALL expose a close action and SHALL transition to CLOSED state with realized P/L when the close action is executed.

#### Scenario: Close action label by position type
- **WHEN** a transaction status is `OPEN`
- **THEN** LONG transactions display `Sell` and SHORT transactions display `Cover`

#### Scenario: Closing transaction updates financial fields
- **WHEN** user clicks `Sell` or `Cover` for an OPEN transaction
- **THEN** the system computes `profitLoss` using fixed quantity `100` shares, sets `exitPrice` and `closeTimestamp`, and updates status to `CLOSED`
- **AND** the transaction header displays the realized profit/loss amount

#### Scenario: Realized P/L formulas by position type
- **WHEN** a transaction is closed
- **THEN** LONG `profitLoss` is `(exitPrice - entryPrice) * 100`
- **AND** SHORT `profitLoss` is `(entryPrice - exitPrice) * 100`

#### Scenario: Hide close action after close
- **WHEN** a transaction status changes to `CLOSED`
- **THEN** the close action button is no longer rendered for that transaction card

### Requirement: Symbol Availability Across Transaction Lifecycle
The system SHALL prevent duplicate simultaneous positions per symbol and SHALL allow same-day re-trading after closure.

#### Scenario: Exclude symbol while open
- **WHEN** a symbol has an `OPEN` transaction
- **THEN** that symbol is not available in Stocks Grid

#### Scenario: Re-enable symbol after close
- **WHEN** a symbol's active transaction transitions to `CLOSED`
- **THEN** the symbol becomes available in Stocks Grid again
- **AND** additional same-day transactions for that symbol are stored as independent records

### Requirement: Redis Transaction Persistence Contract
Transaction records SHALL be persisted in Redis immediately on open and updated on close using the intraday transaction schema.

#### Scenario: Persist open transaction
- **WHEN** a transaction is created
- **THEN** Redis stores `symbol`, `positionType`, `openTimestamp`, `entryPrice`, `status`, and nullable close fields (`closeTimestamp`, `exitPrice`, `profitLoss`)

#### Scenario: Keep closed transactions visible until market close
- **WHEN** a transaction is `CLOSED`
- **THEN** it remains visible in Transactions Grid until market close for that trading day (`16:00 America/New_York`)
- **AND** it is not moved back to Stocks Grid as an open position card

#### Scenario: Freeze closed transaction data
- **WHEN** a transaction is `CLOSED`
- **THEN** its displayed values and persisted close-state fields are treated as immutable for the rest of the trading day
- **AND** subsequent symbol re-trades create new transaction records instead of mutating the closed record

