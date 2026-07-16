# Running

## Prerequisites
- Node.js 22+
- `pnpm`
- Python 3.12+
- `uv`
- Docker
- Docker Compose
- `MASSIVE_API_KEY`

## Recommended Local Start
Set up host dependencies once:

```bash
./scripts/setup
```

Start the app with Docker Compose through the repo script:

```bash
export MASSIVE_API_KEY='your-api-key'
./scripts/run-local
```

Stop the stack from another terminal:

```bash
docker compose down --remove-orphans
```

## Access URLs
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/health`
- Backend websocket: `ws://localhost:8080/ws`
- Backend command API base: `http://localhost:8080`

## Verification
Run the full repo verification path:

```bash
./scripts/verify
```

Useful direct checks:

```bash
curl http://localhost:8080/health
```

```bash
docker compose logs -f backend frontend
```

## Runtime Inputs
Backend:
- `MASSIVE_API_KEY`
- `backend/watchlist.txt`

Frontend local defaults from Compose:
- `VITE_WS_URL=ws://localhost:8080/ws`
- `VITE_API_BASE_URL=http://localhost:8080`

## Common First-Run Troubleshooting
### Backend exits immediately
- Check that `MASSIVE_API_KEY` is set in the shell where you ran `./scripts/run-local`.
- Check backend logs:

```bash
docker compose logs backend
```

### Frontend loads but stays in `Fallback`
- Wait for the first eligible provider update.
- Check backend health:

```bash
curl http://localhost:8080/health
```

- Check websocket and feed logs:

```bash
docker compose logs -f backend
```

### Commands do nothing in the UI
- Confirm the frontend can reach `http://localhost:8080`.
- Check backend logs for `404`, `409`, or `422` command rejections.
- Remember the websocket snapshot remains authoritative after command failures.

### Wrong symbols or no symbols
- Check `backend/watchlist.txt`.
- Blank lines are ignored and duplicate symbols are removed after uppercase normalization.

### Port conflicts
- Free ports `5173` and `8080`, then restart `./scripts/run-local`.

## Related Docs
- Architecture: [docs/architecture.md](./architecture.md)
- Operations: [docs/operations.md](./operations.md)
- Local testing: [docs/local-testing.md](./local-testing.md)
- Contracts: [docs/contracts.md](./contracts.md)
