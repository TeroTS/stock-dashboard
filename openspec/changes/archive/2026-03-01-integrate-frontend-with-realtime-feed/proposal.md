## Why

The backend now publishes realtime dashboard snapshots, but the frontend still renders static seed data. This prevents users from seeing live gainers/losers and session updates.

## What Changes

- Add frontend WebSocket feed integration using STOMP over `/ws/dashboard`.
- Subscribe to `/topic/dashboard-snapshots` and map snapshot payloads into existing `StockCardModel` UI cards.
- Add connection-status UX (`Live`, `Reconnecting`, `Fallback`) and last-updated metadata.
- Keep static seed cards as automatic fallback when connection is unavailable.
- Add frontend tests for snapshot mapping, connection-state transitions, hook behavior, and dashboard rendering with live state.

## Capabilities

### Modified Capabilities
- `realtime-stock-dashboard-feed`: Dashboard frontend now consumes and renders realtime snapshot payloads published by the backend.

## Impact

- Affects `frontend/` React app data flow and runtime dependencies.
- Introduces STOMP client dependency for WebSocket topic subscription.
- Adds Vitest + React Testing Library to verify live/fallback behavior.
