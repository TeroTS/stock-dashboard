## Context

Backend snapshot publishing is complete and archived under the realtime feed capability. Frontend still renders static `STOCK_CARDS`, which creates a product gap.

The backend currently exposes a STOMP broker endpoint (`/ws/dashboard`) and publishes full snapshots to `/topic/dashboard-snapshots` every second during open session.

## Goals / Non-Goals

**Goals:**
- Consume realtime snapshots from backend without changing backend protocol.
- Map snapshot payloads into current stock-card and candlestick UI model.
- Maintain frontend usability when live feed disconnects.
- Expose clear status for live/reconnecting/fallback states.
- Add automated frontend tests around mapping and connection behavior.

**Non-Goals:**
- Backend protocol redesign (no raw websocket conversion).
- Authentication/authorization changes.
- Visual redesign of card layout and chart style.

## Decisions

1. **Keep STOMP protocol on frontend**
   - Decision: Use `@stomp/stompjs` client and subscribe to backend topic.
   - Rationale: Compatible with current Spring WebSocket broker setup; avoids backend refactor.

2. **Live-first with static fallback**
   - Decision: Render static data immediately, replace with live snapshots when available, and fallback on prolonged disconnect.
   - Rationale: Preserves UX continuity and avoids blank dashboard states.

3. **Dedicated mapping layer**
   - Decision: Convert backend snapshot DTOs to existing `StockCardModel` using a pure mapper function.
   - Rationale: Keeps UI components unchanged and isolates protocol/UI translation logic.

4. **Hook-based feed integration**
   - Decision: Introduce `useDashboardFeed` to encapsulate client lifecycle and state transitions.
   - Rationale: Keeps `StockDashboard` component simple and testable.

## Data Flow

1. `StockDashboard` calls `useDashboardFeed()`.
2. Hook creates STOMP client (`createDashboardFeedClient`) and connects.
3. Incoming snapshot message is parsed and mapped via `mapSnapshotToStockCards`.
4. Hook updates cards + metadata and marks status `live`.
5. On disconnect, hook sets status `reconnecting` and schedules transition to `fallback` after timeout.

## Risks / Trade-offs

- **Risk:** Stomp reconnect churn may emit repeated disconnect events.
  - **Mitigation:** Hook-level fallback timer is idempotent and reset on snapshot.
- **Risk:** Snapshot candle scale can vary with low-volatility ranges.
  - **Mitigation:** Mapper enforces minimum drawable height and bounded scaling.
- **Risk:** Malformed payloads can break runtime updates.
  - **Mitigation:** Client JSON parsing is guarded; invalid messages are ignored.

## Migration Plan

1. Add frontend live-feed modules (`live/` directory) and tests.
2. Update `StockDashboard` to consume hook output instead of static-only cards.
3. Add runtime status UI and metadata line.
4. Validate with lint/build/tests.

## Rollback Plan

- Revert frontend to static `STOCK_CARDS` rendering.
- Keep backend unchanged.
