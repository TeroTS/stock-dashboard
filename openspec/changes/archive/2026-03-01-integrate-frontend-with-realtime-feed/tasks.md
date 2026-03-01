## 1. Frontend Feed Integration

- [x] 1.1 Add STOMP client dependency and frontend test tooling for live-feed behavior.
- [x] 1.2 Add live-feed DTO types, mapping layer, and connection-state reducer.
- [x] 1.3 Add dashboard feed client for `/ws/dashboard` with topic subscription to `/topic/dashboard-snapshots`.
- [x] 1.4 Add `useDashboardFeed` hook to manage lifecycle, live updates, reconnecting, and fallback timeout.

## 2. Dashboard UI Consumption

- [x] 2.1 Update `StockDashboard` to render cards from live hook output.
- [x] 2.2 Add connection-status indicator (`Live`, `Reconnecting`, `Fallback`).
- [x] 2.3 Add last-updated and session metadata display.

## 3. Verification

- [x] 3.1 Add unit tests for snapshot mapping and connection-state transitions.
- [x] 3.2 Add hook tests for fallback startup, snapshot promotion to live, and disconnect transition handling.
- [x] 3.3 Add dashboard component test for status + live card rendering.
- [x] 3.4 Run frontend `pnpm test`, `pnpm lint`, and `pnpm build` successfully.
