"""Runtime settings and watchlist loading for the stock dashboard."""

import os
from dataclasses import dataclass, field
from pathlib import Path

WATCHLIST_PATH = Path(__file__).resolve().parent.parent / "watchlist.txt"


# Load symbols from the repo-owned config file so the runtime and UI follow the same backend-owned list.
def load_watchlist() -> tuple[str, ...]:
    if not WATCHLIST_PATH.is_file():
        raise ValueError(f"watchlist file is missing: {WATCHLIST_PATH}")

    symbols: list[str] = []
    seen: set[str] = set()

    for line in WATCHLIST_PATH.read_text(encoding="utf-8").splitlines():
        symbol = line.strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        symbols.append(symbol)

    if not symbols:
        raise ValueError(f"watchlist file is empty: {WATCHLIST_PATH}")

    return tuple(symbols)


@dataclass(slots=True)
class Settings:
    """Runtime configuration for Massive credentials and watchlist scope."""

    massive_api_key: str = field(default_factory=lambda: os.getenv("MASSIVE_API_KEY", ""))
    watchlist: tuple[str, ...] = field(default_factory=load_watchlist)
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
