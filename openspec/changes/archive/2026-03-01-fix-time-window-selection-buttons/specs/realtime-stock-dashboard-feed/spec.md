## MODIFIED Requirements

### Requirement: Snapshot Broadcast Cadence
The system SHALL publish full dashboard snapshots over WebSocket every second while session is open, and the dashboard frontend SHALL consume and render these snapshots in near-real-time.

#### Scenario: Frontend applies selected range view
- **WHEN** a user clicks a range chip (`5min`, `30min`, `120min`) on a stock card
- **THEN** the frontend updates that card’s chart and axis labels to the selected range data without requiring a page reload

#### Scenario: Frontend preserves range selection on live updates
- **WHEN** a new snapshot arrives for a symbol whose currently selected range still exists
- **THEN** the frontend keeps the user’s selected range for that card

### Requirement: Snapshot Payload Contract
Each snapshot card SHALL include symbol identity, ranges, candle data, y-axis labels formatted with exactly 2 decimal places, x-axis labels in 24-hour format, and action labels `Buy` and `Short`.

#### Scenario: Frontend stores per-range chart data
- **WHEN** a snapshot card is mapped to frontend card state
- **THEN** the frontend stores candle and axis information for each available range so range switching is interactive
