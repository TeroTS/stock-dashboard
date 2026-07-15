"""Runtime state, snapshot assembly, and mock feed behavior for the stock dashboard."""

import asyncio
import contextlib
import os
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket

DEFAULT_WATCHLIST = (
    "AAPL",
    "MSFT",
    "NVDA",
    "TSLA",
    "AMZN",
    "META",
    "GOOG",
    "NFLX",
    "AMD",
    "INTC",
)

DEFAULT_OPEN_PRICES = {
    "AAPL": 210.0,
    "MSFT": 455.0,
    "NVDA": 128.0,
    "TSLA": 190.0,
    "AMZN": 220.0,
    "META": 710.0,
    "GOOG": 182.0,
    "NFLX": 1210.0,
    "AMD": 175.0,
    "INTC": 23.0,
}


@dataclass(slots=True)
class Settings:
    """Runtime configuration for feed mode, watchlist scope, and mock pricing defaults."""
    feed_mode: str = field(default_factory=lambda: os.getenv("FEED_MODE", "mock"))
    mock_interval_seconds: float = 1.0
    watchlist: tuple[str, ...] = DEFAULT_WATCHLIST
    mock_open_prices: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_OPEN_PRICES))


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
    def apply_update(self, settings: Settings, update: AggregateUpdate) -> bool:
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


class SnapshotPublisher:
    """Tracks websocket clients and fans out full snapshot payloads."""
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, snapshot: dict[str, Any] | None = None) -> None:
        await websocket.accept()
        self.connections.add(websocket)
        if snapshot is not None:
            await websocket.send_json(snapshot)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, snapshot: dict[str, Any]) -> None:
        if not self.connections:
            return

        stale_connections: list[WebSocket] = []
        for websocket in list(self.connections):
            try:
                await websocket.send_json(snapshot)
            except RuntimeError:
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(websocket)


class Runtime:
    """Coordinates feed lifecycle, market-state updates, and snapshot publishing."""
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.market_state = MarketState()
        self.publisher = SnapshotPublisher()
        self._feed_task: asyncio.Task[None] | None = None
        self._tick = 0

    async def start(self) -> None:
        if self.settings.feed_mode == "mock":
            self._feed_task = asyncio.create_task(self._run_mock_feed())

    async def stop(self) -> None:
        if self._feed_task is None:
            return

        self._feed_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._feed_task

    async def connect(self, websocket: WebSocket) -> None:
        snapshot = self.market_state.snapshot() if self.market_state.symbols else None
        await self.publisher.connect(websocket, snapshot)

    def disconnect(self, websocket: WebSocket) -> None:
        self.publisher.disconnect(websocket)

    async def apply_update(self, update: AggregateUpdate) -> None:
        if not self.market_state.apply_update(self.settings, update):
            return

        await self.publisher.broadcast(self.market_state.snapshot())

    # Alternate positive and negative movers so local development always has visible gainers and losers.
    async def _run_mock_feed(self) -> None:
        while True:
            timestamp = int(time.time() * 1000)
            for index, symbol in enumerate(self.settings.watchlist):
                open_price = self.settings.mock_open_prices.get(symbol, 100.0 + index * 10)
                trend = 0.012 if index % 2 == 0 else -0.012
                wave = (((self._tick + index) % 5) - 2) * 0.0035
                close = round(open_price * (1 + trend + wave), 2)
                await self.apply_update(
                    AggregateUpdate(
                        symbol=symbol,
                        official_open_price=open_price,
                        close=close,
                        end_timestamp=timestamp,
                    )
                )

            self._tick += 1
            await asyncio.sleep(self.settings.mock_interval_seconds)
