"""Market-state models and mutation rules for the stock dashboard."""

import time
from collections.abc import Collection
from dataclasses import dataclass, field
from typing import Literal

PositionType = Literal["LONG", "SHORT"]
TransactionStatus = Literal["PENDING_OPEN", "OPEN", "PENDING_CLOSE", "CLOSED"]
ACTIVE_TRANSACTION_STATUSES = {"PENDING_OPEN", "OPEN", "PENDING_CLOSE"}
FIXED_SHARE_QUANTITY = 100
ERROR_LATEST_PRICE_UNAVAILABLE = "latest_price_unavailable"
ERROR_SYMBOL_TRANSACTION_CONFLICT = "symbol_transaction_conflict"
ERROR_TRANSACTION_NOT_FOUND = "transaction_not_found"
ERROR_TRANSACTION_STATE_CONFLICT = "transaction_state_conflict"
ERROR_TRANSACTION_CANCEL_STATE_CONFLICT = "transaction_cancel_state_conflict"


@dataclass(slots=True, frozen=True)
class AggregateUpdate:
    """Normalized provider update consumed by the in-memory market state."""

    symbol: str
    official_open_price: float | None
    close: float
    end_timestamp: int


@dataclass(slots=True)
class LinePoint:
    """Single close-price point stored on stock and transaction charts."""

    timestamp: int
    close: float


@dataclass(slots=True)
class SymbolState:
    """In-memory read model for one watched symbol and its chart history."""

    symbol: str
    official_open_price: float
    close: float
    percent_change: float
    points: list[LinePoint] = field(default_factory=list)


@dataclass(slots=True)
class TransactionState:
    """In-memory read model for one transaction shown on the dashboard."""

    transaction_id: str
    symbol: str
    position_type: PositionType
    status: TransactionStatus
    submitted_at: int
    opened_at: int | None
    closed_at: int | None
    entry_price: float | None
    exit_price: float | None
    profit_loss: float | None
    points: list[LinePoint] = field(default_factory=list)


@dataclass(slots=True, frozen=True)
class TransactionCommandRejected(Exception):
    """Domain rejection for invalid transaction commands."""

    code: str

    def __str__(self) -> str:
        return self.code


@dataclass(slots=True, frozen=True)
class ApplyUpdateResult:
    """Outcome of one accepted or ignored aggregate update."""

    accepted: bool
    filled_open: TransactionState | None = None
    filled_close: TransactionState | None = None


class MarketState:
    """Owns watched-symbol state mutation and transaction state."""

    def __init__(self) -> None:
        self.symbols: dict[str, SymbolState] = {}
        self.transactions: list[TransactionState] = []
        self.updated_at = int(time.time() * 1000)
        self._next_transaction_id = 1

    # Keep symbol state and point history aligned with the websocket snapshot contract.
    def apply_update(self, watchlist: Collection[str], update: AggregateUpdate) -> ApplyUpdateResult:
        if update.official_open_price is None or update.symbol not in watchlist:
            return ApplyUpdateResult(accepted=False)

        state = self.symbols.get(update.symbol)
        points = state.points.copy() if state else []
        point = LinePoint(timestamp=update.end_timestamp, close=update.close)

        if points and points[-1].close == update.close:
            points[-1] = point
        else:
            points.append(point)
            points = points[-300:]

        percent_change = round(
            ((update.close - update.official_open_price) / update.official_open_price) * 100,
            2,
        )
        self.symbols[update.symbol] = SymbolState(
            symbol=update.symbol,
            official_open_price=update.official_open_price,
            close=update.close,
            percent_change=percent_change,
            points=points,
        )
        filled_open, filled_close = self._sync_live_transactions(update, points)
        self.updated_at = update.end_timestamp
        return ApplyUpdateResult(
            accepted=True,
            filled_open=filled_open,
            filled_close=filled_close,
        )

    # Reject opens without live state and hide symbols once they already have a live transaction.
    def open_transaction(
        self,
        symbol: str,
        position_type: PositionType,
        submitted_at: int,
    ) -> dict[str, str]:
        symbol_state = self.symbols.get(symbol)
        if symbol_state is None:
            raise TransactionCommandRejected(code=ERROR_LATEST_PRICE_UNAVAILABLE)

        if self._has_active_transaction(symbol):
            raise TransactionCommandRejected(code=ERROR_SYMBOL_TRANSACTION_CONFLICT)

        transaction_id = f"tx-{self._next_transaction_id:06d}"
        self._next_transaction_id += 1
        self.transactions.append(
            TransactionState(
                transaction_id=transaction_id,
                symbol=symbol,
                position_type=position_type,
                status="PENDING_OPEN",
                submitted_at=submitted_at,
                opened_at=None,
                closed_at=None,
                entry_price=None,
                exit_price=None,
                profit_loss=None,
                points=symbol_state.points.copy(),
            )
        )
        self.updated_at = submitted_at
        return {"transactionId": transaction_id, "status": "PENDING_OPEN"}

    # Only open transactions can be queued for next-tick close fills.
    def close_transaction(self, transaction_id: str, submitted_at: int) -> dict[str, str]:
        transaction = self._transaction_by_id(transaction_id)
        if transaction is None:
            raise TransactionCommandRejected(code=ERROR_TRANSACTION_NOT_FOUND)

        if transaction.status != "OPEN":
            raise TransactionCommandRejected(code=ERROR_TRANSACTION_STATE_CONFLICT)

        transaction.status = "PENDING_CLOSE"
        self.updated_at = submitted_at
        return {"transactionId": transaction_id, "status": "PENDING_CLOSE"}

    def cancel_open_transaction(self, transaction_id: str, submitted_at: int) -> dict[str, str]:
        transaction = self._transaction_by_id(transaction_id)
        if transaction is None:
            raise TransactionCommandRejected(code=ERROR_TRANSACTION_NOT_FOUND)

        if transaction.status != "PENDING_OPEN":
            raise TransactionCommandRejected(code=ERROR_TRANSACTION_CANCEL_STATE_CONFLICT)

        self.transactions.remove(transaction)
        self.updated_at = submitted_at
        return {"transactionId": transaction_id, "status": "CANCELED"}

    def _has_active_transaction(self, symbol: str) -> bool:
        return any(
            transaction.symbol == symbol and transaction.status in ACTIVE_TRANSACTION_STATUSES
            for transaction in self.transactions
        )

    def _transaction_by_id(self, transaction_id: str) -> TransactionState | None:
        return next(
            (
                transaction
                for transaction in self.transactions
                if transaction.transaction_id == transaction_id
            ),
            None,
        )

    # Live transaction charts mirror accepted symbol updates until the position is closed.
    def _sync_live_transactions(
        self,
        update: AggregateUpdate,
        points: list[LinePoint],
    ) -> tuple[TransactionState | None, TransactionState | None]:
        filled_open: TransactionState | None = None
        filled_close: TransactionState | None = None

        for transaction in self.transactions:
            if transaction.symbol != update.symbol or transaction.status == "CLOSED":
                continue

            transaction.points = points.copy()
            if transaction.status == "PENDING_CLOSE":
                transaction.status = "CLOSED"
                transaction.closed_at = update.end_timestamp
                transaction.exit_price = update.close
                transaction.profit_loss = self._profit_loss(transaction, update.close)
                filled_close = transaction
                continue

            if transaction.status == "PENDING_OPEN":
                transaction.status = "OPEN"
                transaction.opened_at = update.end_timestamp
                transaction.entry_price = update.close
                filled_open = transaction

        return filled_open, filled_close

    def _profit_loss(self, transaction: TransactionState, exit_price: float) -> float:
        entry_price = transaction.entry_price
        assert entry_price is not None

        if transaction.position_type == "LONG":
            raw_profit_loss = (exit_price - entry_price) * FIXED_SHARE_QUANTITY
        else:
            raw_profit_loss = (entry_price - exit_price) * FIXED_SHARE_QUANTITY

        return round(raw_profit_loss, 2)
