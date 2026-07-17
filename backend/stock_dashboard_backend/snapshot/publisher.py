"""Websocket snapshot fanout and coalesced publish queue for the stock dashboard."""

import asyncio
import contextlib
import logging
import time
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from stock_dashboard_backend.snapshot.metrics import _PublisherMetrics

logger = logging.getLogger(__name__)


class SnapshotPublisher:
    """Tracks websocket clients and fans out full snapshot payloads."""

    def __init__(self, snapshot_interval_seconds: float = 0.1) -> None:
        self.connections: set[WebSocket] = set()
        self._publish_task: asyncio.Task[None] | None = None
        self._pending_snapshot: dict[str, Any] | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._snapshot_interval_seconds = snapshot_interval_seconds
        self._metrics = _PublisherMetrics()

    async def connect(self, websocket: WebSocket, snapshot: dict[str, Any] | None = None) -> None:
        self._bind_to_running_loop()
        await websocket.accept()
        self.connections.add(websocket)
        if snapshot is not None:
            await self._send_snapshot(websocket, snapshot)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    def publish(self, snapshot: dict[str, Any]) -> None:
        self._bind_to_running_loop()
        self._metrics.record_publish(
            now=time.monotonic(),
            overwrote_pending=self._pending_snapshot is not None,
        )
        self._pending_snapshot = snapshot
        if self._publish_task is None or self._publish_task.done():
            self._publish_task = asyncio.create_task(self._drain_snapshot_publish_queue())

    async def stop(self) -> None:
        if self._publish_task is not None:
            self._publish_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._publish_task

    def metrics(self) -> dict[str, Any]:
        return self._metrics.snapshot(now=time.monotonic())

    async def broadcast(self, snapshot: dict[str, Any]) -> None:
        for websocket in list(self.connections):
            await self._send_snapshot(websocket, snapshot)

    def _bind_to_running_loop(self) -> None:
        running_loop = asyncio.get_running_loop()
        if self._loop is None:
            self._loop = running_loop
            return

        if self._loop is not running_loop:
            raise RuntimeError("SnapshotPublisher used from multiple event loops")

    async def _drain_snapshot_publish_queue(self) -> None:
        while self._pending_snapshot is not None:
            snapshot = self._pending_snapshot
            self._pending_snapshot = None
            started_at = time.perf_counter()
            await self.broadcast(snapshot)
            self._metrics.record_broadcast(
                now=time.monotonic(),
                duration_ms=(time.perf_counter() - started_at) * 1000,
            )

            if self._pending_snapshot is None:
                return

            await asyncio.sleep(self._snapshot_interval_seconds)

    async def _send_snapshot(self, websocket: WebSocket, snapshot: dict[str, Any]) -> None:
        try:
            await websocket.send_json(snapshot)
        except (RuntimeError, WebSocketDisconnect, Exception) as error:
            logger.warning(
                "event=websocket_snapshot_send outcome=disconnected reason=send_failed error=%s",
                error.__class__.__name__,
            )
            self.disconnect(websocket)
