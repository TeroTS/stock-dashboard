## Why

The backend currently exposes basic health and partial counters, but lacks a cohesive observability baseline for realtime pipeline operations. This makes it difficult to diagnose ingest drops, publish failures, and Redis instability quickly in local and production-like environments.

## What Changes

- Add structured backend logging with stable event keys for pipeline and Redis retry paths.
- Add Prometheus metrics export endpoint and custom pipeline metric series for ticks, snapshots, freshness, and Redis operations.
- Add local observability runtime profile in Docker Compose with Prometheus and Grafana.
- Add operator-facing docs for metrics, logs, and troubleshooting workflow.

## Capabilities

### Modified Capabilities
- `realtime-stock-dashboard-feed`: backend now exposes structured logs and Prometheus metrics for realtime feed reliability and diagnostics.

## Impact

- Backend runtime configuration (`application.yaml`) and dependencies (`pom.xml`).
- Backend service instrumentation in ingest, snapshot publishing, and Redis retry execution.
- Docker Compose profile and infra config for local observability tooling.
- Documentation updates for local testing and operations.
