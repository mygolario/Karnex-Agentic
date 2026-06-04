"""Structured progress events for Forge agent runs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from shared.logger import logger


async def emit_forge_event(
    supabase: Any,
    run_id: str,
    *,
    event_type: str,
    sender: str,
    message: str,
    **meta: Any,
) -> None:
    """Append a structured event to agent_runs.logs (backward-compatible fields)."""
    entry = {
        "sender": sender,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        **{k: v for k, v in meta.items() if v is not None},
    }
    try:
        res = supabase.table("agent_runs").select("logs").eq("id", run_id).single().execute()
        current_logs = res.data.get("logs") if res.data else None
        if not isinstance(current_logs, list):
            current_logs = []
        current_logs.append(entry)
        supabase.table("agent_runs").update({"logs": current_logs}).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not emit forge event for run {run_id}: {e}")


async def append_legacy_log(supabase: Any, run_id: str, sender: str, message: str) -> None:
    await emit_forge_event(supabase, run_id, event_type="log", sender=sender, message=message)
