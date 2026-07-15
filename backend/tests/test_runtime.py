import asyncio

from starlette.websockets import WebSocketDisconnect

from stock_dashboard_backend.market_state import AggregateUpdate, MarketState
from stock_dashboard_backend.runtime import Settings, SnapshotPublisher


class DisconnectingWebSocket:
    def __init__(self) -> None:
        self.accepted = False

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, payload: object) -> None:
        raise WebSocketDisconnect(code=1006)


def test_snapshot_publisher_drops_socket_if_initial_snapshot_send_fails() -> None:
    publisher = SnapshotPublisher()
    websocket = DisconnectingWebSocket()

    asyncio.run(publisher.connect(websocket, {"updatedAt": 1}))

    assert websocket.accepted is True
    assert websocket not in publisher.connections


def test_market_state_ranks_symbols_from_aggregate_updates() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL", "TSLA", "NVDA"))
    market_state = MarketState()

    assert market_state.apply_update(
        settings,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=105.0,
            end_timestamp=1_000,
        ),
    ) is True
    assert market_state.apply_update(
        settings,
        AggregateUpdate(
            symbol="TSLA",
            official_open_price=200.0,
            close=190.0,
            end_timestamp=1_100,
        ),
    ) is True
    assert market_state.apply_update(
        settings,
        AggregateUpdate(
            symbol="NVDA",
            official_open_price=None,
            close=300.0,
            end_timestamp=1_200,
        ),
    ) is False

    snapshot = market_state.snapshot()

    assert snapshot["updatedAt"] == 1_100
    assert [card["symbol"] for card in snapshot["topGainers"]] == ["AAPL", "TSLA"]
    assert [card["symbol"] for card in snapshot["topLosers"]] == ["TSLA", "AAPL"]
