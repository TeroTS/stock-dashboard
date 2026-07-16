# Operations

## Startup Dependencies and Ordering
High-level startup order:
1. Ensure `MASSIVE_API_KEY` is available to the backend runtime.
2. Start the backend service.
3. Start the frontend service.
4. Wait for the first eligible provider update to move the UI from `connected` to `live`.

Recommended local path:

```bash
export MASSIVE_API_KEY='your-api-key'
./scripts/run-local
```

## Configuration Surfaces
### Backend
- Environment:
  - `MASSIVE_API_KEY`
- Repo-owned file input:
  - `backend/watchlist.txt`
- Local container wiring:
  - `docker-compose.yml`

### Frontend
- `VITE_WS_URL`
- `VITE_API_BASE_URL`
- Local container wiring in `docker-compose.yml`

### Contract sources
- HTTP commands: [openapi.yaml](../openapi.yaml)
- Websocket snapshots and provider updates: [docs/contracts.md](./contracts.md)

## Logging and Monitoring Pointers
Backend logs are the primary operational signal.

Common backend event keys:
- `massive_feed_start`
- `massive_feed_subscribe`
- `massive_feed_connect`
- `massive_feed_message`
- `transaction_open`
- `transaction_open_fill`
- `transaction_close`
- `transaction_close_fill`
- `transaction_open_cancel`

Useful log commands:

```bash
docker compose logs -f backend
```

```bash
docker compose logs -f frontend
```

Quick health check:

```bash
curl http://localhost:8080/health
```

## Failure Modes and Recovery Tips
### Missing API key
- Symptom: backend fails during startup.
- Check: backend logs show missing credential startup failure.
- Recovery: export `MASSIVE_API_KEY` and restart the stack.

### Provider connection stops or never becomes live
- Symptom: UI stays `Connected`, `Reconnecting`, or `Fallback`.
- Check: backend logs for feed connection warnings; frontend logs for websocket reconnects.
- Recovery: verify provider credential validity, network reachability, and wait for the next eligible provider update.

### Invalid transaction commands
- Symptom: button click has no visible local effect.
- Check: backend logs for `transaction_open`, `transaction_close`, or `transaction_open_cancel` rejections.
- Recovery: treat the next websocket snapshot as authoritative; rejected commands do not mutate frontend local state.

### Empty stock grids
- Symptom: frontend is healthy but cards do not appear.
- Check: watchlist contents, provider updates, and whether symbols are currently hidden by active transactions.
- Recovery: verify `backend/watchlist.txt`, then confirm provider updates are arriving for those symbols.

### State disappears after restart
- Symptom: prior transactions and price history are gone.
- Check: whether the backend process restarted.
- Recovery: none in v1; runtime state is intentionally in-memory only.

## What to Check First
1. Stack is up:

```bash
docker compose ps
```

2. Backend health:

```bash
curl http://localhost:8080/health
```

3. Backend logs:

```bash
docker compose logs --tail=200 backend
```

4. Frontend logs:

```bash
docker compose logs --tail=200 frontend
```

5. Current watchlist input:

```bash
sed -n '1,40p' backend/watchlist.txt
```

6. Contract surfaces:
- websocket: `ws://localhost:8080/ws`
- command API: `http://localhost:8080/api/transactions`

## Related Docs
- Architecture: [docs/architecture.md](./architecture.md)
- Data model: [docs/data-models.md](./data-models.md)
- Running: [docs/running.md](./running.md)
