"""Market-state models and snapshot assembly for the stock dashboard."""

import time
from dataclasses import dataclass, field
from typing import Any


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


class MarketState:
    """Owns watched-symbol state mutation and full snapshot assembly."""

    def __init__(self) -> None:
        self.symbols: dict[str, SymbolState] = {}
        self.updated_at = int(time.time() * 1000)

    # Keep symbol state and point history aligned with the websocket snapshot contract.
    def apply_update(self, settings: Any, update: AggregateUpdate) -> bool:
        if update.official_open_price is None or update.symbol not in settings.watchlist:
            return False

        state = self.symbols.get(update.symbol)
        points = list(state.points) if state else []
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
        self.updated_at = update.end_timestamp
        return True

    # Each websocket message is a full replacement snapshot for the frontend read model.
    def snapshot(self) -> dict[str, Any]:
        ranked = sorted(self.symbols.values(), key=lambda symbol: symbol.percent_change)
        top_losers = ranked[:5]
        top_gainers = reversed(ranked[-5:])

        return {
            "updatedAt": self.updated_at,
            "topGainers": [state.to_payload() for state in top_gainers],
            "topLosers": [state.to_payload() for state in top_losers],
            "transactions": [],
        }
