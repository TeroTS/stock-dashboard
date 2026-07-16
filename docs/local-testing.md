# Local Testing

## Purpose
This runbook covers a simple end-to-end local check of the stock dashboard using the real frontend, real backend, real HTTP command endpoints, and the real websocket snapshot feed.

## Prerequisites
- Docker
- Docker Compose
- `MASSIVE_API_KEY`

## Start the Stack

```bash
export MASSIVE_API_KEY='your-api-key'
./scripts/run-local
```

## Verify Services

```bash
docker compose ps
```

```bash
curl http://localhost:8080/health
```

Expected:
- frontend is reachable at `http://localhost:5173`
- backend health returns `{"status":"ok"}`

## Manual End-to-End Check
1. Open `http://localhost:5173`.
2. Confirm the page loads without a blank screen.
3. Confirm the status badge moves through `Connected` and then to `Live` once a snapshot arrives.
4. Confirm `Updated:` changes when new snapshots arrive.
5. Confirm stock cards appear for symbols without active transactions.
6. Click `Buy` or `Short` on one stock card.
7. Confirm the symbol disappears from the stock grid and appears in the transaction grid as `PENDING_OPEN`.
8. Wait for the next accepted update for that symbol.
9. Confirm the transaction becomes `OPEN`.
10. Click `Sell` or `Cover`.
11. Confirm the transaction becomes `PENDING_CLOSE`, then `CLOSED` on the next accepted update for that symbol.
12. For a pending open transaction, confirm the cancel button removes the transaction and returns the symbol to the stock grid.

## Useful Logs

```bash
docker compose logs -f backend frontend
```

## Stop the Stack

```bash
docker compose down --remove-orphans
```

## Related Docs
- Running: [docs/running.md](./running.md)
- Operations: [docs/operations.md](./operations.md)
- Contracts: [docs/contracts.md](./contracts.md)
