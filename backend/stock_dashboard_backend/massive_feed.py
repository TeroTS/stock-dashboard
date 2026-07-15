"""Massive client setup and provider-message mapping for the stock dashboard."""

import logging
from typing import Any

from massive import WebSocketClient
from massive.websocket.models import Feed, Market

from stock_dashboard_backend.market_state import AggregateUpdate

logger = logging.getLogger(__name__)


# Schedule per-symbol aggregate subscriptions on the official Massive client.
def create_massive_client(
    api_key: str,
    watchlist: tuple[str, ...],
    client_options: dict[str, Any] | None = None,
) -> WebSocketClient:
    options: dict[str, Any] = {
        "feed": Feed.Delayed,
        "market": Market.Stocks,
        "max_reconnects": None,
    }
    options.update(client_options or {})

    client = WebSocketClient(api_key=api_key, **options)
    client.subscribe(*(f"A.{symbol}" for symbol in watchlist))
    return client


# Massive callbacks already deliver parsed objects, so only the required aggregate fields are mapped.
def aggregate_update_from_message(message: Any) -> AggregateUpdate | None:
    symbol = getattr(message, "symbol", None)
    close = getattr(message, "close", None)
    end_timestamp = getattr(message, "end_timestamp", None)
    official_open_price = getattr(message, "official_open_price", None)

    if symbol is None or close is None or end_timestamp is None:
        return None

    try:
        return AggregateUpdate(
            symbol=str(symbol),
            official_open_price=None if official_open_price is None else float(official_open_price),
            close=float(close),
            end_timestamp=int(end_timestamp),
        )
    except (TypeError, ValueError):
        logger.warning("event=massive_feed_message outcome=ignored reason=invalid_payload")
        return None
