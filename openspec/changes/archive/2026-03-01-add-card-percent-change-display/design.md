## Overview

This change threads `percentChange` from existing snapshot payloads into frontend card state and renders it beside each symbol in the card header with directional styling.

## Design Decisions

### 1. No backend contract change

- Backend already emits `percentChange` in each stock card snapshot.
- Frontend mapping now preserves this field in `StockCardModel`.

### 2. Signed formatting

- Positive values render with leading plus sign (e.g. `+1.24%`).
- Negative values use native minus sign (e.g. `-0.87%`).
- Zero renders as `0.00%`.
- Precision fixed to 2 decimals.

### 3. Directional styling

- Positive: green (`stock-change-positive`)
- Negative: red (`stock-change-negative`)
- Zero: neutral muted (`stock-change-neutral`)

### 4. Fallback behavior

- Static fallback data uses `percentChange: 0`.
- This yields neutral `0.00%` until live snapshot data arrives.

## Risks and Mitigations

- **Risk**: visual clutter in header.
  - **Mitigation**: compact monospace styling with small font and baseline alignment.
- **Risk**: inconsistent sign formatting.
  - **Mitigation**: single formatter helper in `StockCard`.
