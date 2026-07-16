"""Runtime lifecycle and websocket fanout for the stock dashboard."""

import asyncio
import contextlib
import logging
import os
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from massive import WebSocketClient

from stock_dashboard_backend.market_state import (
    AggregateUpdate,
    MarketState,
    PositionType,
    TransactionCommandRejected,
)
from stock_dashboard_backend.massive_feed import (
    aggregate_update_from_message,
    create_massive_client,
)

WATCHLIST_PATH = Path(__file__).resolve().parent.parent / "watchlist.txt"
logger = logging.getLogger(__name__)


# Load symbols from the repo-owned config file so the runtime and UI follow the same backend-owned list.
def load_watchlist() -> tuple[str, ...]:
    if not WATCHLIST_PATH.is_file():
        raise ValueError(f"watchlist file is missing: {WATCHLIST_PATH}")

    symbols: list[str] = []
    seen: set[str] = set()

    for line in WATCHLIST_PATH.read_text(encoding="utf-8").splitlines():
        symbol = line.strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        symbols.append(symbol)

    if not symbols:
        raise ValueError(f"watchlist file is empty: {WATCHLIST_PATH}")

    return tuple(symbols)


@dataclass(slots=True)
class Settings:
    """Runtime configuration for Massive credentials and watchlist scope."""

    massive_api_key: str = field(default_factory=lambda: os.getenv("MASSIVE_API_KEY", ""))
    watchlist: tuple[str, ...] = field(default_factory=load_watchlist)


class SnapshotPublisher:
    """Tracks websocket clients and fans out full snapshot payloads."""

    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, snapshot: dict[str, Any] | None = None) -> None:
        await websocket.accept()
        self.connections.add(websocket)
        if snapshot is not None:
            await self._send_snapshot(websocket, snapshot)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, snapshot: dict[str, Any]) -> None:
        for websocket in list(self.connections):
            await self._send_snapshot(websocket, snapshot)

    async def _send_snapshot(self, websocket: WebSocket, snapshot: dict[str, Any]) -> None:
        try:
            await websocket.send_json(snapshot)
        except (RuntimeError, WebSocketDisconnect):
            self.disconnect(websocket)


class Runtime:
    """Coordinates Massive feed lifecycle, market-state updates, and snapshot publishing."""

    def __init__(
        self,
        settings: Settings,
        massive_client_options: dict[str, Any] | None = None,
    ) -> None:
        self.settings = settings
        self.market_state = MarketState()
        self.publisher = SnapshotPublisher()
        self._feed_task: asyncio.Task[None] | None = None
        self._massive_client: WebSocketClient | None = None
        self._massive_client_options = dict(massive_client_options or {})

    async def start(self) -> None:
        if not self.settings.massive_api_key:
            logger.error("event=massive_feed_start outcome=error reason=missing_api_key")
            raise ValueError("MASSIVE_API_KEY is required")

        self._massive_client = create_massive_client(
            api_key=self.settings.massive_api_key,
            watchlist=self.settings.watchlist,
            client_options=self._massive_client_options,
        )
        logger.info(
            "event=massive_feed_start outcome=started watchlistCount=%s",
            len(self.settings.watchlist),
        )
        logger.info(
            "event=massive_feed_subscribe outcome=scheduled watchlistCount=%s",
            len(self.settings.watchlist),
        )
        self._feed_task = asyncio.create_task(self._run_massive_feed(self._massive_client))

    async def stop(self) -> None:
        if self._massive_client is not None and self._massive_client.websocket is not None:
            await self._massive_client.close()

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
        result = self.market_state.apply_update(self.settings.watchlist, update)
        if not result.accepted:
            return

        if result.filled_open is not None:
            logger.info(
                "event=transaction_open_fill outcome=filled transactionId=%s symbol=%s openedAt=%s entryPrice=%s",
                result.filled_open.transaction_id,
                result.filled_open.symbol,
                result.filled_open.opened_at,
                result.filled_open.entry_price,
            )

        if result.filled_close is not None:
            logger.info(
                "event=transaction_close_fill outcome=filled transactionId=%s symbol=%s closedAt=%s exitPrice=%s",
                result.filled_close.transaction_id,
                result.filled_close.symbol,
                result.filled_close.closed_at,
                result.filled_close.exit_price,
            )

        await self.publisher.broadcast(self.market_state.snapshot())

    async def open_transaction(
        self,
        symbol: str,
        position_type: PositionType,
    ) -> dict[str, str]:
        try:
            accepted = self.market_state.open_transaction(
                symbol,
                position_type,
                int(time.time() * 1000),
            )
        except TransactionCommandRejected as error:
            logger.warning(
                "event=transaction_open outcome=rejected symbol=%s reason=%s errorCode=%s",
                symbol,
                error.code,
                error.code,
            )
            raise

        logger.info(
            "event=transaction_open outcome=accepted transactionId=%s symbol=%s positionType=%s status=%s",
            accepted["transactionId"],
            symbol,
            position_type,
            accepted["status"],
        )
        await self.publisher.broadcast(self.market_state.snapshot())
        return accepted

    async def close_transaction(self, transaction_id: str) -> dict[str, str]:
        return await self._run_transaction_command(
            command=lambda submitted_at: self.market_state.close_transaction(transaction_id, submitted_at),
            rejected_log=(
                "event=transaction_close outcome=rejected transactionId=%s reason=%s errorCode=%s",
                transaction_id,
            ),
            accepted_log=(
                "event=transaction_close outcome=accepted transactionId=%s status=%s",
            ),
        )

    async def cancel_open_transaction(self, transaction_id: str) -> dict[str, str]:
        return await self._run_transaction_command(
            command=lambda submitted_at: self.market_state.cancel_open_transaction(transaction_id, submitted_at),
            rejected_log=(
                "event=transaction_open_cancel outcome=rejected transactionId=%s reason=%s errorCode=%s",
                transaction_id,
            ),
            accepted_log=(
                "event=transaction_open_cancel outcome=accepted transactionId=%s status=%s",
            ),
        )

    async def _run_transaction_command(
        self,
        command: Callable[[int], dict[str, str]],
        rejected_log: tuple[str, str],
        accepted_log: tuple[str],
    ) -> dict[str, str]:
        try:
            accepted = command(int(time.time() * 1000))
        except TransactionCommandRejected as error:
            logger.warning(rejected_log[0], rejected_log[1], error.code, error.code)
            raise

        logger.info(accepted_log[0], accepted["transactionId"], accepted["status"])
        await self.publisher.broadcast(self.market_state.snapshot())
        return accepted

    async def _handle_massive_messages(self, messages: list[Any]) -> None:
        for message in messages:
            update = aggregate_update_from_message(message)
            if update is not None:
                await self.apply_update(update)

    async def _run_massive_feed(self, client: WebSocketClient) -> None:
        try:
            await client.connect(self._handle_massive_messages)
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logger.warning(
                "event=massive_feed_connect outcome=stopped reason=connection_error error=%s",
                error,
            )
