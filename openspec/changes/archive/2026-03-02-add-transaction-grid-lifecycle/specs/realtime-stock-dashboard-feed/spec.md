## ADDED Requirements

### Requirement: Transaction Opening and Grid Migration
When a user opens a position from a stock card (`Buy` for LONG or `Short` for SHORT), the system SHALL create a transaction and move that symbol from Stocks Grid to Transactions Grid.

#### Scenario: Open LONG or SHORT transaction
- **WHEN** a user triggers `Buy` or `Short` on a symbol card
- **THEN** a transaction record is created with `symbol`, `positionType`, `openTimestamp`, `entryPrice`, and `status=OPEN`
- **AND** the symbol is removed from Stocks Grid and inserted into Transactions Grid

#### Scenario: Transaction header initial metadata
- **WHEN** a transaction card is first rendered in Transactions Grid
- **THEN** its header shows the open timestamp and position type indicator (`LONG` or `SHORT`)

### Requirement: Transactions Grid Layout
The dashboard SHALL render Transactions Grid below the Stocks Grids with a dynamic layout that supports a maximum width of 5 items per row and newest-first ordering.

#### Scenario: Enforce transaction row width
- **WHEN** more than five transactions are visible
- **THEN** additional transaction cards wrap to the next row while preserving grid placement below Stocks Grids

#### Scenario: Render newest transaction first
- **WHEN** multiple transactions exist in Transactions Grid
- **THEN** transactions are ordered by open timestamp descending (newest first)

### Requirement: Transaction Close Actions and Realized P/L
Each OPEN transaction SHALL expose a close action and SHALL transition to CLOSED state with realized P/L when the close action is executed.

#### Scenario: Close action label by position type
- **WHEN** a transaction status is `OPEN`
- **THEN** LONG transactions display `Sell` and SHORT transactions display `Cover`

#### Scenario: Closing transaction updates financial fields
- **WHEN** user clicks `Sell` or `Cover` for an OPEN transaction
- **THEN** the system computes `profitLoss` using fixed quantity `100` shares, sets `exitPrice` and `closeTimestamp`, and updates status to `CLOSED`
- **AND** the transaction header displays the realized profit/loss amount

#### Scenario: Realized P/L formulas by position type
- **WHEN** a transaction is closed
- **THEN** LONG `profitLoss` is `(exitPrice - entryPrice) * 100`
- **AND** SHORT `profitLoss` is `(entryPrice - exitPrice) * 100`

#### Scenario: Hide close action after close
- **WHEN** a transaction status changes to `CLOSED`
- **THEN** the close action button is no longer rendered for that transaction card

### Requirement: Symbol Availability Across Transaction Lifecycle
The system SHALL prevent duplicate simultaneous positions per symbol and SHALL allow same-day re-trading after closure.

#### Scenario: Exclude symbol while open
- **WHEN** a symbol has an `OPEN` transaction
- **THEN** that symbol is not available in Stocks Grid

#### Scenario: Re-enable symbol after close
- **WHEN** a symbol's active transaction transitions to `CLOSED`
- **THEN** the symbol becomes available in Stocks Grid again
- **AND** additional same-day transactions for that symbol are stored as independent records

### Requirement: Redis Transaction Persistence Contract
Transaction records SHALL be persisted in Redis immediately on open and updated on close using the intraday transaction schema.

#### Scenario: Persist open transaction
- **WHEN** a transaction is created
- **THEN** Redis stores `symbol`, `positionType`, `openTimestamp`, `entryPrice`, `status`, and nullable close fields (`closeTimestamp`, `exitPrice`, `profitLoss`)

#### Scenario: Keep closed transactions visible until market close
- **WHEN** a transaction is `CLOSED`
- **THEN** it remains visible in Transactions Grid until market close for that trading day (`16:00 America/New_York`)
- **AND** it is not moved back to Stocks Grid as an open position card

#### Scenario: Freeze closed transaction data
- **WHEN** a transaction is `CLOSED`
- **THEN** its displayed values and persisted close-state fields are treated as immutable for the rest of the trading day
- **AND** subsequent symbol re-trades create new transaction records instead of mutating the closed record
