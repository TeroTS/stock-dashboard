# Local End-to-End Testing (Docker Compose)

This project can be run locally with Docker Compose using three services:

- `redis` (state storage)
- `backend` (Spring Boot realtime feed)
- `frontend` (Vite app)

Optional observability profile:
- `prometheus` (metrics scraping)
- `grafana` (dashboards)

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Open ports `5173`, `8080`, and `6379`

## Start the stack

From repository root:

```bash
docker compose up --build -d
```

With observability stack:

```bash
docker compose --profile observability up --build -d
```

## Verify services

```bash
docker compose ps
```

Expected:

- `stock-dashboard-frontend` is `Up` on `0.0.0.0:5173->5173`
- `stock-dashboard-backend` is `Up` on `0.0.0.0:8080->8080`
- `stock-dashboard-redis` is `Up` on `0.0.0.0:6379->6379`

Backend health check:

```bash
curl http://localhost:8080/actuator/health
```

Prometheus endpoint check:

```bash
curl http://localhost:8080/actuator/prometheus | rg "pipeline_(ticks|snapshots|redis_ops|ingest_last_seen_age_seconds|snapshot_last_published_age_seconds|watchlist_size|redis_degraded)"
```

## Manual E2E test flow

1. Open `http://localhost:5173` in browser.
2. Confirm dashboard loads with 10 stock cards.
3. Confirm status badge is `Live`.
4. Confirm metadata line (`Updated: ... • Session: OPEN`) changes every few seconds.
5. Confirm no frontend hard-failure (blank screen/crash) when refreshing.

## Why status should be `Live` in Docker setup

Compose sets backend session window to full-day for local testing:

- `MARKET_SESSION_OPEN=00:00`
- `MARKET_SESSION_CLOSE=23:59`

This ensures realtime updates are available any time you test locally.

## View logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f redis
```

Observability services:

```bash
docker compose --profile observability logs -f prometheus
docker compose --profile observability logs -f grafana
```

URLs:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (`admin` / `admin`)

## Stop and clean up

Stop services:

```bash
docker compose down
```

Stop and also remove volumes:

```bash
docker compose down -v
```
