# Contracts

## Purpose
Lock the external contracts for the Python backend rewrite before implementation. `openapi.yaml` is the source of truth for HTTP surfaces. This document defines the non-HTTP contracts for the plain WebSocket snapshot stream and the aggregate update input consumed by the backend state engine.

## HTTP Contract Source

- `openapi.yaml`

## Non-HTTP Contract Inventory

### Contract 1: Dashboard Snapshot Stream

- Kind: Plain WebSocket JSON message stream
- Producers / Owners: Python FastAPI backend snapshot publisher
- Consumers: React dashboard frontend
- Trigger / Direction: Backend pushes one full snapshot to each connected client immediately after any accepted watched-symbol update and immediately after accepted transaction command submission
- Payload / Shape:
  - Message shape:
    - `updatedAt`: integer, Unix epoch milliseconds for the snapshot generation time
    - `topGainers`: array of `StockCardSnapshot`, ordered highest percent change first, maximum 5 items
    - `topLosers`: array of `StockCardSnapshot`, ordered lowest percent change first, maximum 5 items
    - `transactions`: array of `TransactionSnapshot`
  - `StockCardSnapshot`:
    - `symbol`: string
    - `close`: number
    - `officialOpenPrice`: number
    - `percentChange`: number
    - `points`: ordered array of `LinePoint`, maximum 300 items
  - `TransactionSnapshot`:
    - `transactionId`: string
    - `symbol`: string
    - `positionType`: `LONG | SHORT`
    - `status`: `PENDING_OPEN | OPEN | PENDING_CLOSE | CLOSED`
    - `submittedAt`: integer, Unix epoch milliseconds
    - `openedAt`: integer, Unix epoch milliseconds, or `null`
    - `closedAt`: integer, Unix epoch milliseconds, or `null`
    - `entryPrice`: number or `null`
    - `exitPrice`: number or `null`
    - `profitLoss`: number or `null`
    - `points`: ordered array of `LinePoint`, maximum 300 items
  - `LinePoint`:
    - `timestamp`: integer, Unix epoch milliseconds
    - `close`: number
  - Example:
    ```json
    {
      "updatedAt": 1784054639000,
      "topGainers": [
        {
          "symbol": "AAPL",
          "close": 211.32,
          "officialOpenPrice": 208.5,
          "percentChange": 1.35,
          "points": [
            { "timestamp": 1784054638000, "close": 211.18 },
            { "timestamp": 1784054639000, "close": 211.32 }
          ]
        }
      ],
      "topLosers": [
        {
          "symbol": "TSLA",
          "close": 172.44,
          "officialOpenPrice": 176.0,
          "percentChange": -2.02,
          "points": [
            { "timestamp": 1784054638000, "close": 172.7 },
            { "timestamp": 1784054639000, "close": 172.44 }
          ]
        }
      ],
      "transactions": [
        {
          "transactionId": "tx_01J0EXAMPLE",
          "symbol": "AAPL",
          "positionType": "LONG",
          "status": "OPEN",
          "submittedAt": 1784054638500,
          "openedAt": 1784054639000,
          "closedAt": null,
          "entryPrice": 211.32,
          "exitPrice": null,
          "profitLoss": null,
          "points": [
            { "timestamp": 1784054638000, "close": 211.18 },
            { "timestamp": 1784054639000, "close": 211.32 }
          ]
        }
      ]
    }
    ```
- Ordering / Idempotency expectations:
  - WebSocket message order is authoritative per connection.
  - Each message is a full replacement snapshot; clients replace local read state rather than merging patches.
  - `points` arrays are ordered oldest to newest.
  - New price points are appended only when `close` changes; otherwise the last point is updated in place.
  - Symbols with `PENDING_OPEN`, `OPEN`, or `PENDING_CLOSE` transactions are excluded from stock-card arrays.
  - Closed transaction snapshots keep their final frozen `points` history.
- Visibility / Security:
  - No auth contract is defined in v1.
  - Intended for the browser dashboard client on the same local or deployed app boundary.
- Failure / Retry expectations:
  - Clients reconnect on socket loss and wait for the next full snapshot.
  - No replay or backfill contract is defined.

### Contract 2: Aggregate Update Input

- Kind: Inbound aggregate event consumed by the backend feed/state layer
- Producers / Owners:
  - Massive websocket adapter
- Consumers:
  - Backend in-memory market-state and transaction engine
- Trigger / Direction: One inbound event per watched-symbol update
- Payload / Shape:
  - Consumed fields:
    - `symbol`: string
    - `official_open_price`: number or `null`
    - `close`: number
    - `end_timestamp`: integer, Unix epoch milliseconds
  - Ignored in v1:
    - `start_timestamp`
    - all other provider fields not required by ranking, chart, or fill logic
  - Example:
    ```json
    {
      "symbol": "AAPL",
      "official_open_price": 208.5,
      "close": 211.32,
      "end_timestamp": 1784054639000
    }
    ```
- Ordering / Idempotency expectations:
  - Transaction fills are symbol-specific and use the next accepted update for that same symbol only.
  - Aggregates with `official_open_price=null` are ignored.
  - Only configured watchlist symbols are processed.
  - `end_timestamp` is the timestamp used for stored price points and transaction fill times.
- Visibility / Security:
  - Massive credentials are backend-only and are never exposed through the dashboard contracts.
- Failure / Retry expectations:
  - Massive reconnect/retry behavior is backend-internal and must preserve the same outbound snapshot contract.

## Slice Handoff

- Contract artifacts implementers must read:
  - `openapi.yaml`
  - `docs/contracts.md`
