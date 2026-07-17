# What Happens on Every Incoming Tick

Use one provider update for one symbol, e.g. `AAPL`.

## 1. Backend receives provider message

It extracts only:

- `symbol`
- `official_open_price`
- `close`
- `end_timestamp`

If parsing fails, message is ignored.

## 2. Backend decides whether to ignore it

The tick is ignored if:

- symbol is not in `backend/watchlist.txt`
- `official_open_price` is `null`

If ignored:
- no state changes
- no snapshot work

## 3. Backend updates symbol state

For that symbol it updates:

- latest `close`
- `officialOpenPrice`
- `percentChange`
- line-chart `points`

Point rules:

- if price changed: append new point
- if price stayed same: replace last point timestamp
- keep max 300 points

## 4. Backend checks live transactions for that symbol

Only transactions for the same symbol matter.

### If transaction is `PENDING_OPEN`
- becomes `OPEN`
- `openedAt = end_timestamp`
- `entryPrice = close`

### If transaction is `PENDING_CLOSE`
- becomes `CLOSED`
- `closedAt = end_timestamp`
- `exitPrice = close`
- `profitLoss` is calculated

### If transaction is already `OPEN`
- its chart points are refreshed from the symbol’s latest points

### If transaction is `CLOSED`
- nothing changes

## 5. Backend updates global dashboard time

- `updatedAt = end_timestamp`

## 6. Backend rebuilds dashboard snapshot

It derives:

- `topGainers` = best 5 visible symbols
- `topLosers` = worst 5 visible symbols
- `transactions` = transaction cards

Visible symbol rule:

- symbols with `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE` are excluded from stock lists

## 7. Backend schedules websocket publish

Important now:

- it does **not always send immediately**
- it queues the latest snapshot
- bursty updates get coalesced

So if many ticks arrive fast:

- backend may skip sending intermediate snapshots
- clients get the newest snapshot

## 8. Frontend receives snapshot

When a snapshot is sent, frontend:

- replaces `topGainers`
- replaces `topLosers`
- replaces `transactions`
- replaces `updatedAt`

No patch merging.

## Short version

Each accepted tick does:

- validate
- update one symbol
- update matching transactions
- rebuild dashboard view
- queue latest snapshot for websocket clients

## Key mental rule

A tick changes **backend internal state first**.
The UI only changes **later**, when the latest snapshot is published.
