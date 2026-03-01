## Overview

Range chips are made interactive in the card component with card-local selection state. The selected range controls the rendered candles and axis labels from a per-range data map contained in each `StockCardModel`.

## Design Decisions

### 1. Per-card local state

- Keep selected range in `StockCard` local React state.
- Initialize from backend-provided `activeRange`.
- Preserve selection across parent re-renders/snapshot updates while the selected range is still valid.
- Fallback to `activeRange` when selected range is no longer present in `timeRanges`.

### 2. Multi-range card model

- Replace single-candle/single-axis fields with per-range maps:
  - `candlesByRange`
  - `xAxisLabelsByRange`
  - `yAxisLabelsByRange`
- This allows UI range switching without extra feed round-trips.

### 3. Frontend label generation

- Build axis labels for each range in frontend mapping from per-range candle snapshots.
- Keep backend `activeRange` labels as fallback only when that range has no candle samples.

### 4. Scope boundaries

- No backend contract change needed.
- No websocket topic or payload schema change required.

## Risks and Mitigations

- **Risk**: type migration can break tests/components expecting old fields.
  - **Mitigation**: update all affected mocks/tests alongside model changes.
- **Risk**: empty range candles could produce empty axes.
  - **Mitigation**: keep safe fallback behavior for active range labels.
