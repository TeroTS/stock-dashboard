"""Runtime lifecycle and websocket fanout for the stock dashboard."""

import asyncio
import contextlib
import logging
import time
from typing import Any

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
from stock_dashboard_backend.settings import Settings
from stock_dashboard_backend.snapshot.builder import build_market_snapshot
from stock_dashboard_backend.snapshot.publisher import SnapshotPublisher

logger = logging.getLogger(__name__)


class Runtime:
    """Coordinates Massive feed lifecycle, market-state updates, and snapshot publishing."""

    def __init__(
        self,
        settings: Settings,
        massive_client_options: dict[str, Any] | None = None,
        snapshot_interval_seconds: float = 0.1,
        publisher_metrics_log_interval_seconds: float = 60.0,
    ) -> None:
        self.settings = settings
        self.market_state = MarketState()
        self.publisher = SnapshotPublisher(snapshot_interval_seconds=snapshot_interval_seconds)
        self._feed_task: asyncio.Task[None] | None = None
        self._publisher_metrics_task: asyncio.Task[None] | None = None
        self._massive_client: WebSocketClient | None = None
        self._massive_client_options = dict(massive_client_options or {})
        self._publisher_metrics_log_interval_seconds = publisher_metrics_log_interval_seconds

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
        if self._publisher_metrics_log_interval_seconds > 0:
            self._publisher_metrics_task = asyncio.create_task(self._log_publisher_metrics_periodically())

    async def stop(self) -> None:
        if self._massive_client is not None and self._massive_client.websocket is not None:
            await self._massive_client.close()

        if self._feed_task is not None:
            self._feed_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._feed_task

        if self._publisher_metrics_task is not None:
            self._publisher_metrics_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._publisher_metrics_task

        await self.publisher.stop()

    async def connect(self, websocket) -> None:
        snapshot = build_market_snapshot(self.market_state) if self.market_state.symbols else None
        await self.publisher.connect(websocket, snapshot)

    def disconnect(self, websocket) -> None:
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

        self.publisher.publish(build_market_snapshot(self.market_state))

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
        self.publisher.publish(build_market_snapshot(self.market_state))
        return accepted

    async def close_transaction(self, transaction_id: str) -> dict[str, str]:
        try:
            accepted = self.market_state.close_transaction(transaction_id, int(time.time() * 1000))
        except TransactionCommandRejected as error:
            logger.warning(
                "event=transaction_close outcome=rejected transactionId=%s reason=%s errorCode=%s",
                transaction_id,
                error.code,
                error.code,
            )
            raise

        logger.info(
            "event=transaction_close outcome=accepted transactionId=%s status=%s",
            accepted["transactionId"],
            accepted["status"],
        )
        self.publisher.publish(build_market_snapshot(self.market_state))
        return accepted

    async def cancel_open_transaction(self, transaction_id: str) -> dict[str, str]:
        try:
            accepted = self.market_state.cancel_open_transaction(transaction_id, int(time.time() * 1000))
        except TransactionCommandRejected as error:
            logger.warning(
                "event=transaction_open_cancel outcome=rejected transactionId=%s reason=%s errorCode=%s",
                transaction_id,
                error.code,
                error.code,
            )
            raise

        logger.info(
            "event=transaction_open_cancel outcome=accepted transactionId=%s status=%s",
            accepted["transactionId"],
            accepted["status"],
        )
        self.publisher.publish(build_market_snapshot(self.market_state))
        return accepted

    async def _handle_massive_messages(self, messages: list[Any]) -> None:
        for message in messages:
            update = aggregate_update_from_message(message)
            if update is not None:
                await self.apply_update(update)

    async def _log_publisher_metrics_periodically(self) -> None:
        while True:
            await asyncio.sleep(self._publisher_metrics_log_interval_seconds)
            metrics = self.publisher.metrics()
            logger.info(
                "event=snapshot_publisher_metrics outcome=observed publishCount=%s broadcastCount=%s overwriteCount=%s inputRatePerSecond=%s outputRatePerSecond=%s broadcastDurationMsHistogram=%s",
                metrics["publishCount"],
                metrics["broadcastCount"],
                metrics["overwriteCount"],
                metrics["inputRatePerSecond"],
                metrics["outputRatePerSecond"],
                metrics["broadcastDurationMsHistogram"],
            )

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
