## MODIFIED Requirements

### Requirement: Snapshot Broadcast Cadence
The system SHALL publish full dashboard snapshots over WebSocket every second while session is open, and the dashboard frontend SHALL consume and render these snapshots in near-real-time.

#### Scenario: Frontend applies periodic snapshots
- **WHEN** a new snapshot is received from `/topic/dashboard-snapshots`
- **THEN** the dashboard UI updates card data using the latest snapshot payload

#### Scenario: Frontend reconnect status
- **WHEN** the websocket connection is interrupted
- **THEN** the dashboard exposes a reconnecting state until feed recovery or fallback threshold is reached

### Requirement: Snapshot Payload Contract
Each snapshot card SHALL include symbol identity, ranges, candle data, y-axis labels formatted with exactly 2 decimal places, x-axis labels in 24-hour format, and action labels `Buy` and `Short`.

#### Scenario: Frontend payload mapping
- **WHEN** a snapshot card is mapped to the dashboard UI model
- **THEN** symbol, ranges, axis labels, action labels, and active-range candle data are preserved for rendering

#### Scenario: Frontend fallback behavior
- **WHEN** live websocket feed is unavailable beyond retry window
- **THEN** dashboard remains usable via static fallback data and indicates fallback status
