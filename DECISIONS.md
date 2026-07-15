# Python Backend Rewrite for Stock Dashboard Decisions

Status: Draft v1

## Problem Summary
The current backend is a Spring Boot + Redis + STOMP service built around rolling candles, session windows, and optional Prometheus/Grafana observability. The rewrite replaces it with a much simpler local-first Python backend using Massive 1-second stock aggregates, in-memory state, plain WebSocket snapshots, and HTTP transaction commands, while updating the frontend to accept a breaking contract.

## Goals and Success Criteria
- Replace the backend with Python 3.12 + FastAPI.
- Use Massive 1-second aggregate data for all backend runtime environments.
- Keep the dashboard focused on top 5 gainers and top 5 losers from a configured watchlist.
- Replace candle/range-based chart data with a single close-price line series.
- Implement transactions in the Python backend, including pending-next-tick fills.
- Remove Redis, Prometheus, Grafana, STOMP, session-state logic, and market-hours gating.
- Publish full dashboard snapshots over plain WebSocket whenever relevant state changes.
- Keep the frontend as a snapshot-driven UI with HTTP used only for transaction commands.

## Primary Roles / Actors
- Dashboard user viewing live gainers/losers and managing transactions.
- Developer running the system locally with Massive feed access.
- Massive websocket feed producing symbol aggregates.

## Non-Goals
- Persistence across backend restarts.
- Redis-backed state or transaction storage.
- Prometheus, Grafana, or actuator-style observability surfaces.
- STOMP or topic-based websocket protocols.
- Multi-window time-range charts.
- Volume bars.
- Candlestick charts.
- Separate HTTP read APIs for transactions.
- Market-session windows, daily reset logic, or synthetic session-state output.

## Locked Decisions

### Product / Scope
- The backend rewrite may break existing frontend/backend contracts; the frontend will be updated to match the new Python backend.
- The dashboard will keep separate top 5 gainers and top 5 losers sections.
- The dashboard will use one line chart per card, based on close-price history only.
- Volume bars are removed.
- Candlestick charts are removed.
- Range switching is removed; no `5min`, `30min`, or `120min` views remain.
- Closed transactions must continue to show realized P/L.
- Closed transaction charts freeze on close.

### UX / Workflow
- The frontend remains snapshot-driven; websocket snapshots are the source of truth for stocks and transactions.
- HTTP is used only for transaction commands.
- Transactions are opened with `Buy` or `Short` and closed with `Sell` or `Cover`.
- Button labels are frontend-owned constants, not backend payload fields.
- Pending transaction states must be visible immediately in the UI.
- A full snapshot is published immediately after transaction command submission so pending state appears without waiting for a symbol update.
- Another full snapshot is published when the pending action fills on the next symbol update.
- `sessionState` is removed from the payload and UI.
- The UI continues to show connection state (`live`, `reconnecting`, `fallback`) and updated time.

### Data / State / Ownership
- All backend state is ephemeral and in-memory only.
- Backend restart clears stock history and transactions.
- The backend uses a fixed env-configured watchlist, defaulting to the current 10 symbols.
- The backend ignores incoming Massive aggregates where `official_open_price` is `None`.
- Gain/loss percentage uses Massive `official_open_price` directly; the backend does not derive open price from the first tick.
- Each symbol keeps a maximum of 300 price points; oldest points are dropped first.
- The backend owns line-series shaping and the "append only on price change, otherwise update last point" rule.
- Transaction cards inherit the full current symbol history when created.
- Pending and open transaction cards keep updating with live symbol history.
- Closed transaction cards freeze their inherited history at close.
- Only one active transaction per symbol is allowed at a time.
- A symbol with `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE` is unavailable in the stocks grid.
- After a transaction closes, the symbol returns to the stocks grid.
- Closed transactions remain visible until backend restart.
- Transaction statuses are `PENDING_OPEN`, `OPEN`, `PENDING_CLOSE`, and `CLOSED`.
- `PENDING_OPEN` has `entryPrice=null` and `openedAt=null` until fill.
- `PENDING_CLOSE` keeps open-side data but has `exitPrice=null`, `profitLoss=null`, and `closedAt=null` until fill.
- `CLOSED` includes `exitPrice` and realized `profitLoss`.
- Orders fill on the next accepted update for the same symbol only.
- Fill price is the next symbol `close` price, not the current displayed price at click time.
- `submittedAt` is stored from the user action time.
- Massive `end_timestamp` is used as both the price-point timestamp and transaction fill timestamp.
- Massive `start_timestamp` is ignored in v1.
- P/L keeps the current fixed quantity of 100 shares.

### Interfaces / Contracts
- The backend surface becomes:
  - plain websocket at `ws://localhost:8080/ws`
  - `POST /api/transactions`
  - `POST /api/transactions/{id}/close`
  - `GET /health`
- Websocket messages are plain JSON full snapshots, not STOMP frames.
- The backend sends full snapshots only; no partial patch/event message format is used.
- Full snapshots are published on every accepted symbol update.
- There is no extra 1-second snapshot scheduler; accepted updates drive publishing.
- The backend returns `202 Accepted` for open and close transaction commands.
- HTTP command responses include transaction id and current status only; the frontend waits for websocket snapshots for full state.
- There is no `GET /api/transactions` endpoint.
- The backend sends chart-ready line-series data directly.
- The backend payload should contain data only, not action labels.
- `POST /api/transactions` is rejected if the symbol already has `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE`.
- Close requests are rejected if the transaction is already `PENDING_CLOSE` or `CLOSED`.
- Error codes are:
  - `404` for unknown transaction id
  - `409` for invalid transaction/symbol state
  - `422` when latest price is unavailable and the order cannot be queued

### Operations / Deployment
- The rewritten backend runs as one FastAPI process.
- That single process owns feed ingestion, in-memory state, transaction logic, HTTP API, websocket clients, and health endpoint.
- The backend always uses the Massive websocket feed.
- `MASSIVE_API_KEY` is required in every environment.
- Prometheus and Grafana are removed from the runtime topology.
- Redis is removed from the runtime topology.

## Core Business Rules
- Ignore any provider aggregate with `official_open_price=None`.
- Rank watchlist symbols by percent change from `official_open_price` using latest `close`.
- Show only top 5 gainers and top 5 losers.
- Maintain at most 300 close-price points per symbol.
- Add a new price point only when the new close differs from the last close; otherwise update the last point timestamp/value.
- Transaction open/close actions are next-symbol-update fills, not instant fills.
- Open command creates `PENDING_OPEN` immediately.
- Close command creates `PENDING_CLOSE` immediately.
- `PENDING_OPEN` fills into `OPEN` on the next accepted update for that same symbol.
- `PENDING_CLOSE` fills into `CLOSED` on the next accepted update for that same symbol.
- `OPEN` fills set `entryPrice` from that next symbol `close` and `openedAt` from that update `end_timestamp`.
- `CLOSED` fills set `exitPrice` from that next symbol `close`, `closedAt` from that update `end_timestamp`, and realized P/L from fixed 100-share quantity.
- A symbol cannot have multiple simultaneous pending/open transactions.

## UX / Workflow Rules
- Stocks grid contains symbols without active/pending transactions.
- Submitting `Buy` or `Short` removes the symbol from stocks immediately and shows a pending transaction card.
- Submitting `Sell` or `Cover` keeps the transaction visible and disables repeat close action via pending state.
- Closed transaction cards remain visible with realized P/L until backend restart.
- Transaction cards use inherited symbol history immediately on creation.
- Closed transaction charts stop updating after close.

## Data / State / Ownership Decisions
- The backend is the only owner of live watchlist prices, rankings, line histories, and transaction state.
- The frontend owns rendering concerns and action labels only.
- The frontend should not synthesize rankings, line histories, or transaction lifecycle transitions.
- The websocket snapshot is the authoritative read model.
- In-memory storage is the only state store in v1.

## Interface / Contract Expectations
- The websocket payload must be simple JSON and easy to consume from browser-native websocket APIs.
- Snapshot payloads must include enough data for direct frontend rendering of stock cards and transaction cards without frontend chart shaping.
- Transaction command APIs must be asynchronous command acknowledgements, not immediate fill confirmations.
- The frontend must tolerate snapshot-only reads and command/write separation.

## Operational / Deployment Constraints
- Local-first development is required.
- The default local setup requires `MASSIVE_API_KEY`.
- The runtime architecture must stay simple: one process, in-memory state, no external datastore.
- The rewritten backend should continue to bind to port `8080` so the frontend can keep its default API/websocket base host.

## Assumptions
- Massive 1-second aggregate data is sufficient for stock ranking, line history, and next-tick fill behavior.
- Massive `close` is the only live price needed for charts and fills.
- Massive `official_open_price` is trustworthy for percent-change calculations when present.
- The current 10-symbol watchlist remains an acceptable default for v1.
- Backend restart clearing all state is acceptable for the rewrite scope.
- Full-snapshot publishing on every accepted watched-symbol update is acceptable for the watchlist size.

## Open Questions
- None currently.

## Ready for Spec Generation
- Status: yes
- Reason: Core scope, lifecycle rules, contracts, runtime topology, error semantics, and frontend/backend ownership are locked closely enough for `$decision-to-spec` without inventing policy.
