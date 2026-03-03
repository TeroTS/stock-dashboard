# Boundary Data Models

This document covers only models that cross component boundaries (ingest events, API/stream payloads, and persisted session/transaction state).

## Compatibility Policy
- Snapshot and API payloads are JSON and currently versionless.
- Backward-compatible changes are additive (adding optional fields).
- Removing or renaming required fields is a breaking change and requires coordinated backend + frontend + test + docs updates.
- Range labels are contract values (`5min`, `30min`, `120min`) and should be treated as stable boundary values.

## Model: `NormalizedTick` (Ingest Event)
Purpose:
- Represents one incoming market tick used to update intraday symbol state.

Fields:
| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `timestamp` | ISO-8601 timestamp | Yes | Tick event time used for session gating and candle bucketing |
| `symbol` | string | Yes | Ticker symbol; normalized to uppercase for watchlist checks |
| `price` | decimal (`>= 0.0001`) | Yes | Last traded price for the tick |
| `volume` | integer (`> 0`) | Yes | Trade size merged into current candle bucket |

Producers / Consumers:
- Producer: market tick source (mock ingest locally or external provider).
- Consumer: backend tick ingest pipeline.

Versioning / Compatibility Rules:
- Required fields are strict; missing/invalid values are dropped as invalid ticks.
- Symbols outside watchlist are dropped without state changes.

Authoritative source:
- [backend/src/main/java/com/stockdashboard/backend/domain/NormalizedTick.java](../backend/src/main/java/com/stockdashboard/backend/domain/NormalizedTick.java)
- [backend/src/main/java/com/stockdashboard/backend/pipeline/TickIngestService.java](../backend/src/main/java/com/stockdashboard/backend/pipeline/TickIngestService.java)
- [openspec/specs/realtime-stock-dashboard-feed/spec.md](../openspec/specs/realtime-stock-dashboard-feed/spec.md)

## Model Family: Snapshot Stream Payloads
Purpose:
- Carries complete dashboard state to frontend subscribers on publish cadence.

### `DashboardSnapshot`
| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `generatedAt` | ISO-8601 timestamp | Yes | Snapshot generation time |
| `sessionState` | string | Yes | Session state string (`OPEN`/`CLOSED`) |
| `topGainers` | `StockCardSnapshot[]` | Yes | Ranked gainer cards |
| `topLosers` | `StockCardSnapshot[]` | Yes | Ranked loser cards |
| `transactions` | `TransactionCardSnapshot[]` | Yes | Transaction cards (open and closed for active session) |

### `StockCardSnapshot`
| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `symbol` | string | Yes | Stock ticker |
| `percentChange` | decimal | Yes | Percent change from market-open price |
| `timeRanges` | `string[]` | Yes | Supported ranges (`5min`, `30min`, `120min`) |
| `activeRange` | string | Yes | Default selected range |
| `candlesByRange` | `map<string, CandleSnapshot[]>` | Yes | Candle series by range |
| `yAxisLabels` | `string[]` | Yes | Price axis labels (2-decimal strings) |
| `xAxisLabels` | `string[]` | Yes | Time labels (`HH:mm`) |
| `buyLabel` | string | Yes | Open long action label |
| `shortLabel` | string | Yes | Open short action label |

### `TransactionCardSnapshot`
| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `transactionId` | string | Yes | Stable transaction identifier |
| `symbol` | string | Yes | Ticker for transaction |
| `timeRanges` | `string[]` | Yes | Supported ranges |
| `activeRange` | string | Yes | Default selected range |
| `candlesByRange` | `map<string, CandleSnapshot[]>` | Yes | Candle series by range |
| `yAxisLabels` | `string[]` | Yes | Price axis labels |
| `xAxisLabels` | `string[]` | Yes | Time axis labels |
| `positionType` | enum (`LONG` \| `SHORT`) | Yes | Position side |
| `status` | enum (`OPEN` \| `CLOSED`) | Yes | Lifecycle state |
| `openTimestamp` | ISO-8601 timestamp | Yes | Position open time |
| `closeTimestamp` | ISO-8601 timestamp/null | No | Position close time |
| `entryPrice` | decimal | Yes | Open price used for P/L |
| `exitPrice` | decimal/null | No | Close price |
| `profitLoss` | decimal/null | No | Realized P/L after close |
| `closeActionLabel` | string/null | No | `Sell` for open long, `Cover` for open short, `null` when closed |

### `CandleSnapshot`
| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `bucketStart` | ISO-8601 timestamp | Yes | Bucket start instant |
| `open` | decimal | Yes | First price in bucket |
| `high` | decimal | Yes | Highest price in bucket |
| `low` | decimal | Yes | Lowest price in bucket |
| `close` | decimal | Yes | Last price in bucket |
| `volume` | integer | Yes | Total bucket volume |

Producers / Consumers:
- Producer: backend snapshot publisher.
- Consumer: frontend feed client and snapshot mapper.

Versioning / Compatibility Rules:
- Frontend expects all required fields above.
- New optional fields are allowed if existing required fields remain unchanged.
- Range keys in `candlesByRange` must stay aligned with `timeRanges`.

Authoritative source:
- [backend/src/main/java/com/stockdashboard/backend/snapshot/DashboardSnapshot.java](../backend/src/main/java/com/stockdashboard/backend/snapshot/DashboardSnapshot.java)
- [backend/src/main/java/com/stockdashboard/backend/snapshot/StockCardSnapshot.java](../backend/src/main/java/com/stockdashboard/backend/snapshot/StockCardSnapshot.java)
- [backend/src/main/java/com/stockdashboard/backend/snapshot/TransactionCardSnapshot.java](../backend/src/main/java/com/stockdashboard/backend/snapshot/TransactionCardSnapshot.java)
- [backend/src/main/java/com/stockdashboard/backend/snapshot/CandleSnapshot.java](../backend/src/main/java/com/stockdashboard/backend/snapshot/CandleSnapshot.java)
- [frontend/src/live/types.ts](../frontend/src/live/types.ts)
- [backend/src/test/java/com/stockdashboard/backend/ws/WebSocketSnapshotContractIntegrationTest.java](../backend/src/test/java/com/stockdashboard/backend/ws/WebSocketSnapshotContractIntegrationTest.java)

Model diagram:
- [docs/diagrams/models/api_models.d2](./diagrams/models/api_models.d2)

## Model Family: Transaction API Payloads
Purpose:
- Allows frontend to open and close positions and retrieve session transactions.

### `OpenTransactionRequest`
| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `symbol` | string | Yes | Symbol to open |
| `positionType` | enum (`LONG` \| `SHORT`) | Yes | Position side |

### `TransactionRecord` (API response model)
| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `transactionId` | string | Yes | Transaction ID |
| `symbol` | string | Yes | Symbol |
| `positionType` | enum (`LONG` \| `SHORT`) | Yes | Position side |
| `openTimestamp` | ISO-8601 timestamp | Yes | Open time |
| `closeTimestamp` | ISO-8601 timestamp/null | No | Close time |
| `entryPrice` | decimal | Yes | Entry price |
| `exitPrice` | decimal/null | No | Exit price |
| `profitLoss` | decimal/null | No | Realized P/L |
| `status` | enum (`OPEN` \| `CLOSED`) | Yes | Position state |

Producers / Consumers:
- Producer: backend transaction controller/service.
- Consumer: frontend transaction API client (mutations) and backend snapshot assembler (for read model output).

Versioning / Compatibility Rules:
- Open request requires both fields.
- Close operation is idempotency-sensitive: closing an already closed transaction returns conflict.
- P/L is computed using fixed quantity `100`.

Authoritative source:
- [backend/src/main/java/com/stockdashboard/backend/transaction/TransactionController.java](../backend/src/main/java/com/stockdashboard/backend/transaction/TransactionController.java)
- [backend/src/main/java/com/stockdashboard/backend/transaction/TransactionRecord.java](../backend/src/main/java/com/stockdashboard/backend/transaction/TransactionRecord.java)
- [backend/src/main/java/com/stockdashboard/backend/transaction/TransactionService.java](../backend/src/main/java/com/stockdashboard/backend/transaction/TransactionService.java)
- [frontend/src/live/transactionsApi.ts](../frontend/src/live/transactionsApi.ts)
- [backend/src/test/java/com/stockdashboard/backend/transaction/TransactionControllerTest.java](../backend/src/test/java/com/stockdashboard/backend/transaction/TransactionControllerTest.java)
- [backend/src/test/java/com/stockdashboard/backend/transaction/TransactionServiceTest.java](../backend/src/test/java/com/stockdashboard/backend/transaction/TransactionServiceTest.java)

## Model Family: Redis Session/Transaction State
Purpose:
- Preserves intraday state across backend restarts and supports daily reset boundaries.

### Redis key groups
| Key Pattern | Meaning |
| --- | --- |
| `stock-dashboard:session:current` | Current session date |
| `stock-dashboard:sessions` | Set of known session dates for symbol state |
| `stock-dashboard:session:{date}:symbols` | Set of symbols persisted for that session |
| `stock-dashboard:session:{date}:symbol:{symbol}` | JSON-serialized `SymbolSessionState` |
| `stock-dashboard:transactions:sessions` | Set of known session dates for transactions |
| `stock-dashboard:transactions:session:{date}:ids` | Set of transaction IDs for a session |
| `stock-dashboard:transactions:session:{date}:tx:{id}` | JSON-serialized `TransactionRecord` |

### `SymbolSessionState` payload
Key fields:
- `symbol`
- `sessionDate`
- `openPrice`
- `latestPrice`
- `candlesByRange` map keyed by `RangeDefinition`
- Each range contains `RollingCandleSeries` with `bucketSeconds`, `maxBuckets`, and `buckets[]`
- Each bucket contains OHLCV (`bucketStart`, `open`, `high`, `low`, `close`, `volume`)

Producers / Consumers:
- Producer: tick ingest service and session lifecycle service.
- Consumers: ranking service, snapshot assembler/publisher, transaction service.

Versioning / Compatibility Rules:
- Session state is reset when current session date changes at OPEN boundary.
- Candle range definitions must stay aligned with snapshot mapping expectations.

Authoritative source:
- [backend/src/main/java/com/stockdashboard/backend/state/RedisSessionStateStore.java](../backend/src/main/java/com/stockdashboard/backend/state/RedisSessionStateStore.java)
- [backend/src/main/java/com/stockdashboard/backend/transaction/RedisTransactionStore.java](../backend/src/main/java/com/stockdashboard/backend/transaction/RedisTransactionStore.java)
- [backend/src/main/java/com/stockdashboard/backend/domain/SymbolSessionState.java](../backend/src/main/java/com/stockdashboard/backend/domain/SymbolSessionState.java)
- [backend/src/main/java/com/stockdashboard/backend/domain/RollingCandleSeries.java](../backend/src/main/java/com/stockdashboard/backend/domain/RollingCandleSeries.java)
- [backend/src/main/java/com/stockdashboard/backend/domain/CandleBucket.java](../backend/src/main/java/com/stockdashboard/backend/domain/CandleBucket.java)
- [backend/src/main/java/com/stockdashboard/backend/session/SessionLifecycleService.java](../backend/src/main/java/com/stockdashboard/backend/session/SessionLifecycleService.java)

Model diagram:
- [docs/diagrams/models/state_models.d2](./diagrams/models/state_models.d2)
