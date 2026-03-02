## 1. Backend Domain and Persistence

- [x] 1.1 Introduce transaction model with required fields and unique transaction ID.
- [x] 1.2 Persist OPEN transaction records in Redis immediately on Buy/Short.
- [x] 1.3 Update transaction record on Sell/Cover with close timestamp, exit price, status, and realized profit/loss.
- [x] 1.4 Implement symbol availability rules based on OPEN/CLOSED transaction state.
- [x] 1.5 Implement fixed quantity (100 shares) profit/loss formulas for LONG and SHORT closures.
- [x] 1.6 Freeze CLOSED transaction values for the rest of the trading day.

## 2. Snapshot and API Contract

- [x] 2.1 Extend realtime snapshot payload with transactions collection for frontend rendering.
- [x] 2.2 Include position type, timestamps, status, and profit/loss display fields in transaction cards.
- [x] 2.3 Ensure closed transactions remain visible until market close/session reset.

## 3. Frontend Transactions Grid

- [x] 3.1 Add Transactions Grid below Stocks Grid with dynamic layout and max 5 cards per row.
- [x] 3.1.1 Render transaction cards newest first.
- [x] 3.2 Move card from Stocks Grid to Transactions Grid on Buy/Short.
- [x] 3.3 Render close action button by position type (`Sell` for LONG, `Cover` for SHORT).
- [x] 3.3.1 Hide close action button after transaction status becomes `CLOSED`.
- [x] 3.4 Display transaction header metadata (timestamp, LONG/SHORT, P/L when closed).
- [x] 3.5 Return symbol to Stocks Grid after close while keeping closed transaction visible.
- [x] 3.6 Ensure closed transaction cards remain visually/data frozen until market close.

## 4. Verification

- [x] 4.1 Add backend tests for transaction open/close transitions, P/L formulas, freeze semantics, and Redis persistence.
- [x] 4.2 Add frontend tests for newest-first ordering, grid movement, action visibility, and post-close symbol availability.
- [x] 4.3 Add integration test for snapshot contract containing transactions.
- [x] 4.4 Run `pnpm test`, `pnpm lint`, `pnpm build`, and backend test suite.
- [x] 4.5 Validate OpenSpec change.
