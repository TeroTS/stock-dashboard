"""FastAPI app wiring for the stock dashboard backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from stock_dashboard_backend.runtime import Runtime, Settings


# Build one app instance with a lifecycle-managed runtime so tests can inject custom settings.
def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        runtime = Runtime(runtime_settings)
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
        await runtime.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            runtime.disconnect(websocket)

    return app


app = create_app()
