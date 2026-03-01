## 1. Frontend Card Interaction

- [x] 1.1 Add card-level range-selection interaction for `5min`, `30min`, `120min`.
- [x] 1.2 Ensure selected range drives chart candle rendering and active-chip styling.
- [x] 1.3 Preserve selected range across live/fallback updates when valid.

## 2. Frontend Model and Mapping

- [x] 2.1 Update `StockCardModel` to carry per-range candle and axis-label maps.
- [x] 2.2 Update static fallback data to support per-range maps.
- [x] 2.3 Update snapshot-to-card mapper to populate per-range candle/axis data.

## 3. Verification

- [x] 3.1 Add/update dashboard interaction tests for range switching.
- [x] 3.2 Add/update mapper tests for per-range candle mapping.
- [x] 3.3 Run full frontend checks: `pnpm test`, `pnpm lint`, `pnpm build`.
- [x] 3.4 Run `react-doctor` scan and confirm no blocking issues.
- [x] 3.5 Validate OpenSpec change.
