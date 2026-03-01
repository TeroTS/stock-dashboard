## Overview

Introduce a dedicated backend observability layer that standardizes metric emission and keeps instrumentation logic out of core business classes. The layer records tick outcomes, snapshot outcomes, operation timing, freshness gauges, and Redis operation success/failure.

## Design Decisions

### 1. Central observability abstraction

- Add `PipelineObservability` interface to decouple business logic from meter implementation details.
- Add `MeteredPipelineObservability` component as Micrometer-backed implementation.
- Preserve test-friendly constructors by using a no-op implementation outside Spring wiring.

### 2. Metric cardinality controls

- Bound `symbol` labels to watchlist symbols only; unknown symbols map to `UNKNOWN`.
- Use fixed `result` enums for tick/snapshot counters.
- Use fixed operation names for Redis store operations.

### 3. Structured logging

- Emit event-keyed logs for failure/retry paths using SLF4J key-value fields:
  - `tick_processing_failed`
  - `snapshot_publish_failed`
  - `redis_operation_retry`
  - `redis_operation_failed`
  - `redis_operation_recovered`
- Keep payload bodies out of logs by default.

### 4. Local observability runtime

- Expose `/actuator/prometheus`.
- Add Compose `observability` profile for Prometheus and Grafana.
- Provision Prometheus scrape and Grafana data source/dashboard from repo files.

## Risks and Mitigations

- **Risk**: log volume increase in hot loop.
  - **Mitigation**: keep accepted-path logging minimal; structured logs focus on retry/failure paths.
- **Risk**: metric overhead.
  - **Mitigation**: use low-cost counters/timers and bounded labels.
- **Risk**: Redis outage noise.
  - **Mitigation**: capture retries with explicit operation names for fast triage.
