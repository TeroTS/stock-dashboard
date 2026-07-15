"""FastAPI app wiring for the stock dashboard backend."""

from collections.abc import Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from stock_dashboard_backend.runtime import Runtime, Settings


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

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

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
