"""Karnex Forge orchestrator — modes, context, model routing."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List

from agents.builder.schemas import BuilderInput, BuilderOutput
from agents.forge.catalog import load_catalog
from agents.forge.context import (
    build_run_manifest,
    format_context_block,
    load_karnex_context,
)
from agents.forge.events import emit_forge_event
from agents.forge.modes.ask import run_ask_mode
from agents.forge.modes.debug import run_debug_mode
from agents.forge.modes.plan import run_plan_mode
from agents.forge.modes.router import detect_forge_mode
from agents.forge.project_types import get_subagent_roster, resolve_project_type
from agents.forge.modes.build import run_build_mode
from agents.forge.cost_estimate import estimate_forge_run_cost
from agents.forge.decision_journal import append_forge_decision
from agents.forge.catalog import resolve_llm_model_label
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


async def _load_prev_run_context(supabase: Any, founder_id: str) -> str:
    prev_run_context = "No previous runs found."
    try:
        res = (
            supabase.table("agent_runs")
            .select("id, status, input")
            .eq("founder_id", founder_id)
            .eq("agent_id", "builder-v1")
            .order("started_at", desc=True)
            .limit(2)
            .execute()
        )
        if res.data and len(res.data) >= 2:
            prev_run = res.data[1]
            prev_spec = prev_run.get("input", {}).get("specification", "")
            prev_status = prev_run.get("status", "")
            prev_run_context = (
                f"Previous Run Details:\n"
                f"- Status: {prev_status}\n"
                f"- User Request: {prev_spec}\n"
            )
    except Exception as e:
        logger.warning(f"Could not load previous run context: {e}")
    return prev_run_context


async def run_forge(input_data: BuilderInput, run_id: str, supabase: Any = None) -> BuilderOutput:
    """Main Forge entry — replaces direct run_builder routing."""
    if supabase is None:
        supabase = get_supabase_admin()

    founder_id = input_data.founder_id
    logger.info(f"Forge orchestrator founder={founder_id} run={run_id}")

    user_prompt_log = {
        "sender": "user",
        "message": input_data.specification,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "log",
    }
    try:
        supabase.table("agent_runs").update({"logs": [user_prompt_log]}).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not init logs for run {run_id}: {e}")

    resolved_mode, mode_meta = detect_forge_mode(
        input_data.specification,
        getattr(input_data, "mode", "auto"),
    )
    project_type = resolve_project_type(
        input_data.specification,
        input_data.task_type,
        getattr(input_data, "project_type", "auto"),
    )
    roster = get_subagent_roster(project_type)

    karnex_ctx = load_karnex_context(
        founder_id,
        task_id=input_data.task_id,
        war_room_task_id=getattr(input_data, "war_room_task_id", None),
        supabase=supabase,
    )
    context_block = format_context_block(karnex_ctx)

    await emit_forge_event(
        supabase,
        run_id,
        event_type="mode_detected",
        sender="system",
        message=f"Mode: {resolved_mode} — {mode_meta.reason}",
        detected_mode=resolved_mode,
        project_type=project_type,
        subagents=roster,
    )

    catalog = load_catalog()
    models_used: List[str] = [
        resolve_llm_model_label(
            getattr(input_data, "model_id", None),
            auto_model=bool(getattr(input_data, "auto_model", False)),
            max_mode=bool(getattr(input_data, "max_mode", False)),
        )
    ]
    cost_hint = estimate_forge_run_cost(input_data)

    try:
        supabase.table("agent_runs").update({
            "llm_model": models_used[0],
        }).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not update llm_model on run {run_id}: {e}")

    prev_run_context = await _load_prev_run_context(supabase, founder_id)

    autonomy = getattr(input_data, "autonomy", "founder") or "founder"
    plan_approved = bool(getattr(input_data, "plan_approved", False))

    if resolved_mode == "plan":
        out = await run_plan_mode(
            input_data, run_id, supabase, context_block=context_block, project_type=project_type
        )
    elif resolved_mode == "ask":
        out = await run_ask_mode(
            input_data,
            run_id,
            supabase,
            context_block=context_block,
            prev_run_context=prev_run_context,
        )
    elif resolved_mode == "debug":
        out = await run_debug_mode(
            input_data,
            run_id,
            supabase,
            context_block=context_block,
            preview_url=getattr(input_data, "preview_url", None),
            autonomy=autonomy,
            plan_approved=plan_approved,
        )
    else:
        if autonomy == "developer" and not plan_approved:
            plan_out = await run_plan_mode(
                input_data, run_id, supabase, context_block=context_block, project_type=project_type
            )
            plan_out.approval_required = True
            plan_out.detected_mode = resolved_mode
            plan_out.project_type = project_type
            plan_out.run_manifest = build_run_manifest(
                input_data.model_dump(),
                detected_mode=resolved_mode,
                project_type=project_type,
                model_ids_used=models_used,
            )
            await emit_forge_event(
                supabase,
                run_id,
                event_type="approval_required",
                sender="system",
                message="Developer mode: review the plan and resubmit with plan_approved=true to build.",
                approval_type="plan",
            )
            return plan_out

        stack_dump = (
            input_data.tech_stack.model_dump() if input_data.tech_stack else {}
        )
        append_forge_decision(
            input_data.founder_id,
            decision=f"Build with {project_type} / {stack_dump.get('framework', 'nextjs')}",
            context=input_data.specification[:300],
            project_type=project_type,
            tech_stack=stack_dump,
            run_id=run_id,
        )
        out = await run_build_mode(
            input_data,
            run_id,
            supabase,
            context_block=context_block,
            project_type=project_type,
            prev_run_context=prev_run_context,
        )

    out.detected_mode = resolved_mode
    out.project_type = project_type
    if not out.handoff_actions and resolved_mode == "build" and out.deployment_ready:
        out.handoff_actions = ["research-v1", "outreach-v1", "analytics-insight-v1"]
    manifest = build_run_manifest(
        input_data.model_dump(),
        detected_mode=resolved_mode,
        project_type=project_type,
        model_ids_used=models_used or [catalog.get("default_model_id", "")],
    )
    manifest["cost_estimate"] = cost_hint
    out.run_manifest = manifest
    return out
