# One Symbol Through the System

Use one symbol: `AAPL`.

## 1. Startup

Backend starts and reads:

- `backend/watchlist.txt`

If `AAPL` is in that file, backend will track it.

At this point:

- frontend may be connected
- but `AAPL` may not yet exist in backend state

Because no accepted provider update has arrived yet.

## 2. First market update arrives for `AAPL`

Provider sends something like:

- `symbol = AAPL`
- `official_open_price = 208.50`
- `close = 211.32`
- `end_timestamp = 1784054639000`

Backend checks:

- is `AAPL` in watchlist?
- does it have `official_open_price`?

If yes, backend accepts it.

Backend creates internal symbol state for `AAPL`:

- symbol: `AAPL`
- official open: `208.50`
- close: `211.32`
- percent change: `(211.32 - 208.50) / 208.50 * 100`
- points:
  - `[ { timestamp, close } ]`

So now `AAPL` exists in backend memory.

## 3. Ranking phase

Backend compares `AAPL` with all other tracked symbols.

Maybe `AAPL` ends up:

- in top 5 gainers
- in top 5 losers
- or in neither

If `AAPL` is in top 5 gainers, it goes into the outgoing snapshot.
If not, frontend never sees it yet.

Important:

- backend still tracks `AAPL`
- even if frontend does not display it

## 4. Frontend receives snapshot

If `AAPL` is included in `topGainers` or `topLosers`, frontend renders its card.

The card shows:

- `AAPL`
- current percent change
- line chart from `points`
- buttons:
  - `Buy`
  - `Short`

So this is the first time the user may notice `AAPL`.

## 5. Another update arrives for `AAPL`

Provider sends another update.

Example:

- close changes from `211.32` to `211.40`
- timestamp moves forward

Backend updates `AAPL` internal state:

- close becomes `211.40`
- percent change recalculated
- point history updated

If the close changed:

- append new point

If close stayed same:

- rewrite last point timestamp

History is capped at 300 points.

Then backend rebuilds rankings and sends a fresh snapshot.

## 6. User clicks `Buy AAPL`

Frontend sends:

- `POST /api/transactions`

with:

- `symbol: AAPL`
- `positionType: LONG`

Backend does **not** open the trade immediately.

Instead it checks:

- does `AAPL` have live symbol state?
- does `AAPL` already have active transaction?

If valid, backend creates transaction:

- transactionId: `tx-...`
- symbol: `AAPL`
- positionType: `LONG`
- status: `PENDING_OPEN`
- submittedAt: now
- points: copy of current `AAPL` points

Now `AAPL` has an active transaction.

## 7. `AAPL` disappears from stock cards

Because active/pending transaction exists, `AAPL` is excluded from:

- `topGainers`
- `topLosers`

Next snapshot shows:

- `AAPL` removed from stock grid
- new transaction card appears with status `PENDING_OPEN`

This is intentional.

`AAPL` should appear in only one place now:
- transaction section

## 8. Next `AAPL` update fills the open

Later provider sends next accepted update for `AAPL`.

Example:

- close = `211.55`
- end_timestamp = `1784054640000`

Backend sees:

- there is a `PENDING_OPEN` transaction for `AAPL`

So it fills it:

- status → `OPEN`
- openedAt → provider timestamp
- entryPrice → `211.55`

It also updates transaction points to latest copied `AAPL` points.

Then backend sends snapshot.

Frontend now shows transaction card:

- symbol: `AAPL`
- status: `OPEN`
- entry price
- updated line chart
- `Sell AAPL` button

## 9. More `AAPL` market updates arrive while transaction is open

Every accepted `AAPL` update now changes two things:

### Symbol state
Backend still updates internal `AAPL` symbol state.

### Transaction state
Because transaction is still live, backend also copies latest `AAPL` points into that transaction.

So while open:

- transaction chart follows `AAPL`
- `AAPL` still stays hidden from stock lists

## 10. User clicks `Sell AAPL`

Frontend sends:

- `POST /api/transactions/{id}/close`

Backend checks:

- transaction exists?
- status is `OPEN`?

If valid:

- status → `PENDING_CLOSE`

Backend immediately sends snapshot.

Frontend shows:

- transaction card still visible
- now status is `PENDING_CLOSE`

Still no final close yet.

## 11. Next `AAPL` update fills the close

Provider sends next accepted `AAPL` update.

Example:

- close = `212.10`
- timestamp = later

Backend sees:

- `AAPL` has `PENDING_CLOSE`

So it fills the close:

- status → `CLOSED`
- closedAt → provider timestamp
- exitPrice → `212.10`
- profitLoss computed from:
  - entryPrice
  - exitPrice
  - position type
  - fixed quantity 100

For long:

- `(exit - entry) * 100`

Then backend sends snapshot.

Frontend shows closed transaction card with realized P/L.

## 12. `AAPL` returns to stock cards

Now transaction is `CLOSED`, so `AAPL` is no longer blocked from stock rankings.

That means on next snapshot:

- `AAPL` may appear again in top gainers/losers
- depending on current ranking

So closed transaction remains visible,
and `AAPL` can also return to stock cards later.

## 13. Closed transaction chart freezes

After close:

- future `AAPL` updates still update symbol state
- but closed transaction points stop changing

So:

- stock card chart keeps moving
- closed transaction chart stays frozen at close

This is important:
the transaction is historical now, not live.

## 14. If user cancels before open fill

Alternative path:

If user clicks `Buy AAPL`
and transaction is still `PENDING_OPEN`,
they can cancel it.

Backend removes that transaction entirely.

Then next snapshot shows:

- no pending transaction card
- `AAPL` returns to stock lists immediately

## 15. If backend restarts

Everything about `AAPL` is lost:

- symbol history
- open transactions
- closed transactions

Because backend state is in memory only.

After restart, `AAPL` starts fresh from the next accepted provider update.

## Short mental movie for `AAPL`

### Normal path

- `AAPL` enters backend from provider
- backend ranks it
- frontend may show it
- user clicks `Buy`
- `AAPL` leaves stock grid
- `AAPL` appears as `PENDING_OPEN`
- next `AAPL` tick makes it `OPEN`
- more `AAPL` ticks update the transaction chart
- user clicks `Sell`
- `AAPL` becomes `PENDING_CLOSE`
- next `AAPL` tick makes it `CLOSED`
- closed chart freezes
- `AAPL` may later return to stock grid

## Simplest single-symbol rule

A symbol lives in two backend forms at once:

- **live market symbol state**
- **optional transaction state tied to that symbol**

Frontend sees only whichever dashboard projection backend chooses:

- stock list projection
- transaction projection
- or both later when transaction is closed
