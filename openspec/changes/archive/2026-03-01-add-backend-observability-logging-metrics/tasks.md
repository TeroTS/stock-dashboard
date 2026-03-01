## 1. Backend Metrics and Logging

- [x] 1.1 Add Prometheus registry dependency and expose `/actuator/prometheus`.
- [x] 1.2 Add `PipelineObservability` abstraction and Micrometer-backed implementation.
- [x] 1.3 Instrument tick ingestion outcomes, tick duration, and dropped-path counters.
- [x] 1.4 Instrument snapshot publish outcomes and build/publish durations.
- [x] 1.5 Instrument Redis retry operations with operation/result labels.
- [x] 1.6 Add structured event-key logging for retry/failure paths.

## 2. Local Observability Stack

- [x] 2.1 Add Prometheus service to Compose `observability` profile.
- [x] 2.2 Add Grafana service and provisioning files (datasource + dashboard).
- [x] 2.3 Add baseline dashboard panels for tick rate, snapshot rate, freshness age, and redis degradation.

## 3. Verification and Docs

- [x] 3.1 Add backend test for `/actuator/prometheus` and custom metric presence.
- [x] 3.2 Update local testing guide with observability profile commands.
- [x] 3.3 Add operations runbook for metrics/logging checks and troubleshooting.
- [x] 3.4 Run backend tests and validate OpenSpec change.
