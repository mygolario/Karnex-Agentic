"""Centralized agent_runs / agent_outputs persistence."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from shared.logger import logger
from shared.schemas.agent_envelope import AgentOutputBase
from shared.supabase_client import get_supabase_admin


def start_agent_run(
    agent_id: str,
    founder_id: str,
    input_data: Dict[str, Any],
    *,
    agent_version: str = "v1.0.0",
    llm_model: Optional[str] = None,
    triggered_by: str = "user",
    run_id: Optional[str] = None,
    initial_status: str = "running",
) -> str:
    """Insert agent_runs row; returns run_id."""
    rid = run_id or str(uuid.uuid4())
    try:
        supabase = get_supabase_admin()
        row: Dict[str, Any] = {
            "id": rid,
            "founder_id": founder_id,
            "agent_id": agent_id,
            "agent_version": agent_version,
            "status": initial_status,
            "input": input_data,
            "triggered_by": triggered_by,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "tools_called": [],
            "logs": [],
        }
        if llm_model:
            row["llm_model"] = llm_model
        supabase.table("agent_runs").insert(row).execute()
    except Exception as e:
        logger.warning(f"Could not start agent run {rid}: {e}")
    return rid


def advance_step(
    run_id: str,
    step_index: int,
    step_label: Optional[str] = None,
    *,
    status_detail: Optional[str] = None,
    tool_name: Optional[str] = None,
) -> None:
    """Update run progress: optional status, append tools_called and log line."""
    try:
        supabase = get_supabase_admin()
        res = (
            supabase.table("agent_runs")
            .select("tools_called, logs")
            .eq("id", run_id)
            .maybe_single()
            .execute()
        )
        tools: list = []
        logs: list = []
        if res and res.data:
            raw_tools = res.data.get("tools_called")
            if isinstance(raw_tools, list):
                tools = list(raw_tools)
            raw_logs = res.data.get("logs")
            if isinstance(raw_logs, list):
                logs = list(raw_logs)

        label = step_label or f"step_{step_index}"
        if tool_name and tool_name not in tools:
            tools.append(tool_name)
        elif label not in tools:
            tools.append(label)

        logs.append({
            "sender": "agent",
            "message": label,
            "step_index": step_index,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        update: Dict[str, Any] = {"tools_called": tools, "logs": logs}
        if status_detail:
            update["status"] = status_detail
        supabase.table("agent_runs").update(update).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not advance step for run {run_id}: {e}")


def complete_agent_run(
    run_id: str,
    founder_id: str,
    output: AgentOutputBase,
    output_type: str,
    *,
    duration_ms: Optional[int] = None,
    confidence_rationale: Optional[str] = None,
) -> None:
    """Mark run success and insert agent_outputs with top-level quality fields."""
    try:
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc).isoformat()
        run_update: Dict[str, Any] = {
            "status": "success",
            "completed_at": now,
        }
        if duration_ms is not None:
            run_update["duration_ms"] = duration_ms
        supabase.table("agent_runs").update(run_update).eq("id", run_id).execute()

        out_dump = output.model_dump()
        payload: Dict[str, Any] = {
            "agent_run_id": run_id,
            "founder_id": founder_id,
            "output_type": output_type,
            "output": out_dump,
            "confidence": output.confidence,
            "suggested_next_agent": output.suggested_next_agent,
        }
        if confidence_rationale or output.confidence == "low":
            payload["confidence_rationale"] = (
                confidence_rationale or "Limited grounding data; review recommended."
            )
        supabase.table("agent_outputs").insert(payload).execute()
    except Exception as e:
        logger.warning(f"Could not complete agent run {run_id}: {e}")


def fail_agent_run(
    run_id: str,
    error_message: str,
    *,
    duration_ms: Optional[int] = None,
    error_type: str = "agent_failure",
) -> None:
    try:
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc).isoformat()
        update: Dict[str, Any] = {
            "status": "error",
            "completed_at": now,
            "error_message": error_message,
            "error_type": error_type,
        }
        if duration_ms is not None:
            update["duration_ms"] = duration_ms
        supabase.table("agent_runs").update(update).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not fail agent run {run_id}: {e}")


def append_run_log(run_id: str, sender: str, message: str) -> None:
    """Append a log entry to agent_runs.logs (builder-compatible)."""
    try:
        supabase = get_supabase_admin()
        res = supabase.table("agent_runs").select("logs").eq("id", run_id).single().execute()
        current_logs = res.data.get("logs") if res.data else None
        if not isinstance(current_logs, list):
            current_logs = []
        current_logs.append({
            "sender": sender,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        supabase.table("agent_runs").update({"logs": current_logs}).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not append log to run {run_id}: {e}")
