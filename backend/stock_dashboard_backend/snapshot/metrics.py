"""Snapshot publisher instrumentation helpers for the stock dashboard."""

from collections import deque
from typing import Any

RATE_WINDOW_SECONDS = 1.0
BROADCAST_DURATION_BUCKETS = (1.0, 5.0, 10.0, 25.0, 50.0, 100.0)


class _PublisherMetrics:
    def __init__(self) -> None:
        self.publish_count = 0
        self.broadcast_count = 0
        self.overwrite_count = 0
        self.publish_timestamps: deque[float] = deque()
        self.broadcast_timestamps: deque[float] = deque()
        self.broadcast_duration_histogram = {
            "<=1ms": 0,
            "<=5ms": 0,
            "<=10ms": 0,
            "<=25ms": 0,
            "<=50ms": 0,
            "<=100ms": 0,
            ">100ms": 0,
        }

    def record_publish(self, now: float, overwrote_pending: bool) -> None:
        self.publish_count += 1
        self._record_rate(self.publish_timestamps, now)
        if overwrote_pending:
            self.overwrite_count += 1

    def record_broadcast(self, now: float, duration_ms: float) -> None:
        self.broadcast_count += 1
        self._record_rate(self.broadcast_timestamps, now)
        self._record_broadcast_duration(duration_ms)

    def snapshot(self, now: float) -> dict[str, Any]:
        self._prune_rate_window(self.publish_timestamps, now)
        self._prune_rate_window(self.broadcast_timestamps, now)
        return {
            "publishCount": self.publish_count,
            "broadcastCount": self.broadcast_count,
            "overwriteCount": self.overwrite_count,
            "inputRatePerSecond": len(self.publish_timestamps),
            "outputRatePerSecond": len(self.broadcast_timestamps),
            "broadcastDurationMsHistogram": dict(self.broadcast_duration_histogram),
        }

    def _record_rate(self, timestamps: deque[float], now: float) -> None:
        timestamps.append(now)
        self._prune_rate_window(timestamps, now)

    def _prune_rate_window(self, timestamps: deque[float], now: float) -> None:
        cutoff = now - RATE_WINDOW_SECONDS
        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

    def _record_broadcast_duration(self, duration_ms: float) -> None:
        for bucket_ms in BROADCAST_DURATION_BUCKETS:
            if duration_ms <= bucket_ms:
                self.broadcast_duration_histogram[f"<={int(bucket_ms)}ms"] += 1
                return

        self.broadcast_duration_histogram[">100ms"] += 1
