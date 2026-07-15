# Python Backend Rewrite for Stock Dashboard Specification

Status: Draft v1

## Product Summary
Rewrite the stock dashboard backend as a simple Python 3.12 + FastAPI service that uses in-memory state, a plain JSON WebSocket feed, and HTTP transaction commands. The product keeps a watchlist-based top 5 gainers / top 5 losers dashboard, replaces candle/range charts with one close-price line per card, and supports pending-next-tick transaction fills. Source: derived from `DECISIONS.md`.

## Goals and Success Criteria
- Run locally by default without external credentials by using a mock feed.
- Run against Massive 1-second aggregates when explicitly enabled.
- Publish full dashboard snapshots over plain WebSocket whenever watched-symbol state changes.
- Render top 5 gainers, top 5 losers, and transaction cards from snapshot data only.
- Support `Buy`, `Short`, `Sell`, and `Cover` flows with visible pending states and next-symbol-update fills.
- Remove Redis, STOMP, Prometheus, Grafana, session windows, daily reset logic, volume bars, and multi-range candle charts.

## Primary Roles
- Dashboard user
- Developer running the app locally
- Massive aggregate feed

## Product Boundaries
- One FastAPI process owns feed ingestion, in-memory state, ranking, line history, transactions, HTTP API, WebSocket clients, and health.
- State is ephemeral; backend restart clears histories and transactions.
- The backend reads only a configured watchlist and ignores aggregates with `official_open_price=None`.
- The frontend is snapshot-driven and uses HTTP only for transaction commands.
- The backend sends data-only payloads; frontend owns labels and rendering.

## Non-Goals
- Persistence across restarts
- Redis or any external state store
- STOMP or topic-based websocket delivery
- Prometheus, Grafana, or actuator-style endpoints
- Market-hours gating or session-state output
- Volume bars, candlesticks, or multi-range charts
- HTTP read endpoints for dashboard or transactions

## UI Surfaces
- Dashboard page with connection status and updated time
- Top 5 gainers grid
- Top 5 losers grid
- Transactions grid with pending, open, and closed cards
- Buttons: `Buy`, `Short`, `Sell`, `Cover`

## Conceptual Data Model
- Watchlist symbol: symbol, latest close, official open price, percent change, up to 300 chart points
- Stock card: symbol, percent change, line-series data
- Transaction: transaction id, symbol, position type, status (`PENDING_OPEN`, `OPEN`, `PENDING_CLOSE`, `CLOSED`), submitted time, open/close fill times, entry price, exit price, realized P/L, inherited line-series data
- Snapshot: updated time, top gainers, top losers, transactions
- Feed mode: `mock` or `massive`

## Core Business Rules
- Ignore provider updates where `official_open_price` is missing.
- Rank watched symbols by percent change from provider `official_open_price` using latest `close`.
- Show only top 5 gainers and top 5 losers.
- Keep at most 300 close-price points per symbol.
- Add a new chart point only when price changes; otherwise update the last point.
- Publish full snapshots on every accepted symbol update and immediately after transaction command submission.
- Transactions fill on the next accepted update for the same symbol, not at click time.
- A symbol cannot have more than one active or pending transaction.
- Stocks grid excludes symbols with `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE` transactions.
- Closed transactions remain visible with realized P/L until backend restart.
- Closed transaction charts freeze at close.
- Use provider `end_timestamp` as price-point time and fill time.
- Use fixed quantity `100` shares for realized P/L.

## End-to-End User Stories

Story format:

### US-01 Local mock-backed dashboard startup

**Primary actor:** Developer running the app locally

**Trigger:** The developer starts the frontend and backend with default settings

**Flow:**

1. The backend starts in `mock` mode by default without requiring external credentials.
2. The mock feed emits one update per second for every watched symbol using `symbol`, `official_open_price`, `close`, and aggregate timestamp.
3. The backend maintains in-memory watchlist state and exposes a simple health endpoint.

**Visible outcome:** The app starts locally with live-looking watchlist updates and no Massive API key.

### US-02 Plain WebSocket snapshot stream

**Primary actor:** Dashboard user

**Trigger:** The dashboard opens and connects to the backend WebSocket

**Flow:**

1. The frontend connects to `ws://localhost:8080/ws` using plain browser WebSocket behavior.
2. The backend publishes full JSON snapshots whenever an accepted watched-symbol update changes state.
3. The frontend treats each snapshot as the full read model for stocks and transactions.

**Visible outcome:** The dashboard updates live from a plain JSON WebSocket stream with no STOMP/topic layer.

### US-03 Ranked stock cards with one line chart

**Primary actor:** Dashboard user

**Trigger:** New watched-symbol price updates arrive

**Flow:**

1. The backend ignores updates with `official_open_price=None` and computes percent change from provider open price for accepted symbols.
2. The backend keeps up to 300 close-price points per symbol and appends a new point only when price changes.
3. The frontend renders top 5 gainers and top 5 losers as stock cards with one close-price line chart each.

**Visible outcome:** The dashboard shows split gainer/loser cards with live percent change and simple line charts.

### US-04 Open transaction enters pending state immediately

**Primary actor:** Dashboard user

**Trigger:** The user clicks `Buy` or `Short` on a stock card

**Flow:**

1. The frontend sends `POST /api/transactions`.
2. The backend creates a `PENDING_OPEN` transaction, removes the symbol from the stocks grid, and returns `202 Accepted` with transaction id and status.
3. The backend immediately publishes a full snapshot showing the pending transaction card.

**Visible outcome:** The selected symbol disappears from stocks and appears immediately in transactions as pending.

### US-05 Pending open fills on the next symbol update

**Primary actor:** Dashboard user

**Trigger:** A symbol with `PENDING_OPEN` receives its next accepted provider update

**Flow:**

1. The backend waits for the next accepted update for that same symbol only.
2. The backend fills the transaction using that update’s `close` as `entryPrice` and `end_timestamp` as `openedAt`, then marks it `OPEN`.
3. The backend publishes a new full snapshot with the filled transaction and updated chart history.

**Visible outcome:** The pending transaction becomes open at the next symbol-specific close price.

### US-06 Pending close fills and freezes the transaction

**Primary actor:** Dashboard user

**Trigger:** The user clicks `Sell` or `Cover` on an open transaction

**Flow:**

1. The frontend sends `POST /api/transactions/{id}/close`.
2. The backend marks the transaction `PENDING_CLOSE`, returns `202 Accepted`, and immediately publishes a snapshot showing the pending close state.
3. On the next accepted update for that same symbol, the backend fills `exitPrice`, `closedAt`, and realized P/L, marks the transaction `CLOSED`, freezes its chart, returns the symbol to stocks, and publishes a new snapshot.

**Visible outcome:** The transaction closes on the next symbol update, shows realized P/L, and stops changing afterward.

### US-07 Transaction rejection and duplicate protection

**Primary actor:** Dashboard user

**Trigger:** The user submits an invalid transaction command

**Flow:**

1. The backend rejects open requests for symbols that already have `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE` transactions.
2. The backend rejects close requests for unknown ids or transactions already pending close or closed.
3. The frontend keeps the last good snapshot and relies on subsequent snapshots for authoritative state.

**Visible outcome:** Invalid repeat actions do not create duplicate positions or corrupt visible state.

### US-08 Massive feed mode for real provider data

**Primary actor:** Developer running the app against live provider data

**Trigger:** The developer enables `FEED_MODE=massive`

**Flow:**

1. The backend starts the Massive websocket feed when `FEED_MODE=massive` and a valid `MASSIVE_API_KEY` are provided.
2. The backend processes accepted watchlist aggregates using provider `official_open_price`, `close`, and `end_timestamp`.
3. The same ranking, chart, transaction, and snapshot rules used in mock mode apply in Massive mode.

**Visible outcome:** The same dashboard behavior runs against Massive 1-second aggregates instead of mock data.

## Story Groups / Likely Delivery Order
- Foundation
  - US-01 Local mock-backed dashboard startup
  - US-02 Plain WebSocket snapshot stream
- Live market view
  - US-03 Ranked stock cards with one line chart
- Transaction lifecycle
  - US-04 Open transaction enters pending state immediately
  - US-05 Pending open fills on the next symbol update
  - US-06 Pending close fills and freezes the transaction
  - US-07 Transaction rejection and duplicate protection
- Provider integration
  - US-08 Massive feed mode for real provider data

## Assumptions
- The existing frontend can be updated to the new breaking snapshot and WebSocket contract.
- Full-snapshot publishing on every accepted watched-symbol update is acceptable for the watchlist size.
- In-memory-only state loss on backend restart is acceptable for this rewrite.
- Massive 1-second aggregates provide enough fidelity for rankings, line charts, and next-tick transaction fills.

## Open Questions
- None currently.
