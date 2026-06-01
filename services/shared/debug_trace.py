"""Session debug logging (NDJSON). Do not log secrets."""

import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

_LOG_PATH = Path(__file__).resolve().parents[2] / "debug-d60fce.log"
_SESSION_ID = "d60fce"


def debug_log(
    location: str,
    message: str,
    data: Optional[Dict[str, Any]] = None,
    hypothesis_id: str = "",
    run_id: str = "pre-fix",
) -> None:
    # region agent log
    try:
        payload = {
            "sessionId": _SESSION_ID,
            "timestamp": int(time.time() * 1000),
            "location": location,
            "message": message,
            "data": data or {},
            "hypothesisId": hypothesis_id,
            "runId": run_id,
        }
        with _LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")
    except OSError:
        pass
    # endregion
