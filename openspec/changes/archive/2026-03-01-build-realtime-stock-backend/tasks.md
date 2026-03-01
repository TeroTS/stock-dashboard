## 1. Backend Bootstrap

- [x] 1.1 Initialize Spring Boot 3 service in `backend/` with Java 21 and baseline dependencies (`websocket`, `actuator`, `data-redis`, `validation`, test stack).
- [x] 1.2 Add configuration model for fixed watchlist, session timezone/window, and snapshot cadence.
- [x] 1.3 Add local runtime wiring for Redis connection and profile-based mock ingest enablement.

## 2. Domain Model and Validation

- [x] 2.1 Implement normalized tick model with field validation for `timestamp`, `symbol`, `price`, and `volume`.
- [x] 2.2 Implement candle/range domain models and invariants for OHLCV updates.
- [x] 2.3 Implement snapshot payload models for top gainers/losers and card chart fields.

## 3. Session and State Management

- [x] 3.1 Implement session state evaluator for `America/New_York` regular session boundaries.
- [x] 3.2 Implement daily reset logic that clears prior-day intraday state at open.
- [x] 3.3 Implement Redis repositories for symbol open price, latest price, and rolling candles.

## 4. Ingest and Aggregation Pipeline

- [x] 4.1 Implement mock stream client that emits normalized ticks for the configured watchlist.
- [x] 4.2 Implement ingest processor that filters unknown symbols and out-of-session ticks.
- [x] 4.3 Implement 30-bucket rolling aggregation for `10s`, `60s`, and `240s` intervals.
- [x] 4.4 Implement market-open price capture on first valid in-session tick per symbol.

## 5. Ranking and Snapshot Delivery

- [x] 5.1 Implement percent-change ranking from market-open price and produce top 5 gainers/losers.
- [x] 5.2 Implement snapshot assembler that emits full dashboard payload every second during open session.
- [x] 5.3 Implement WebSocket broadcast endpoint/topic for snapshot publication.

## 6. Observability and Failure Handling

- [x] 6.1 Implement health indicators for ingest connectivity and snapshot freshness.
- [x] 6.2 Implement metrics/logging for invalid ticks, dropped symbols, Redis retry/failure, and snapshot cadence.
- [x] 6.3 Implement bounded retry and degraded-state handling for Redis operation failures.

## 7. Verification

- [x] 7.1 Add unit tests for session boundary handling, candle bucketing, rolling eviction, open-price capture, and ranking.
- [x] 7.2 Add integration tests with Redis (Testcontainers) for restart persistence and new-session reset behavior.
- [x] 7.3 Add WebSocket contract tests to verify 1-second snapshot delivery and required payload fields/formatting.
