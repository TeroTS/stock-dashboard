## MODIFIED Requirements

### Requirement: Snapshot Payload Contract
Each snapshot card SHALL include symbol identity, ranges, candle data, y-axis labels formatted with exactly 2 decimal places, x-axis labels in 24-hour format, and action labels `Buy` and `Short`.

#### Scenario: Display realtime percent change beside symbol
- **WHEN** a snapshot card is rendered in the dashboard
- **THEN** the card header includes the symbol and signed percent change value with 2 decimal precision

#### Scenario: Fallback percent rendering
- **WHEN** the dashboard is rendering static fallback cards before live updates
- **THEN** each card displays a neutral `0.00%` change value
