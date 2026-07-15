import asyncio

import pytest
from starlette.websockets import WebSocketDisconnect

from stock_dashboard_backend.market_state import AggregateUpdate, MarketState, TransactionCommandRejected
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

    first_result = market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=105.0,
            end_timestamp=1_000,
        ),
    )
    second_result = market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="TSLA",
            official_open_price=200.0,
            close=190.0,
            end_timestamp=1_100,
        ),
    )
    ignored_result = market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="NVDA",
            official_open_price=None,
            close=300.0,
            end_timestamp=1_200,
        ),
    )

    assert first_result.accepted is True
    assert second_result.accepted is True
    assert ignored_result.accepted is False

    snapshot = market_state.snapshot()

    assert snapshot["updatedAt"] == 1_100
    assert [card["symbol"] for card in snapshot["topGainers"]] == ["AAPL", "TSLA"]
    assert [card["symbol"] for card in snapshot["topLosers"]] == ["TSLA", "AAPL"]


def test_market_state_updates_last_point_when_price_is_unchanged() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()

    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=105.0,
            end_timestamp=1_000,
        ),
    )
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=105.0,
            end_timestamp=1_100,
        ),
    )

    snapshot = market_state.snapshot()

    assert snapshot["topGainers"][0]["points"] == [{"timestamp": 1_100, "close": 105.0}]


def test_market_state_caps_point_history_at_300_items() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()

    for timestamp in range(301):
        market_state.apply_update(
            settings.watchlist,
            AggregateUpdate(
                symbol="AAPL",
                official_open_price=100.0,
                close=100.0 + timestamp,
                end_timestamp=timestamp,
            ),
        )

    points = market_state.snapshot()["topGainers"][0]["points"]

    assert len(points) == 300
    assert points[0] == {"timestamp": 1, "close": 101.0}
    assert points[-1] == {"timestamp": 300, "close": 400.0}


def test_market_state_fills_pending_open_on_next_same_symbol_update() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=101.5,
            end_timestamp=1_000,
        ),
    )

    accepted = market_state.open_transaction("AAPL", "LONG", submitted_at=1_050)

    assert accepted == {"transactionId": "tx-000001", "status": "PENDING_OPEN"}

    fill_result = market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=102.25,
            end_timestamp=1_100,
        ),
    )

    snapshot = market_state.snapshot()

    assert fill_result.accepted is True
    assert fill_result.filled_open is market_state.transactions[0]
    assert fill_result.filled_close is None

    assert snapshot["updatedAt"] == 1_100
    assert snapshot["topGainers"] == []
    assert snapshot["topLosers"] == []
    assert snapshot["transactions"] == [
        {
            "transactionId": "tx-000001",
            "symbol": "AAPL",
            "positionType": "LONG",
            "status": "OPEN",
            "submittedAt": 1_050,
            "openedAt": 1_100,
            "closedAt": None,
            "entryPrice": 102.25,
            "exitPrice": None,
            "profitLoss": None,
            "points": [
                {"timestamp": 1_000, "close": 101.5},
                {"timestamp": 1_100, "close": 102.25},
            ],
        }
    ]


def test_market_state_keeps_pending_open_until_same_symbol_update_arrives() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL", "TSLA"))
    market_state = MarketState()
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=101.5,
            end_timestamp=1_000,
        ),
    )
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="TSLA",
            official_open_price=200.0,
            close=199.0,
            end_timestamp=1_010,
        ),
    )
    market_state.open_transaction("AAPL", "LONG", submitted_at=1_050)

    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="TSLA",
            official_open_price=200.0,
            close=198.0,
            end_timestamp=1_100,
        ),
    )

    assert market_state.snapshot()["transactions"] == [
        {
            "transactionId": "tx-000001",
            "symbol": "AAPL",
            "positionType": "LONG",
            "status": "PENDING_OPEN",
            "submittedAt": 1_050,
            "openedAt": None,
            "closedAt": None,
            "entryPrice": None,
            "exitPrice": None,
            "profitLoss": None,
            "points": [{"timestamp": 1_000, "close": 101.5}],
        }
    ]


def test_market_state_cancels_pending_open_and_returns_symbol_to_stock_grids() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=101.5,
            end_timestamp=1_000,
        ),
    )
    accepted = market_state.open_transaction("AAPL", "LONG", submitted_at=1_050)

    canceled = market_state.cancel_open_transaction(accepted["transactionId"], submitted_at=1_075)
    snapshot = market_state.snapshot()

    assert canceled == {"transactionId": accepted["transactionId"], "status": "CANCELED"}
    assert snapshot["updatedAt"] == 1_075
    assert snapshot["transactions"] == []
    assert snapshot["topGainers"][0]["symbol"] == "AAPL"


def test_market_state_rejects_cancel_open_for_non_pending_transactions() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=101.5,
            end_timestamp=1_000,
        ),
    )
    accepted = market_state.open_transaction("AAPL", "LONG", submitted_at=1_050)
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=102.0,
            end_timestamp=1_100,
        ),
    )

    with pytest.raises(TransactionCommandRejected, match="transaction_cancel_state_conflict"):
        market_state.cancel_open_transaction(accepted["transactionId"], submitted_at=1_125)


def test_market_state_fills_pending_close_on_next_same_symbol_update() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=101.5,
            end_timestamp=1_000,
        ),
    )
    market_state.open_transaction("AAPL", "LONG", submitted_at=1_050)
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=102.0,
            end_timestamp=1_100,
        ),
    )

    accepted = market_state.close_transaction("tx-000001", submitted_at=1_150)

    assert accepted == {"transactionId": "tx-000001", "status": "PENDING_CLOSE"}

    fill_result = market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=103.0,
            end_timestamp=1_200,
        ),
    )

    snapshot = market_state.snapshot()

    assert fill_result.accepted is True
    assert fill_result.filled_open is None
    assert fill_result.filled_close is market_state.transactions[0]

    assert snapshot["updatedAt"] == 1_200
    assert snapshot["topGainers"][0]["symbol"] == "AAPL"
    assert snapshot["transactions"] == [
        {
            "transactionId": "tx-000001",
            "symbol": "AAPL",
            "positionType": "LONG",
            "status": "CLOSED",
            "submittedAt": 1_050,
            "openedAt": 1_100,
            "closedAt": 1_200,
            "entryPrice": 102.0,
            "exitPrice": 103.0,
            "profitLoss": 100.0,
            "points": [
                {"timestamp": 1_000, "close": 101.5},
                {"timestamp": 1_100, "close": 102.0},
                {"timestamp": 1_200, "close": 103.0},
            ],
        }
    ]


def test_market_state_closes_short_transaction_with_short_profit_loss() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=101.5,
            end_timestamp=1_000,
        ),
    )
    market_state.open_transaction("AAPL", "SHORT", submitted_at=1_050)
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=102.0,
            end_timestamp=1_100,
        ),
    )
    market_state.close_transaction("tx-000001", submitted_at=1_150)
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=100.0,
            end_timestamp=1_200,
        ),
    )

    assert market_state.snapshot()["transactions"][0]["profitLoss"] == 200.0


def test_market_state_freezes_closed_transaction_points_after_close() -> None:
    settings = Settings(massive_api_key="test-api-key", watchlist=("AAPL",))
    market_state = MarketState()
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=101.5,
            end_timestamp=1_000,
        ),
    )
    market_state.open_transaction("AAPL", "LONG", submitted_at=1_050)
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=102.0,
            end_timestamp=1_100,
        ),
    )
    market_state.close_transaction("tx-000001", submitted_at=1_150)
    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=103.0,
            end_timestamp=1_200,
        ),
    )

    closed_points = market_state.snapshot()["transactions"][0]["points"]

    market_state.apply_update(
        settings.watchlist,
        AggregateUpdate(
            symbol="AAPL",
            official_open_price=100.0,
            close=104.0,
            end_timestamp=1_300,
        ),
    )

    snapshot = market_state.snapshot()

    assert snapshot["transactions"][0]["points"] == closed_points
    assert snapshot["transactions"][0]["points"][-1] == {"timestamp": 1_200, "close": 103.0}
    assert snapshot["topGainers"][0]["points"][-1] == {"timestamp": 1_300, "close": 104.0}


def test_market_state_rejections_are_domain_errors_without_http_fields() -> None:
    market_state = MarketState()

    with pytest.raises(TransactionCommandRejected) as error_info:
        market_state.open_transaction("AAPL", "LONG", submitted_at=1_000)

    error = error_info.value
    assert error.code == "latest_price_unavailable"
    assert not hasattr(error, "status_code")
    assert not hasattr(error, "message")
