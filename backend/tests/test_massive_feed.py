from types import SimpleNamespace

from massive.websocket.models import Market

from stock_dashboard_backend.market_state import AggregateUpdate
from stock_dashboard_backend.massive_feed import (
    aggregate_update_from_message,
    create_massive_client,
)


def test_aggregate_update_from_message_maps_provider_fields() -> None:
    message = SimpleNamespace(
        symbol="AAPL",
        official_open_price=100.0,
        close=101.5,
        end_timestamp=1_700_000_000_100,
    )

    assert aggregate_update_from_message(message) == AggregateUpdate(
        symbol="AAPL",
        official_open_price=100.0,
        close=101.5,
        end_timestamp=1_700_000_000_100,
    )


def test_aggregate_update_from_message_ignores_incomplete_payloads() -> None:
    message = SimpleNamespace(symbol="AAPL", close=101.5)

    assert aggregate_update_from_message(message) is None


def test_create_massive_client_schedules_watchlist_subscriptions() -> None:
    client = create_massive_client(
        api_key="test-api-key",
        watchlist=("AAPL", "TSLA"),
        client_options={"feed": "127.0.0.1:9001", "secure": False, "max_reconnects": 0},
    )

    assert client.api_key == "test-api-key"
    assert client.market == Market.Stocks
    assert client.scheduled_subs == {"A.AAPL", "A.TSLA"}
