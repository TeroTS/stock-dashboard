# Current Slice

Status: done

## Slice Goal
- Start the app locally with backend-driven mock snapshots over a plain WebSocket.

## Stories In Scope
- `US-01 Local mock-backed dashboard startup`
- Exception: `US-02 Plain WebSocket snapshot stream` is included because mock startup is not user-visible without the snapshot surface.

## Stories Completed In This Slice
- `US-01 Local mock-backed dashboard startup`
- `US-02 Plain WebSocket snapshot stream`

## Stories Remaining In This Slice
- None.

## Contract Inputs
- `openapi.yaml` `/health`
- `docs/contracts.md` Contract 1: Dashboard Snapshot Stream
- `docs/contracts.md` Contract 2: Aggregate Update Input

## Decision Inputs
- None.

## Shared State Required Now
- In-memory watchlist symbol state with latest close, official open price, percent change, and up to 300 line points.
- Snapshot generation time and connected WebSocket clients.
- Frontend connection status and full-snapshot replacement state.

## Operations / Endpoints / Surfaces In This Slice
- `GET /health`
- `GET /ws`
- Frontend dashboard live feed connection and snapshot rendering shell

## Tests Required
- Backend test proving `/health` still works.
- Backend WebSocket test proving clients receive full snapshots from mock updates.
- Backend test proving mock mode is the default startup path.
- Frontend test proving the feed client uses plain WebSocket and parses snapshots.
- Frontend test proving the dashboard renders snapshot-driven cards and updated time.

## Not Now
- `US-03 Ranked stock cards with one line chart`
- `US-04 Open transaction enters pending state immediately`
- Massive provider integration.

## Done When
- Backend starts in mock mode by default without external credentials.
- Backend emits accepted mock updates for the watchlist and publishes full JSON snapshots on `/ws`.
- Frontend connects with plain browser WebSocket behavior and replaces local state from each snapshot.
- Local tests covering the foundation flow pass.

## Completion Summary
- Backend now starts in `mock` mode by default, generates in-memory watchlist updates, and publishes full snapshot payloads on `/ws`.
- Frontend now connects with plain browser WebSocket behavior and replaces dashboard state from each full snapshot.
- Root setup/verify scripts now work with the Python backend package install path used by this rewrite.

## Next Slice Recommendation
- `US-03 Ranked stock cards with one line chart`
- Keep `US-04 Open transaction enters pending state immediately` and `US-05 Pending open fills on the next symbol update` in view because the stock-card surface now feeds the first transaction actions.
