# Backend Operations Notes

## Logging

Backend logs are emitted in structured JSON format on stdout.

Key event fields:
- `event`
- `symbol` (when relevant)
- `sessionState` (when relevant)
- exception details for failures

Default data policy:
- Do not log raw tick/snapshot payload bodies.
- Log bounded metadata only (event keys and identifiers).

## Metrics

Local profile (`spring.profiles.default=local`) endpoint:
- `GET /actuator/prometheus`

Health endpoint:
- `GET /actuator/health`

Production profile (`SPRING_PROFILES_ACTIVE=prod`) defaults:
- exposed actuator endpoints: `health`, `info`
- `/actuator/prometheus` is not exposed unless explicitly reconfigured
- health details are hidden (`management.endpoint.health.show-details=never`)

Core custom metrics:
- `pipeline_ticks_total{symbol,result}`
- `pipeline_tick_process_duration_seconds{result,...}`
- `pipeline_snapshots_total{result}`
- `pipeline_snapshot_build_duration_seconds{...}`
- `pipeline_snapshot_publish_duration_seconds{...}`
- `pipeline_redis_ops_total{operation,result}`
- `pipeline_ingest_last_seen_age_seconds`
- `pipeline_snapshot_last_published_age_seconds`
- `pipeline_watchlist_size`
- `pipeline_redis_degraded`

## Local observability stack

Start:

```bash
docker compose --profile observability up --build -d
```

Access:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Cross-Origin Policy

Backend CORS and WebSocket origin checks are allowlist-driven via:
- `APP_SECURITY_ALLOWED_ORIGINS`

Behavior:
- if unset, cross-origin browser calls are denied by default
- if set, only listed origins can access `/api/**` and `ws://.../ws/dashboard`

## Troubleshooting checklist

1. Check backend health:
```bash
curl http://localhost:8080/actuator/health
```

2. Check Prometheus scrape data exists:
```bash
curl http://localhost:8080/actuator/prometheus | rg pipeline_
```
Note: this applies to local/default profile; prod profile hides this endpoint unless explicitly enabled.

3. Check backend logs for structured failure events:
- `tick_processing_failed`
- `snapshot_publish_failed`
- `redis_operation_retry`
- `redis_operation_failed`
- `redis_operation_recovered`

4. Validate Redis degradation signal:
- `pipeline_redis_degraded` should be `1` during retry exhaustion and return to `0` after recovery.
