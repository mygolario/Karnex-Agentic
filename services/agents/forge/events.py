"""Structured progress events for Forge agent runs — batched to reduce DB round-trips."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from shared.logger import logger
from shared.supabase_client import get_supabase_admin

# In-memory batch queue: run_id → list of pending events
_event_batch: Dict[str, List[dict]] = defaultdict(list)
_run_to_session_map: Dict[str, str] = {}
_BATCH_FLUSH_SIZE = 4  # flush to DB every N events per run


async def emit_forge_event(
    supabase: Any,
    run_id: str,
    *,
    event_type: str,
    sender: str,
    message: str,
    force_flush: bool = False,
    session_id: Optional[str] = None,
    **meta: Any,
) -> None:
    """Append a structured event to agent_runs.logs and forge_sessions.logs.

    Events are batched in memory and flushed in a single DB write every
    BATCH_FLUSH_SIZE events (or immediately when force_flush=True).
    This reduces the N+1 Supabase round-trips from 30-40 per build → ~5-8.
    """
    if session_id:
        _run_to_session_map[run_id] = session_id

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
        # 1. Update agent_runs
        res = supabase.table("agent_runs").select("logs").eq("id", run_id).single().execute()
        current_logs: list = []
        if res and res.data and isinstance(res.data.get("logs"), list):
            current_logs = res.data["logs"]
        current_logs.extend(pending)
        supabase.table("agent_runs").update({"logs": current_logs}).eq("id", run_id).execute()

        # 2. Update forge_sessions if session_id is known or can be found
        session_id = _run_to_session_map.get(run_id)
        if not session_id:
            # Try to query forge_sessions by run_id
            session_res = (
                supabase.table("forge_sessions")
                .select("id")
                .eq("run_id", run_id)
                .maybe_single()
                .execute()
            )
            if session_res and session_res.data:
                session_id = session_res.data.get("id")
                _run_to_session_map[run_id] = session_id

        if session_id:
            # Load current session logs
            sess_res = (
                supabase.table("forge_sessions")
                .select("logs")
                .eq("id", session_id)
                .single()
                .execute()
            )
            sess_logs: list = []
            if sess_res and sess_res.data and isinstance(sess_res.data.get("logs"), list):
                sess_logs = sess_res.data["logs"]
            
            # Map event entries to JSONB formats (forge_sessions uses jsonb[])
            sess_logs.extend(pending)
            supabase.table("forge_sessions").update({"logs": sess_logs}).eq("id", session_id).execute()

    except Exception as e:
        logger.warning(f"Could not flush {len(pending)} forge events for run {run_id}: {e}")


async def flush_all_forge_events(supabase: Any, run_id: str) -> None:
    """Force-flush any remaining batched events at the end of a run phase."""
    await _flush_events(supabase, run_id)


async def append_legacy_log(supabase: Any, run_id: str, sender: str, message: str) -> None:
    await emit_forge_event(supabase, run_id, event_type="log", sender=sender, message=message)


async def update_forge_session_stage(
    supabase: Any, session_id: str, stage: int, status: str
) -> None:
    """Directly update the current stage and status of a forge session."""
    try:
        supabase.table("forge_sessions").update({
            "current_stage": stage,
            "status": status,
        }).eq("id", session_id).execute()
        logger.info(f"Forge session {session_id} updated to stage {stage} ({status})")
    except Exception as e:
        logger.warning(f"Could not update forge session stage: {e}")
