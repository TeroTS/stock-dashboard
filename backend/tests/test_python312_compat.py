from pathlib import Path
import shutil
import subprocess

import pytest


def test_market_state_imports_under_python312() -> None:
    python312 = shutil.which("python3.12")
    if python312 is None:
        pytest.skip("python3.12 not available")

    backend_dir = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [python312, "-c", "import sys; sys.path.insert(0, '.'); import stock_dashboard_backend.market_state"],
        cwd=backend_dir,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
