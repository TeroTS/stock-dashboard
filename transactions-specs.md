# Transaction Grid Behavior Specification

## Overview

When a stock position is opened (buy or short sell), it transitions from the Stocks Grid to the Transactions Grid. The Transactions Grid displays active and completed intraday transactions with status and financial outcome information.

---

## 1. Opening a Transaction

### 1.1 Position Creation

When a symbol is bought (LONG) or sold short (SHORT):

- The corresponding grid item SHALL be removed from the Stocks Grid.
- The grid item SHALL be inserted into the Transactions Grid.

### 1.2 Transactions Grid Layout

The Transactions Grid:

- SHALL be positioned below the Stocks Grids.
- SHALL use a dynamic layout.
- SHALL support a maximum width of 5 items per row.

### 1.3 Grid Item Header

Upon transaction creation, the grid item header SHALL display:

- The transaction timestamp.
- The position type indicator: `LONG` or `SHORT`.

### 1.4 Persistence

- The transaction SHALL be persisted in Redis immediately upon creation.

---

## 2. Transaction Actions

### 2.1 Action Buttons

Each open transaction item SHALL include:

- A **Sell** button for LONG positions.
- A **Cover** button for SHORT positions.

### 2.2 Closing a Transaction

When the Sell or Cover button is clicked:

- The system SHALL calculate the profit or loss amount.
- The transaction record in Redis SHALL be updated with the profit/loss value.
- The profit/loss amount SHALL be displayed in the grid item header.

---

## 3. Transaction Lifecycle

### 3.1 Visibility After Close

After a transaction is closed:

- The grid item SHALL remain in the Transactions Grid.
- The grid item SHALL remain visible until market close for that trading day.

### 3.2 Availability in Stocks Grid

While a transaction is OPEN:

- The symbol SHALL NOT be available in the Stocks Grid.

After a transaction is CLOSED:

- The symbol SHALL become available again in the Stocks Grid.
- The same symbol MAY be traded multiple times within the same trading day.
- Each transaction SHALL be stored as an independent record.

---

## 4. Data Model (Redis Persistence)

Each transaction record stored in Redis SHALL include:

- `symbol`
- `positionType` (`LONG` or `SHORT`)
- `openTimestamp`
- `closeTimestamp` (nullable)
- `entryPrice`
- `exitPrice` (nullable)
- `profitLoss` (nullable until closed)
- `status` (`OPEN` or `CLOSED`)
