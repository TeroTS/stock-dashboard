## 1. Data Plumbing

- [x] 1.1 Add `percentChange` to frontend `StockCardModel`.
- [x] 1.2 Map snapshot `percentChange` into frontend card models.
- [x] 1.3 Set fallback/static cards to neutral `percentChange: 0`.

## 2. UI Rendering

- [x] 2.1 Render percent change next to symbol in stock card header.
- [x] 2.2 Add signed formatting (`+/-`) with 2 decimal precision.
- [x] 2.3 Add positive/negative/neutral color classes.

## 3. Verification

- [x] 3.1 Update/extend mapper tests for `percentChange`.
- [x] 3.2 Update dashboard rendering tests to assert percent display.
- [x] 3.3 Run `pnpm test`, `pnpm lint`, and `pnpm build`.
- [x] 3.4 Validate OpenSpec change.
