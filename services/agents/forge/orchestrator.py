"""Karnex Forge orchestrator — modes, context, model routing."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents.builder.schemas import BuilderInput, BuilderOutput
from agents.forge.catalog import load_catalog
from agents.forge.context import (
    build_run_manifest,
    format_context_block,
    load_karnex_context,
)
from agents.forge.events import emit_forge_event, flush_all_forge_events
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


class ForgeOrchestrator:
    """Class-based orchestrator for the Forge pipeline.

    Manages forge_sessions lifecycle, mode routing, momentum-aware complexity,
    and pipeline stage progression.
    """

    def __init__(
        self,
        input_data: BuilderInput,
        run_id: str,
        supabase: Any = None,
    ) -> None:
        self.input_data = input_data
        self.run_id = run_id
        self.supabase = supabase or get_supabase_admin()
        self.founder_id: str = input_data.founder_id
        self.session_id: Optional[str] = getattr(input_data, "forge_session_id", None)
        self.project_id: Optional[str] = getattr(input_data, "forge_project_id", None)
        self.tokens_used: int = 0
        self.cost_usd: float = 0.0
        self._stage: int = 1

    # ------------------------------------------------------------------
    # Forge session lifecycle helpers
    # ------------------------------------------------------------------

    async def _create_or_update_session(self, mode: str) -> str:
        """Create a new forge_session record or update an existing one."""
        if not self.project_id:
            try:
                res = self.supabase.table("forge_projects").select("id").eq("founder_id", self.founder_id).order("updated_at", desc=True).limit(1).execute()
                if res and res.data:
                    self.project_id = res.data[0]["id"]
            except Exception as e:
                logger.warning(f"Could not query latest forge_project: {e}")

            if not self.project_id:
                try:
                    spec_name = self.input_data.specification[:45] if self.input_data.specification else "New Project"
                    tech = getattr(self.input_data, "tech_stack", {}) or {}
                    # tech might be a model/dict/None, handle safely
                    tech_dict = tech if isinstance(tech, dict) else (getattr(tech, "model_dump", lambda: {})() if hasattr(tech, "model_dump") else {})
                    res = self.supabase.table("forge_projects").insert({
                        "founder_id": self.founder_id,
                        "name": spec_name,
                        "tech_stack": {
                            "framework": tech_dict.get("framework", "nextjs"),
                            "styling": tech_dict.get("styling", "tailwind"),
                            "database": tech_dict.get("database", "supabase"),
                        }
                    }).execute()
                    if res and res.data:
                        self.project_id = res.data[0]["id"]
                except Exception as e:
                    logger.warning(f"Could not auto-create forge_project: {e}")

        if self.session_id:
            try:
                self.supabase.table("forge_sessions").update({
                    "status": "crystallizing",
                    "current_stage": 1,
                    "mode": mode,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", self.session_id).execute()
                return self.session_id
            except Exception as e:
                logger.warning(f"Could not update forge_session {self.session_id}: {e}")
                return self.session_id

        new_id = str(uuid.uuid4())
        try:
            self.supabase.table("forge_sessions").insert({
                "id": new_id,
                "project_id": self.project_id,
                "run_id": self.run_id,
                "status": "crystallizing",
                "current_stage": 1,
                "mode": mode,
                "started_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Could not create forge_session: {e}")
        self.session_id = new_id
        return new_id

    async def _advance_session_stage(self, stage: int, status: str) -> None:
        """Update the current pipeline stage on the forge_session record."""
        self._stage = stage
        if not self.session_id:
            return
        try:
            self.supabase.table("forge_sessions").update({
                "current_stage": stage,
                "status": status,
            }).eq("id", self.session_id).execute()
        except Exception as e:
            logger.warning(f"Could not advance forge_session stage: {e}")

    async def _complete_session(
        self,
        status: str,
        files_generated: Optional[List[Dict[str, Any]]] = None,
        qa_score: Optional[int] = None,
        test_report: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Finalize the forge_session record on pipeline completion."""
        if not self.session_id:
            return
        update: Dict[str, Any] = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "tokens_used": self.tokens_used,
            "cost_usd": self.cost_usd,
        }
        if files_generated is not None:
            update["files_generated"] = len(files_generated)
        if qa_score is not None:
            update["qa_score"] = qa_score
        if test_report is not None:
            update["test_report"] = test_report
        try:
            self.supabase.table("forge_sessions").update(update).eq(
                "id", self.session_id
            ).execute()
        except Exception as e:
            logger.warning(f"Could not complete forge_session: {e}")

    # ------------------------------------------------------------------
    # Momentum-aware complexity adjustment
    # ------------------------------------------------------------------

    def _apply_momentum_adjustment(self, spec: str, momentum_score: Optional[int]) -> str:
        """If momentum is low, prepend a simplification note to the specification."""
        if momentum_score is None:
            return spec
        try:
            from agents.forge.momentum_adapter import adapt_complexity
            adapted_spec, note = adapt_complexity(momentum_score, spec)
            logger.info(note)
            return adapted_spec
        except Exception as e:
            logger.warning(f"Could not run momentum adapter: {e}")
            return spec

    # ------------------------------------------------------------------
    # Main run pipeline
    # ------------------------------------------------------------------

    async def run(self) -> BuilderOutput:
        """Execute the full Forge pipeline with session tracking."""
        input_data = self.input_data
        supabase = self.supabase
        run_id = self.run_id
        founder_id = self.founder_id

        logger.info(f"Forge orchestrator founder={founder_id} run={run_id}")

        # ---- Initialize agent_runs logs ----
        user_prompt_log = {
            "sender": "user",
            "message": input_data.specification,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "log",
        }
        try:
            supabase.table("agent_runs").update({"logs": [user_prompt_log]}).eq(
                "id", run_id
            ).execute()
        except Exception as e:
            logger.warning(f"Could not init logs for run {run_id}: {e}")

        # ---- Mode detection ----
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

        # ---- Create / update forge session ----
        await self._create_or_update_session(resolved_mode)

        # ---- Load Karnex cross-module context ----
        karnex_ctx = load_karnex_context(
            founder_id,
            task_id=input_data.task_id,
            war_room_task_id=getattr(input_data, "war_room_task_id", None),
            supabase=supabase,
        )
        context_block = format_context_block(karnex_ctx)

        # ---- Momentum-aware spec adjustment ----
        momentum_score: Optional[int] = None
        try:
            from agents.forge.karnex_bridge import load_momentum_score
            momentum_score = await load_momentum_score(founder_id, supabase)
        except Exception as e:
            logger.warning(f"Could not load momentum score: {e}")
        adapted_spec = self._apply_momentum_adjustment(
            input_data.specification, momentum_score
        )
        # Replace spec on a shallow copy so we don't mutate the original
        if adapted_spec != input_data.specification:
            input_data = input_data.model_copy(update={"specification": adapted_spec})

        await self._advance_session_stage(2, "mode_routing")

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

        # ---- Route to mode handlers ----
        await self._advance_session_stage(3, "executing")

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
        elif resolved_mode == "refine":
            # Refine mode: re-run build with existing context, focusing on iteration
            out = await run_build_mode(
                input_data,
                run_id,
                supabase,
                context_block=context_block,
                project_type=project_type,
                prev_run_context=prev_run_context,
            )
        else:
            # Build mode (default) with developer gating
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
                await self._complete_session("awaiting_approval")
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

        # ---- Finalize output ----
        await self._advance_session_stage(5, "finalizing")

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

        # ---- Complete session ----
        files_gen = [{"path": f.path, "language": f.language} for f in out.files] if out.files else []
        final_status = "success" if resolved_mode != "plan" else "plan_delivered"
        await self._complete_session(
            status=final_status,
            files_generated=files_gen,
            qa_score=getattr(out, "qa_score", None),
            test_report=getattr(out, "test_report", None),
        )

        # Flush any remaining buffered events so they reach Supabase
        await flush_all_forge_events(supabase, run_id)
        return out


async def run_forge(input_data: BuilderInput, run_id: str, supabase: Any = None) -> BuilderOutput:
    """Main Forge entry — replaces direct run_builder routing.

    Thin wrapper that instantiates ForgeOrchestrator and calls .run().
    Signature is preserved for backward compatibility.
    """
    orchestrator = ForgeOrchestrator(input_data, run_id, supabase)
    return await orchestrator.run()
