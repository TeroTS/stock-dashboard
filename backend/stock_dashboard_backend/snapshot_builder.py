"""Snapshot payload serializers for market-state read models."""

from collections.abc import Iterable
from typing import Any, Protocol

from stock_dashboard_backend.market_state import ACTIVE_TRANSACTION_STATUSES


class LinePointLike(Protocol):
    timestamp: int
    close: float


class SymbolStateLike(Protocol):
    symbol: str
    official_open_price: float
    close: float
    percent_change: float
    points: list[LinePointLike]


class TransactionStateLike(Protocol):
    transaction_id: str
    symbol: str
    position_type: str
    status: str
    submitted_at: int
    opened_at: int | None
    closed_at: int | None
    entry_price: float | None
    exit_price: float | None
    profit_loss: float | None
    points: list[LinePointLike]


class MarketStateLike(Protocol):
    updated_at: int
    symbols: dict[str, SymbolStateLike]
    transactions: list[TransactionStateLike]


def line_point_payload(point: LinePointLike) -> dict[str, int | float]:
    return {"timestamp": point.timestamp, "close": point.close}


def symbol_state_payload(state: SymbolStateLike) -> dict[str, Any]:
    return {
        "symbol": state.symbol,
        "close": state.close,
        "officialOpenPrice": state.official_open_price,
        "percentChange": state.percent_change,
        "points": [line_point_payload(point) for point in state.points],
    }


def transaction_state_payload(transaction: TransactionStateLike) -> dict[str, Any]:
    return {
        "transactionId": transaction.transaction_id,
        "symbol": transaction.symbol,
        "positionType": transaction.position_type,
        "status": transaction.status,
        "submittedAt": transaction.submitted_at,
        "openedAt": transaction.opened_at,
        "closedAt": transaction.closed_at,
        "entryPrice": transaction.entry_price,
        "exitPrice": transaction.exit_price,
        "profitLoss": transaction.profit_loss,
        "points": [line_point_payload(point) for point in transaction.points],
    }


def build_snapshot(
    updated_at: int,
    top_gainers: Iterable[SymbolStateLike],
    top_losers: Iterable[SymbolStateLike],
    transactions: Iterable[TransactionStateLike],
) -> dict[str, Any]:
    return {
        "updatedAt": updated_at,
        "topGainers": [symbol_state_payload(state) for state in top_gainers],
        "topLosers": [symbol_state_payload(state) for state in top_losers],
        "transactions": [transaction_state_payload(transaction) for transaction in transactions],
    }


def build_market_snapshot(state: MarketStateLike) -> dict[str, Any]:
    active_symbols = {
        transaction.symbol
        for transaction in state.transactions
        if transaction.status in ACTIVE_TRANSACTION_STATUSES
    }
    ranked = sorted(
        (symbol for symbol in state.symbols.values() if symbol.symbol not in active_symbols),
        key=lambda symbol: symbol.percent_change,
    )

    return build_snapshot(
        updated_at=state.updated_at,
        top_gainers=reversed(ranked[-5:]),
        top_losers=ranked[:5],
        transactions=state.transactions,
    )
