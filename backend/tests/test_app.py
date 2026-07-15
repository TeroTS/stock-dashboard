from fastapi.testclient import TestClient

from stock_dashboard_backend.app import Settings, create_app


def test_settings_default_to_mock_mode() -> None:
    settings = Settings()

    assert settings.feed_mode == "mock"


def test_health_returns_ok_status() -> None:
    with TestClient(create_app(Settings(mock_interval_seconds=0.01))) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_websocket_receives_full_snapshot_from_mock_feed() -> None:
    settings = Settings(
        mock_interval_seconds=0.01,
        watchlist=("AAPL", "TSLA"),
        mock_open_prices={"AAPL": 100.0, "TSLA": 200.0},
    )

    with TestClient(create_app(settings)) as client:
        with client.websocket_connect("/ws") as websocket:
            first_snapshot = websocket.receive_json()
            second_snapshot = websocket.receive_json()

    assert second_snapshot["updatedAt"] >= first_snapshot["updatedAt"]
    assert second_snapshot["transactions"] == []
    assert set(second_snapshot) == {"updatedAt", "topGainers", "topLosers", "transactions"}
    assert second_snapshot["topGainers"]
    assert second_snapshot["topLosers"]

    gainer = second_snapshot["topGainers"][0]
    loser = second_snapshot["topLosers"][0]

    assert set(gainer) == {"symbol", "close", "officialOpenPrice", "percentChange", "points"}
    assert set(loser) == {"symbol", "close", "officialOpenPrice", "percentChange", "points"}
    assert gainer["percentChange"] >= loser["percentChange"]
    assert gainer["points"]
    assert set(gainer["points"][0]) == {"timestamp", "close"}
