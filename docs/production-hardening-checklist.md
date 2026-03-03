# Production Hardening Checklist

## Backend profile and exposure

- [ ] `SPRING_PROFILES_ACTIVE=prod` is set in production runtime.
- [ ] `/actuator/prometheus` is not publicly exposed.
- [ ] `/actuator/health` does not leak component details.

## Origin controls

- [ ] `APP_SECURITY_ALLOWED_ORIGINS` is explicitly configured.
- [ ] Browser requests from non-allowlisted origins are rejected for `/api/**`.
- [ ] WebSocket handshakes from non-allowlisted origins are rejected for `/ws/dashboard`.

## Configuration safety

- [ ] Market configuration values are valid:
  - positive `market.snapshot-cadence-ms`
  - positive `market.ingest-health-threshold-ms`
  - positive `market.redis.max-retries`
  - non-empty watchlist
  - `market.session.open < market.session.close`
- [ ] Service startup fails fast on invalid configuration.

## Frontend production hosting contract

- [ ] Deep-link SPA routes fallback to the app entry document.
- [ ] Hashed static assets are served with long cache headers.
- [ ] App entry document (`index.html`) is served with no-cache/revalidation semantics.
