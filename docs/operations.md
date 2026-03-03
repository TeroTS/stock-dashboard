# Operations Runbook

## Startup Dependencies and Ordering
Recommended startup order:
1. State store (Redis)
2. Backend realtime feed service
3. Frontend dashboard
4. Optional observability stack (Prometheus/Grafana)

With Docker Compose this order is handled automatically (`backend` depends on Redis health, `frontend` depends on backend).

## Configuration Surfaces
Backend runtime config sources:
- [backend/src/main/resources/application.yaml](../backend/src/main/resources/application.yaml)
- [backend/src/main/resources/application-local.yaml](../backend/src/main/resources/application-local.yaml)
- [backend/src/main/resources/application-prod.yaml](../backend/src/main/resources/application-prod.yaml)

Key backend environment/config fields:
- `SPRING_DATA_REDIS_HOST`, `SPRING_DATA_REDIS_PORT`
- `MARKET_SESSION_OPEN`, `MARKET_SESSION_CLOSE`
- `market.watchlist`
- `market.snapshot-cadence-ms`
- `market.ingest-health-threshold-ms`
- `market.redis.max-retries`
- `APP_SECURITY_ALLOWED_ORIGINS`

Frontend runtime config fields:
- `VITE_WS_URL`
- `VITE_WS_TOPIC`
- `VITE_API_BASE_URL`
- `VITE_OBSERVABILITY_ENABLED`
- `VITE_OBSERVABILITY_PROVIDER`
- `VITE_OBSERVABILITY_CONSOLE`
- `VITE_APP_VERSION`

## Logging
Backend emits structured logs to stdout.

Expected structured fields:
- `event`
- `symbol` (when relevant)
- `sessionState` (when relevant)
- exception metadata for failures/retries

Safety policy:
- Do not log raw tick or snapshot bodies.
- Log bounded identifiers and event metadata only.

Common event keys:
- `tick_processing_failed`
- `snapshot_publish_failed`
- `redis_operation_retry`
- `redis_operation_failed`
- `redis_operation_recovered`

## Health and Metrics
Health endpoint:
- `GET /actuator/health`

Profile-specific actuator behavior:
- Local/default profile exposes `health`, `metrics`, `info`, `prometheus`.
- Prod profile defaults to `health`, `info` only and hides health details.

Core custom metric families:
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

Optional local observability stack:

```bash
docker compose --profile observability up --build -d
```

Access URLs:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Failure Modes and Recovery Tips
1. Redis degraded or unavailable
- Signal: `pipeline_redis_degraded=1`, retry/failure events in logs.
- Checks: verify Redis reachability, credentials/network, retry settings.
- Recovery: restore Redis connectivity; degraded signal should return to `0`.

2. No snapshot updates while session expected OPEN
- Signal: stale `pipeline_snapshot_last_published_age_seconds` or no topic updates.
- Checks: session window config/timezone, tick ingest freshness, backend logs.
- Recovery: correct session config and feed input; verify publisher resumes.

3. Ticks dropped unexpectedly
- Signal: elevated `pipeline_ticks_total{result="invalid|dropped_symbol|dropped_session"}`.
- Checks: payload validity, watchlist membership, session state.
- Recovery: fix producer payload or watchlist/session config.

4. Browser transaction calls blocked
- Signal: browser CORS/origin failures or preflight rejection.
- Checks: `APP_SECURITY_ALLOWED_ORIGINS` includes dashboard origin.
- Recovery: update allowlist and redeploy backend config.

## What To Check First (Troubleshooting Checklist)
1. Backend health:

```bash
curl http://localhost:8080/actuator/health
```

2. Pipeline metrics availability (local/default profile):

```bash
curl http://localhost:8080/actuator/prometheus | rg pipeline_
```

3. Active logs for failure/retry events:

```bash
docker compose logs -f backend
```

4. Stream/API boundary reachability:
- WebSocket endpoint: `ws://localhost:8080/ws/dashboard`
- WebSocket topic: `/topic/dashboard-snapshots`
- Transactions API: `POST /api/transactions`

## Related Documentation
- Architecture: [docs/architecture.md](./architecture.md)
- Data models: [docs/data-models.md](./data-models.md)
- Local run commands: [docs/running.md](./running.md)
- Compose-based local test flow: [docs/local-testing.md](./local-testing.md)
