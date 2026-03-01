## MODIFIED Requirements

### Requirement: Tick Ingestion and Validation
The system SHALL accept tick events containing `timestamp`, `symbol`, `price`, and `volume`, and SHALL process only ticks for symbols in the configured watchlist during open session.

#### Scenario: Track ingest outcomes by result
- **WHEN** the system processes a tick attempt
- **THEN** it records an observability metric for tick result (`accepted`, `invalid`, `dropped_symbol`, `dropped_session`, or `redis_failed`) with bounded symbol labels

### Requirement: Snapshot Broadcast Cadence
The system SHALL publish full dashboard snapshots over WebSocket every second while session is open, and the dashboard frontend SHALL consume and render these snapshots in near-real-time.

#### Scenario: Track snapshot publish outcomes
- **WHEN** the publisher executes on cadence
- **THEN** it records snapshot observability outcomes (`published`, `skipped`, or `error`) and publish timing metrics

### Requirement: Redis Intraday Persistence
The system SHALL persist active-session state in Redis so backend restarts do not lose intraday candles, open prices, or latest prices.

#### Scenario: Track Redis operation retries and failures
- **WHEN** Redis operations are executed with retry semantics
- **THEN** the system records operation-level success/failure metrics and structured retry/failure logs

## ADDED Requirements

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
