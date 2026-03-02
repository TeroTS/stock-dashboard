## Overview

This change introduces a first-class intraday transaction lifecycle. Opening a position moves a symbol from Stocks Grid to Transactions Grid. Closing that position records realized P/L, keeps the card visible in Transactions Grid until market close, and returns symbol tradability to the Stocks Grid.

## Design Decisions

### 1. Transaction as independent daily record

- Each open/close cycle for a symbol is stored as a unique transaction record.
- Multiple same-day trades of the same symbol are supported by storing separate records.
- Transaction identity should be explicit (e.g., generated `transactionId`) to avoid overwrite collisions.

### 2. Stateful symbol availability

- Symbols with at least one `OPEN` transaction are excluded from Stocks Grid.
- When the active transaction for a symbol transitions to `CLOSED`, symbol becomes eligible for Stocks Grid again.
- Closed transactions remain in Transactions Grid until daily market close cleanup.

### 3. Redis-backed persistence

- Transaction is persisted immediately at open, then updated at close with `exitPrice`, `closeTimestamp`, and `profitLoss`.
- Persistence format follows required fields in spec; nullable close fields remain unset for OPEN records.
- Day-scoped Redis keys avoid cross-day leakage and align with session reset behavior.

### 4. Snapshot/UI contract extension

- Snapshot includes transaction cards with timestamp, position type, status, and P/L when closed.
- Transaction cards expose close action label by position type (`Sell` for LONG, `Cover` for SHORT).
- Transactions Grid layout constraints are implemented in frontend rendering layer with newest-first ordering.

### 5. Fixed quantity and P/L formula

- Trade quantity is fixed at 100 shares for this scope.
- LONG realized P/L is calculated as `(exitPrice - entryPrice) * 100`.
- SHORT realized P/L is calculated as `(entryPrice - exitPrice) * 100`.

### 6. Closed transaction freeze semantics

- After status becomes `CLOSED`, the transaction card no longer receives live value updates.
- Closed card timestamp/position/entry/exit/P&L values remain unchanged until market close.
- Close action button is hidden immediately after closure.

## Risks and Mitigations

- **Risk**: inconsistent symbol state across rapid updates.
  - **Mitigation**: keep transition logic server-authoritative and include state in snapshot payload.
- **Risk**: unbounded growth of closed transactions during session.
  - **Mitigation**: keep day-scoped records and clear at market close/session reset.
