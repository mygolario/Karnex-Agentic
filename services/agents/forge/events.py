"""Structured progress events for Forge agent runs — batched to reduce DB round-trips."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List

from shared.logger import logger

# In-memory batch queue: run_id → list of pending events
_event_batch: Dict[str, List[dict]] = defaultdict(list)
_BATCH_FLUSH_SIZE = 4  # flush to DB every N events per run


async def emit_forge_event(
    supabase: Any,
    run_id: str,
    *,
    event_type: str,
    sender: str,
    message: str,
    force_flush: bool = False,
    **meta: Any,
) -> None:
    """Append a structured event to agent_runs.logs.

    Events are batched in memory and flushed in a single DB write every
    BATCH_FLUSH_SIZE events (or immediately when force_flush=True).
    This reduces the N+1 Supabase round-trips from 30-40 per build → ~5-8.
    """
    entry = {
        "sender": sender,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        **{k: v for k, v in meta.items() if v is not None},
    }

    _event_batch[run_id].append(entry)

    should_flush = force_flush or len(_event_batch[run_id]) >= _BATCH_FLUSH_SIZE

    if should_flush:
        await _flush_events(supabase, run_id)


async def _flush_events(supabase: Any, run_id: str) -> None:
    """Write all pending events for a run to Supabase in a single round-trip."""
    pending = _event_batch.pop(run_id, [])
    if not pending:
        return

    try:
        res = supabase.table("agent_runs").select("logs").eq("id", run_id).single().execute()
        current_logs: list = []
        if res.data and isinstance(res.data.get("logs"), list):
            current_logs = res.data["logs"]
        current_logs.extend(pending)
        supabase.table("agent_runs").update({"logs": current_logs}).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not flush {len(pending)} forge events for run {run_id}: {e}")


async def flush_all_forge_events(supabase: Any, run_id: str) -> None:
    """Force-flush any remaining batched events at the end of a run phase."""
    await _flush_events(supabase, run_id)


async def append_legacy_log(supabase: Any, run_id: str, sender: str, message: str) -> None:
    await emit_forge_event(supabase, run_id, event_type="log", sender=sender, message=message)
