"""Record stack and mode decisions to founder_memory (Decision Journal hook)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from agents.pain_transformer.tools import karnex_memory_read, karnex_memory_write
from shared.logger import logger


def append_forge_decision(
    founder_id: str,
    *,
    decision: str,
    context: str,
    project_type: str,
    tech_stack: Optional[dict],
    run_id: str,
) -> None:
    """Append a forge build decision to founder_memory decision journal."""
    try:
        existing = karnex_memory_read(founder_id, "forge", "decision_journal") or {"entries": []}
        entries = existing.get("entries") if isinstance(existing, dict) else []
        if not isinstance(entries, list):
            entries = []

        entries.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "decision": decision,
            "context": context[:500],
            "project_type": project_type,
            "tech_stack": tech_stack,
            "run_id": run_id,
            "source": "karnex-forge",
        })
        entries = entries[-50:]

        karnex_memory_write(
            founder_id=founder_id,
            namespace="forge",
            key="decision_journal",
            value={"entries": entries},
            tags=["decision-journal", "forge"],
        )
    except Exception as e:
        logger.warning(f"Could not append forge decision journal: {e}")
