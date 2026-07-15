"""FastAPI app wiring for the stock dashboard backend."""

from collections.abc import Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.websockets import WebSocketState

from stock_dashboard_backend.market_state import PositionType, TransactionCommandRejected
from stock_dashboard_backend.runtime import Runtime, Settings

TRANSACTION_COMMAND_ERROR_RESPONSES = {
    "latest_price_unavailable": (
        422,
        "Latest symbol price is unavailable; command was not queued.",
    ),
    "symbol_transaction_conflict": (
        409,
        "Symbol already has an active or pending transaction.",
    ),
}


class OpenTransactionRequest(BaseModel):
    symbol: str
    positionType: PositionType


# Build one app instance with a lifecycle-managed runtime so tests can inject custom settings.
def create_app(
    settings: Settings | None = None,
    runtime_factory: Callable[[Settings], Runtime] | None = None,
) -> FastAPI:
    runtime_settings = settings or Settings()
    build_runtime = runtime_factory or Runtime

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        runtime = build_runtime(runtime_settings)
        app.state.runtime = runtime
        await runtime.start()
        yield
        await runtime.stop()

    app = FastAPI(lifespan=lifespan)

    @app.exception_handler(TransactionCommandRejected)
    async def handle_transaction_command_rejected(
        _request: Request,
        error: TransactionCommandRejected,
    ) -> JSONResponse:
        status_code, message = TRANSACTION_COMMAND_ERROR_RESPONSES[error.code]
        return JSONResponse(
            status_code=status_code,
            content={"code": error.code, "message": message},
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/transactions", status_code=202)
    async def open_transaction(
        command: OpenTransactionRequest,
        request: Request,
    ) -> dict[str, str]:
        runtime: Runtime = request.app.state.runtime
        return await runtime.open_transaction(command.symbol, command.positionType)

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        runtime: Runtime = websocket.app.state.runtime

        try:
            await runtime.connect(websocket)
            if websocket.application_state != WebSocketState.CONNECTED:
                return

            while True:
                await websocket.receive_text()
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            runtime.disconnect(websocket)

    return app


app = create_app()
