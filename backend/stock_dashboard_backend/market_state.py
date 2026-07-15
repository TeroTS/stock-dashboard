"""Market-state models and snapshot assembly for the stock dashboard."""

import time
from collections.abc import Collection
from dataclasses import dataclass, field
from typing import Any, Literal

PositionType = Literal["LONG", "SHORT"]
TransactionStatus = Literal["PENDING_OPEN", "OPEN", "PENDING_CLOSE", "CLOSED"]
ACTIVE_TRANSACTION_STATUSES = {"PENDING_OPEN", "OPEN", "PENDING_CLOSE"}


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

    def to_payload(self) -> dict[str, int | float]:
        return {"timestamp": self.timestamp, "close": self.close}


@dataclass(slots=True)
class SymbolState:
    """In-memory read model for one watched symbol and its chart history."""

    symbol: str
    official_open_price: float
    close: float
    percent_change: float
    points: list[LinePoint] = field(default_factory=list)

    def to_payload(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "close": self.close,
            "officialOpenPrice": self.official_open_price,
            "percentChange": self.percent_change,
            "points": [point.to_payload() for point in self.points],
        }


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

    def to_payload(self) -> dict[str, Any]:
        return {
            "transactionId": self.transaction_id,
            "symbol": self.symbol,
            "positionType": self.position_type,
            "status": self.status,
            "submittedAt": self.submitted_at,
            "openedAt": self.opened_at,
            "closedAt": self.closed_at,
            "entryPrice": self.entry_price,
            "exitPrice": self.exit_price,
            "profitLoss": self.profit_loss,
            "points": [point.to_payload() for point in self.points],
        }


@dataclass(slots=True, frozen=True)
class TransactionCommandRejected(Exception):
    """Domain rejection for invalid transaction commands."""

    code: str


class MarketState:
    """Owns watched-symbol state mutation, transaction state, and full snapshot assembly."""

    def __init__(self) -> None:
        self.symbols: dict[str, SymbolState] = {}
        self.transactions: list[TransactionState] = []
        self.updated_at = int(time.time() * 1000)
        self._next_transaction_id = 1

    # Keep symbol state and point history aligned with the websocket snapshot contract.
    def apply_update(self, watchlist: Collection[str], update: AggregateUpdate) -> bool:
        if update.official_open_price is None or update.symbol not in watchlist:
            return False

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
        self._sync_live_transactions(update, points)
        self.updated_at = update.end_timestamp
        return True

    # Reject opens without live state and hide symbols once they already have a live transaction.
    def open_transaction(
        self,
        symbol: str,
        position_type: PositionType,
        submitted_at: int,
    ) -> dict[str, str]:
        symbol_state = self.symbols.get(symbol)
        if symbol_state is None:
            raise TransactionCommandRejected(code="latest_price_unavailable")

        if self._has_active_transaction(symbol):
            raise TransactionCommandRejected(code="symbol_transaction_conflict")

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

    # Each websocket message is a full replacement snapshot for the frontend read model.
    def snapshot(self) -> dict[str, Any]:
        active_symbols = {
            transaction.symbol
            for transaction in self.transactions
            if transaction.status in ACTIVE_TRANSACTION_STATUSES
        }
        ranked = sorted(
            (symbol for symbol in self.symbols.values() if symbol.symbol not in active_symbols),
            key=lambda symbol: symbol.percent_change,
        )
        top_losers = ranked[:5]
        top_gainers = reversed(ranked[-5:])

        return {
            "updatedAt": self.updated_at,
            "topGainers": [state.to_payload() for state in top_gainers],
            "topLosers": [state.to_payload() for state in top_losers],
            "transactions": [transaction.to_payload() for transaction in self.transactions],
        }

    def _has_active_transaction(self, symbol: str) -> bool:
        return any(
            transaction.symbol == symbol and transaction.status in ACTIVE_TRANSACTION_STATUSES
            for transaction in self.transactions
        )

    # Live transaction charts mirror accepted symbol updates until the position is closed.
    def _sync_live_transactions(self, update: AggregateUpdate, points: list[LinePoint]) -> None:
        for transaction in self.transactions:
            if transaction.symbol != update.symbol or transaction.status == "CLOSED":
                continue

            transaction.points = points.copy()
            if transaction.status == "PENDING_OPEN":
                transaction.status = "OPEN"
                transaction.opened_at = update.end_timestamp
                transaction.entry_price = update.close
