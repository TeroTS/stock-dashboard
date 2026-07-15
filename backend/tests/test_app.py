import asyncio
import json
import socket
import threading

import pytest
from fastapi.testclient import TestClient
from websockets.asyncio.server import ServerConnection, serve

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from stock_dashboard_backend.app import Settings, create_app
from stock_dashboard_backend.market_state import AggregateUpdate
from stock_dashboard_backend.runtime import Runtime


class ProviderServer:
    def __init__(self) -> None:
        self.host = "127.0.0.1"
        self.port = _free_port()
        self.feed = f"{self.host}:{self.port}"
        self.received: list[dict[str, str]] = []
        self._loop = asyncio.new_event_loop()
        self._server = None
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._ready = threading.Event()

    def __enter__(self) -> "ProviderServer":
        self._thread.start()
        if not self._ready.wait(timeout=2):
            raise RuntimeError("Provider server did not start")
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._server is not None:
            future = asyncio.run_coroutine_threadsafe(self._stop(), self._loop)
            future.result(timeout=2)
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._thread.join(timeout=2)

    def _run_loop(self) -> None:
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._start())
        self._ready.set()
        self._loop.run_forever()

    async def _start(self) -> None:
        self._server = await serve(self._handle_connection, self.host, self.port)

    async def _stop(self) -> None:
        assert self._server is not None
        self._server.close()
        await self._server.wait_closed()

    async def _handle_connection(self, websocket: ServerConnection) -> None:
        await websocket.send(
            json.dumps([{"ev": "status", "status": "connected", "message": "connected"}])
        )

        auth_payload = json.loads(str(await websocket.recv()))
        self.received.append(auth_payload)
        await websocket.send(
            json.dumps([{"ev": "status", "status": "auth_success", "message": "authenticated"}])
        )

        subscribe_payload = json.loads(str(await websocket.recv()))
        self.received.append(subscribe_payload)
        await websocket.send(
            json.dumps(
                [
                    {"ev": "A", "sym": "AAPL", "op": None, "c": 98.0, "e": 1_700_000_000_000},
                    {"ev": "A", "sym": "AAPL", "op": 100.0, "c": 101.5, "e": 1_700_000_000_100},
                ]
            )
        )
        await websocket.wait_closed()


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class IdleRuntime:
    def __init__(self, settings: Settings) -> None:
        return None

    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        return None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()

    def disconnect(self, websocket: WebSocket) -> None:
        return None


def test_runtime_requires_api_key() -> None:
    runtime = Runtime(Settings(massive_api_key=""))

    with pytest.raises(ValueError, match="MASSIVE_API_KEY"):
        asyncio.run(runtime.start())


def test_health_returns_ok_status() -> None:
    with TestClient(create_app(Settings(), runtime_factory=IdleRuntime)) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


class ManualRuntime(Runtime):
    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        return None


class ClosingRuntime:
    def __init__(self, settings: Settings) -> None:
        self.disconnected = False

    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        return None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        await websocket.close()

    def disconnect(self, websocket: WebSocket) -> None:
        self.disconnected = True


def test_websocket_route_ignores_socket_closed_during_connect() -> None:
    app = create_app(Settings(), runtime_factory=ClosingRuntime)

    with TestClient(app) as client:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws") as websocket:
                websocket.receive_text()


def test_massive_mode_streams_provider_updates_to_dashboard_websocket() -> None:
    with ProviderServer() as provider:
        settings = Settings(
            massive_api_key="test-api-key",
            watchlist=("AAPL", "TSLA"),
        )

        with TestClient(
            create_app(
                settings,
                runtime_factory=lambda runtime_settings: Runtime(
                    runtime_settings,
                    massive_client_options={
                        "feed": provider.feed,
                        "secure": False,
                        "max_reconnects": 0,
                    },
                ),
            )
        ) as client:
            with client.websocket_connect("/ws") as websocket:
                snapshot = websocket.receive_json()

    assert provider.received[0] == {"action": "auth", "params": "test-api-key"}
    assert provider.received[1]["action"] == "subscribe"
    assert set(provider.received[1]["params"].split(",")) == {"A.AAPL", "A.TSLA"}
    assert snapshot == {
        "updatedAt": 1_700_000_000_100,
        "topGainers": [
            {
                "symbol": "AAPL",
                "close": 101.5,
                "officialOpenPrice": 100.0,
                "percentChange": 1.5,
                "points": [{"timestamp": 1_700_000_000_100, "close": 101.5}],
            }
        ],
        "topLosers": [
            {
                "symbol": "AAPL",
                "close": 101.5,
                "officialOpenPrice": 100.0,
                "percentChange": 1.5,
                "points": [{"timestamp": 1_700_000_000_100, "close": 101.5}],
            }
        ],
        "transactions": [],
    }


def test_open_transaction_returns_pending_snapshot_and_hides_symbol_from_stock_grids() -> None:
    app = create_app(
        Settings(massive_api_key="test-api-key", watchlist=("AAPL",)),
        runtime_factory=ManualRuntime,
    )

    with TestClient(app) as client:
        runtime: Runtime = client.app.state.runtime
        asyncio.run(
            runtime.apply_update(
                AggregateUpdate(
                    symbol="AAPL",
                    official_open_price=100.0,
                    close=101.5,
                    end_timestamp=1_700_000_000_100,
                )
            )
        )

        with client.websocket_connect("/ws") as websocket:
            initial_snapshot = websocket.receive_json()
            response = client.post(
                "/api/transactions",
                json={"symbol": "AAPL", "positionType": "LONG"},
            )
            pending_snapshot = websocket.receive_json()

    accepted = response.json()
    pending_transaction = pending_snapshot["transactions"][0]

    assert initial_snapshot["topGainers"][0]["symbol"] == "AAPL"
    assert response.status_code == 202
    assert accepted["transactionId"].startswith("tx-")
    assert accepted["status"] == "PENDING_OPEN"
    assert pending_snapshot["topGainers"] == []
    assert pending_snapshot["topLosers"] == []
    assert pending_snapshot["updatedAt"] == pending_transaction["submittedAt"]
    assert pending_transaction == {
        "transactionId": accepted["transactionId"],
        "symbol": "AAPL",
        "positionType": "LONG",
        "status": "PENDING_OPEN",
        "submittedAt": pending_transaction["submittedAt"],
        "openedAt": None,
        "closedAt": None,
        "entryPrice": None,
        "exitPrice": None,
        "profitLoss": None,
        "points": [{"timestamp": 1_700_000_000_100, "close": 101.5}],
    }


def test_open_transaction_rejects_duplicate_pending_symbol() -> None:
    app = create_app(
        Settings(massive_api_key="test-api-key", watchlist=("AAPL",)),
        runtime_factory=ManualRuntime,
    )

    with TestClient(app) as client:
        runtime: Runtime = client.app.state.runtime
        asyncio.run(
            runtime.apply_update(
                AggregateUpdate(
                    symbol="AAPL",
                    official_open_price=100.0,
                    close=101.5,
                    end_timestamp=1_700_000_000_100,
                )
            )
        )

        first_response = client.post(
            "/api/transactions",
            json={"symbol": "AAPL", "positionType": "LONG"},
        )
        second_response = client.post(
            "/api/transactions",
            json={"symbol": "AAPL", "positionType": "SHORT"},
        )

    assert first_response.status_code == 202
    assert second_response.status_code == 409
    assert second_response.json() == {
        "code": "symbol_transaction_conflict",
        "message": "Symbol already has an active or pending transaction.",
    }


def test_open_transaction_rejects_symbols_without_live_state() -> None:
    with TestClient(
        create_app(
            Settings(massive_api_key="test-api-key", watchlist=("AAPL",)),
            runtime_factory=ManualRuntime,
        )
    ) as client:
        response = client.post(
            "/api/transactions",
            json={"symbol": "AAPL", "positionType": "LONG"},
        )

    assert response.status_code == 422
    assert response.json() == {
        "code": "latest_price_unavailable",
        "message": "Latest symbol price is unavailable; command was not queued.",
    }
