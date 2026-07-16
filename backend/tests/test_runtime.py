import asyncio
from pathlib import Path

import pytest
from starlette.websockets import WebSocketDisconnect

import stock_dashboard_backend.runtime as runtime_module
from stock_dashboard_backend.market_state import AggregateUpdate, MarketState, TransactionCommandRejected
from stock_dashboard_backend.runtime import Settings, SnapshotPublisher


class DisconnectingWebSocket:
    def __init__(self) -> None:
        self.accepted = False

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, payload: object) -> None:
        raise WebSocketDisconnect(code=1006)


class AssertingWebSocket:
    def __init__(self) -> None:
        self.sent_payloads: list[object] = []

    async def send_json(self, payload: object) -> None:
        self.sent_payloads.append(payload)
        raise AssertionError("drain failed")


class RecordingWebSocket:
    def __init__(self) -> None:
        self.sent_payloads: list[object] = []

    async def send_json(self, payload: object) -> None:
        self.sent_payloads.append(payload)


class BlockingPublisher:
    def __init__(self) -> None:
        self.snapshots: list[object] = []
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def broadcast(self, snapshot: object) -> None:
        self.snapshots.append(snapshot)
        self.started.set()
        await self.release.wait()


class FastPublisher:
    def __init__(self) -> None:
        self.snapshots: list[object] = []
        self.started = asyncio.Event()

    async def broadcast(self, snapshot: object) -> None:
        self.snapshots.append(snapshot)
        self.started.set()


def test_snapshot_publisher_drops_socket_if_initial_snapshot_send_fails() -> None:
    publisher = SnapshotPublisher()
    websocket = DisconnectingWebSocket()

    asyncio.run(publisher.connect(websocket, {"updatedAt": 1}))

    assert websocket.accepted is True
    assert websocket not in publisher.connections


def test_snapshot_publisher_drops_socket_if_broadcast_send_hits_assertion_error() -> None:
    publisher = SnapshotPublisher()
    broken_websocket = AssertingWebSocket()
    healthy_websocket = RecordingWebSocket()
    publisher.connections.update({broken_websocket, healthy_websocket})

    asyncio.run(publisher.broadcast({"updatedAt": 1}))

    assert broken_websocket not in publisher.connections
    assert healthy_websocket in publisher.connections
    assert healthy_websocket.sent_payloads == [{"updatedAt": 1}]


def test_runtime_open_transaction_does_not_wait_for_slow_snapshot_broadcast() -> None:
    async def scenario() -> None:
        runtime = runtime_module.Runtime(
            Settings(massive_api_key="test-api-key", watchlist=("AAPL",)),
            snapshot_interval_seconds=0.05,
        )
        publisher = BlockingPublisher()
        runtime.publisher = publisher
        runtime.market_state.apply_update(
            runtime.settings.watchlist,
            AggregateUpdate(
                symbol="AAPL",
                official_open_price=100.0,
                close=101.0,
                end_timestamp=1_000,
            ),
        )

        accepted = await asyncio.wait_for(
            runtime.open_transaction("AAPL", "LONG"),
            timeout=0.05,
        )

        await asyncio.wait_for(publisher.started.wait(), timeout=0.05)
        assert accepted == {"transactionId": "tx-000001", "status": "PENDING_OPEN"}

        publisher.release.set()
        await asyncio.wait_for(runtime._publish_task, timeout=0.05)

    asyncio.run(scenario())


def test_runtime_coalesces_snapshots_while_publish_interval_is_active() -> None:
    async def scenario() -> None:
        runtime = runtime_module.Runtime(
            Settings(massive_api_key="test-api-key", watchlist=("AAPL",)),
            snapshot_interval_seconds=0.05,
        )
        publisher = FastPublisher()
        runtime.publisher = publisher

        await runtime.apply_update(
            AggregateUpdate(
                symbol="AAPL",
                official_open_price=100.0,
                close=101.0,
                end_timestamp=1_000,
            )
        )
        await asyncio.wait_for(publisher.started.wait(), timeout=0.05)
        assert publisher.snapshots[-1]["updatedAt"] == 1_000

        await runtime.apply_update(
            AggregateUpdate(
                symbol="AAPL",
                official_open_price=100.0,
                close=102.0,
                end_timestamp=1_100,
            )
        )
        await runtime.apply_update(
            AggregateUpdate(
                symbol="AAPL",
                official_open_price=100.0,
                close=103.0,
                end_timestamp=1_200,
            )
        )

        await asyncio.sleep(0.07)
        assert [snapshot["updatedAt"] for snapshot in publisher.snapshots] == [1_000, 1_200]

        await asyncio.wait_for(runtime._publish_task, timeout=0.05)

    asyncio.run(scenario())


def test_settings_load_watchlist_from_file_by_default(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    watchlist_path = tmp_path / "watchlist.txt"
    watchlist_path.write_text("aapl\n\nmsft\nAAPL\n", encoding="utf-8")
    monkeypatch.setattr(runtime_module, "WATCHLIST_PATH", watchlist_path)

    settings = Settings(massive_api_key="test-api-key")

    assert settings.watchlist == ("AAPL", "MSFT")


def test_settings_reject_missing_watchlist_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(runtime_module, "WATCHLIST_PATH", tmp_path / "missing-watchlist.txt")

    with pytest.raises(ValueError, match="watchlist"):
        Settings(massive_api_key="test-api-key")


def test_settings_reject_empty_watchlist_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    watchlist_path = tmp_path / "watchlist.txt"
    watchlist_path.write_text("\n\n", encoding="utf-8")
    monkeypatch.setattr(runtime_module, "WATCHLIST_PATH", watchlist_path)

    with pytest.raises(ValueError, match="watchlist"):
        Settings(massive_api_key="test-api-key")


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
