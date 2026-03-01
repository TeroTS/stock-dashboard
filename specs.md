# Real-Time Stock Dashboard Backend

## 1. Overview
This specification defines a real-time backend that ingests intraday stock ticks, aggregates candles for multiple windows, ranks fastest rising and falling symbols from market open, and broadcasts dashboard snapshots over WebSocket. The system exists to provide a deterministic, low-latency feed for a 5x2 stock dashboard UI.

## 2. Goals
- The system SHALL ingest tick events in the format `timestamp, symbol, price, volume` for a fixed watchlist.
- The system SHALL produce 30-candle rolling windows for `5min`, `30min`, and `120min`.
- The system SHALL compute top 5 gainers and top 5 losers using percentage change from market-open price.
- The system SHALL broadcast coherent dashboard snapshots to connected clients at a 1-second cadence while the market session is open.
- The system SHALL preserve intraday state across backend restarts during the active market session.
- The system SHALL reset all prior-day intraday state at the next market-open boundary.

## 3. Non-Goals
- The system SHALL NOT place or execute real buy/short orders.
- The system SHALL NOT provide historical storage beyond the active intraday session.
- The system SHALL NOT support dynamic symbol discovery in v1.
- The system SHALL NOT support pre-market or after-hours session logic in v1.
- The system SHALL NOT use delta-only WebSocket payloads in v1.

## 4. Definitions
- `Tick`: A single market data event containing `timestamp, symbol, price, volume`.
- `Watchlist`: Fixed configured set of symbols eligible for processing.
- `Market Open Price`: First valid in-session price for a symbol at or after session open.
- `Candle`: OHLCV aggregate for a fixed duration bucket.
- `Range`: One of `5min`, `30min`, `120min`, mapped to 30 buckets.
- `Dashboard Snapshot`: Full payload containing the top gainers and losers with chart data.
- `Session`: Regular market interval from 09:30 to 16:00 in `America/New_York`.
- `Intraday State`: All session data required for candles, ranking, and snapshots.

## 5. Functional Requirements
5.1 The system SHALL accept tick input events with fields `timestamp`, `symbol`, `price`, and `volume`.

5.2 The system SHALL process ticks only for symbols present in the configured watchlist.

5.3 The system SHALL process ticks only when session status is `OPEN`.

5.4 The system SHALL determine session status using the `America/New_York` timezone with a regular-session window of 09:30:00 through 16:00:00.

5.5 The system SHALL set the market-open price once per symbol per session using the first valid in-session tick price.

5.6 The system SHALL maintain rolling candle series with exactly 30 candles for each symbol and each range:
- `5min`: 30 candles of 10 seconds each
- `30min`: 30 candles of 60 seconds each
- `120min`: 30 candles of 240 seconds each

5.7 The system SHALL update candle OHLCV values in real time as ticks arrive.

5.8 The system SHALL compute ranking metric as percent change from market-open price:
`((lastPrice - openPrice) / openPrice) * 100`.

5.9 The system SHALL produce top 5 symbols with highest percent change as gainers.

5.10 The system SHALL produce top 5 symbols with lowest percent change as losers.

5.11 The system SHALL exclude symbols without a market-open price from ranking.

5.12 The system SHALL generate a full dashboard snapshot every 1 second while session status is `OPEN`.

5.13 The system SHALL broadcast snapshots over WebSocket to subscribed clients.

5.14 Each snapshot card SHALL include `symbol`, available ranges (`5min`, `30min`, `120min`), OHLCV candle data, y-axis labels with 2-decimal price formatting, x-axis labels formatted as 24-hour time, and action labels `Buy` and `Short`.

5.15 The system SHALL preserve intraday state in Redis so that process restarts do not lose current-session data.

5.16 The system SHALL freeze updates at session close and retain final in-memory and Redis state until next session open.

5.17 At the start of a new session date, the system SHALL clear prior intraday state and start with empty candles and no prior open-price values.

5.18 The system SHALL expose health signals for ingest connectivity and snapshot freshness.

## 6. Constraints & Technology
### 6.1 Runtime
- The system SHALL run on Java 21.

### 6.2 Framework
- The backend SHALL use Spring Boot 3.x.
- The backend SHALL use Spring WebSocket for snapshot delivery.

### 6.3 Data Store
- The backend SHALL use Redis as the persistent intraday state store.
- The backend SHALL NOT require persistent historical storage for v1.

### 6.4 Session and Market Scope
- The system SHALL use `America/New_York` regular session only (09:30-16:00).
- The system SHALL use a fixed watchlist configured by environment or configuration file.

### 6.5 Ingest Source
- The v1 ingest source SHALL be a mock test stream client suitable for local testing.
- The ingest contract SHALL remain compatible with future real provider adapters.

### 6.6 Performance
- The system SHALL publish snapshots at a nominal 1-second cadence while open.
- The system SHALL sustain watchlist processing for at least 100 symbols without violating snapshot cadence under nominal local deployment.

### 6.7 Security
- WebSocket endpoints SHALL be protected by deployment-layer controls in production environments.
- The v1 local-development profile MAY run without authentication.

### 6.8 Prohibited Approaches
- The system SHALL NOT implement delta-only client update protocol in v1.
- The system SHALL NOT couple ingest contract to a single market data vendor schema beyond the normalized tick format.

## 7. Data Model
- `Tick`
  - Required: `timestamp` (instant), `symbol` (non-empty uppercase string), `price` (positive decimal), `volume` (non-negative integer)
- `Candle`
  - Required: `startTs`, `endTs`, `open`, `high`, `low`, `close`, `volume`
  - Invariants: `high >= max(open, close, low)`, `low <= min(open, close, high)`, `volume >= 0`
- `SymbolSessionState`
  - Required: `symbol`, `openPrice` (nullable until set), `lastPrice`, `lastTickTs`, `candlesByRange`
- `RankEntry`
  - Required: `symbol`, `openPrice`, `lastPrice`, `pctChange`
- `DashboardSnapshot`
  - Required: `asOf`, `sessionStatus`, `gainers`, `losers`
  - Invariants: `gainers` length <= 5, `losers` length <= 5, no duplicate symbol across same list

## 8. External Interfaces
- Tick ingest interface
  - Input: normalized `Tick` events
  - Output: accepted/rejected processing result

- WebSocket snapshot broadcast
  - Transport: WebSocket
  - Topic: broadcast channel for dashboard snapshots
  - Message schema:
    - `asOf`
    - `sessionStatus`
    - `gainers[]` and `losers[]`
    - each card includes `symbol`, `ranges`, `candles`, `yAxisLabels`, `xAxisLabels`, `buyLabel`, `shortLabel`

- Health interface
  - Output: ingest stream status and snapshot freshness status

## 9. State Transitions
- Session state transitions SHALL be:
  - `PRE_OPEN -> OPEN` at 09:30:00 ET
  - `OPEN -> CLOSED` at 16:00:00 ET
  - `CLOSED -> PRE_OPEN` outside regular session window
- A symbol open-price state SHALL transition:
  - `UNSET -> SET` on first valid in-session tick
  - `SET -> UNSET` only during next-session reset
- Candle buffers SHALL transition by append-and-evict behavior, keeping max 30 candles per range.

## 10. Error Handling
- Invalid tick payload
  - Trigger: missing/invalid required field
  - Response: reject event
  - Observability: increment invalid-tick metric and structured log

- Unknown symbol
  - Trigger: tick symbol not in watchlist
  - Response: ignore event
  - Observability: increment dropped-symbol metric

- Out-of-session tick
  - Trigger: session state not `OPEN`
  - Response: ignore event
  - Observability: increment out-of-session metric

- Redis write/read failure
  - Trigger: Redis operation failure
  - Response: retry with bounded backoff; expose degraded health if retries exhausted
  - Observability: error log, retry counter, health signal update

- Ingest stream disconnected
  - Trigger: stream transport failure
  - Response: reconnect loop; keep last snapshot until stale threshold
  - Observability: ingest connectivity metric and warning logs

## 11. Edge Cases
- Symbol receives no tick after open: symbol SHALL remain unranked.
- Symbol receives one tick only: candles SHALL still be valid with open/high/low/close equal.
- Ticks exactly at boundary timestamps SHALL be bucketed deterministically to one interval.
- Duplicate ticks with same timestamp and values SHALL NOT violate candle invariants.
- Session open on new day with stale Redis data SHALL trigger full intraday reset before processing ticks.

## 12. Non-Functional Requirements
- Reliability: The system SHALL preserve session data across process restarts using Redis.
- Availability: Snapshot publishing loop SHALL continue independently of individual symbol data gaps.
- Scalability: Processing SHALL support fixed watchlist growth to at least 100 symbols.
- Observability: The system SHALL emit metrics for tick throughput, dropped ticks, ranking latency, snapshot cadence, and Redis failures.
- Maintainability: Ingest source SHALL be replaceable through a normalized tick contract without changing downstream requirements.

## 13. Acceptance Criteria
- AC1: With valid ticks for watchlist symbols during open session, snapshots are broadcast every second.
- AC2: Each snapshot contains up to 5 gainers and up to 5 losers ranked by percent change from market-open price.
- AC3: Each symbol card includes exactly 30 candles for each configured range.
- AC4: Price axis labels are formatted with exactly two decimals.
- AC5: Time axis labels are formatted in 24-hour format.
- AC6: Restarting backend during open session preserves current intraday state from Redis.
- AC7: At next session open, prior day state is cleared and open prices are reacquired.
- AC8: Ticks for unknown symbols are ignored and counted in observability metrics.

## 14. Test Scenarios
1. Precondition: Session is open and watchlist contains symbols with tick flow.
Action: Stream ticks for at least 60 seconds.
Expected outcome: Snapshots are published each second with updated candles and rankings.

2. Precondition: Session is open and one symbol has no open-price tick.
Action: Publish snapshots.
Expected outcome: Symbol is excluded from gainers/losers until open price is set.

3. Precondition: Redis contains active-session state.
Action: Restart backend process.
Expected outcome: Subsequent snapshots continue from preserved state without resetting candles.

4. Precondition: Session time passes from 15:59:59 ET to 16:00:00 ET.
Action: Continue ingest input.
Expected outcome: New ticks are ignored for ranking/candle updates after close.

5. Precondition: Redis contains prior session state before next day open.
Action: Reach 09:30:00 ET and process first new tick.
Expected outcome: Prior state is cleared and new session open prices/candles are initialized.

6. Precondition: Tick payload is malformed.
Action: Submit malformed tick.
Expected outcome: Tick is rejected, invalid-tick metric increments, and processing continues.
