"""Karnex context injection — Memory, ICP, War Room / sprint tasks.

Three-tier context stack:
  1. Storage: Pull from forge_projects.project_context, founder_memory, forge_conversations
  2. Processor: Format and enrich context with ICP, roadmap phase, past decisions
  3. Compiled: Build optimized context dict for each pipeline stage
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from agents.pain_transformer.tools import karnex_memory_read
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


# ---------------------------------------------------------------------------
# Tier 1 — Storage: raw data loaders
# ---------------------------------------------------------------------------

def load_karnex_context(
    founder_id: str,
    *,
    task_id: Optional[str] = None,
    war_room_task_id: Optional[str] = None,
    supabase: Any = None,
) -> Dict[str, Any]:
    """Gather founder context for Forge orchestration."""
    ctx: Dict[str, Any] = {
        "product_brief": None,
        "icp_personas": None,
        "roadmap_excerpt": None,
        "sprint_task": None,
        "lineage_label": None,
    }

    try:
        ctx["product_brief"] = karnex_memory_read(founder_id, "idea-crystallizer", "product_brief")
    except Exception as e:
        logger.warning(f"Forge context: product_brief unavailable: {e}")

    try:
        ctx["icp_personas"] = karnex_memory_read(founder_id, "icp-definer", "personas")
    except Exception as e:
        logger.warning(f"Forge context: ICP unavailable: {e}")

    try:
        ctx["roadmap_excerpt"] = karnex_memory_read(founder_id, "war-room", "roadmap_90_day")
    except Exception as e:
        logger.warning(f"Forge context: roadmap unavailable: {e}")

    # Fixed: query 'tasks' table joined with 'sprints' instead of the non-existent 'sprint_tasks'
    sprint_id = task_id or war_room_task_id
    if sprint_id:
        try:
            sb = supabase or get_supabase_admin()
            res = (
                sb.table("tasks")
                .select("id, title, description, category, agent_config, sprint_id, sprints(id, name, phase)")
                .eq("id", sprint_id)
                .maybe_single()
                .execute()
            )
            if res.data:
                ctx["sprint_task"] = res.data
                sprint_info = res.data.get("sprints") or {}
                sprint_name = sprint_info.get("name", "")
                ctx["lineage_label"] = f"Sprint: {sprint_name or res.data.get('title', sprint_id)}"
        except Exception as e:
            logger.warning(f"Forge context: sprint task {sprint_id}: {e}")

    personas = ctx.get("icp_personas")
    if isinstance(personas, dict) and personas.get("personas"):
        first = personas["personas"][0] if personas["personas"] else None
        if first and isinstance(first, dict):
            name = first.get("name") or first.get("title")
            if name:
                ctx["lineage_label"] = (ctx.get("lineage_label") or "") + f" | ICP: {name}"

    return ctx


async def load_forge_project_context(
    founder_id: str,
    project_id: str,
    supabase: Any = None,
) -> Dict[str, Any]:
    """Load full project context from forge_projects table.

    Combines:
      - forge_projects.project_context (stored JSON blob)
      - founder_memory keyed under forge namespace
      - forge_conversations summary
    """
    sb = supabase or get_supabase_admin()
    context: Dict[str, Any] = {
        "project_context": None,
        "icp_snapshot": None,
        "roadmap_phase": None,
        "forge_decisions": None,
        "conversation_summary": None,
    }

    # Pull project record
    try:
        res = (
            sb.table("forge_projects")
            .select("project_context, icp_snapshot, roadmap_phase, current_version, status")
            .eq("id", project_id)
            .eq("founder_id", founder_id)
            .maybe_single()
            .execute()
        )
        if res.data:
            context["project_context"] = res.data.get("project_context")
            context["icp_snapshot"] = res.data.get("icp_snapshot")
            context["roadmap_phase"] = res.data.get("roadmap_phase")
    except Exception as e:
        logger.warning(f"Could not load forge_project context for {project_id}: {e}")

    # Pull decision journal from founder_memory
    try:
        decisions = karnex_memory_read(founder_id, "forge", "decision_journal")
        if decisions and isinstance(decisions, dict):
            entries = decisions.get("entries", [])
            context["forge_decisions"] = entries[-10:]  # Last 10 decisions
    except Exception as e:
        logger.warning(f"Could not load forge decisions: {e}")

    # Pull conversation summary
    try:
        conv_res = (
            sb.table("forge_conversations")
            .select("summary, message_count, context_window_tokens")
            .eq("project_id", project_id)
            .order("compressed_at", desc=True)
            .limit(1)
            .execute()
        )
        if conv_res.data and len(conv_res.data) > 0:
            context["conversation_summary"] = conv_res.data[0].get("summary")
    except Exception as e:
        logger.warning(f"Could not load forge conversation summary: {e}")

    return context


# ---------------------------------------------------------------------------
# Tier 2 — Processor: format and enrich context
# ---------------------------------------------------------------------------

def format_context_block(ctx: Dict[str, Any]) -> str:
    parts = []
    if ctx.get("lineage_label"):
        parts.append(f"Build lineage: {ctx['lineage_label']}")
    if ctx.get("product_brief"):
        parts.append(f"Product brief (excerpt): {str(ctx['product_brief'])[:1200]}")
    if ctx.get("icp_personas"):
        parts.append(f"ICP personas: {str(ctx['icp_personas'])[:800]}")
    if ctx.get("roadmap_excerpt"):
        parts.append(f"90-day roadmap (excerpt): {str(ctx['roadmap_excerpt'])[:800]}")
    if ctx.get("sprint_task"):
        t = ctx["sprint_task"]
        parts.append(
            f"Sprint task: {t.get('title')} — {t.get('description') or 'no description'}"
        )
    if not parts:
        return "No prior Karnex Memory context loaded."
    recipes = _integration_recipes_hint(ctx)
    if recipes:
        parts.append(recipes)
    return "\n\n".join(parts)


def _integration_recipes_hint(ctx: Dict[str, Any]) -> str:
    """Suggest integration wiring patterns for builds."""
    stack_hints = []
    brief = str(ctx.get("product_brief") or "").lower()
    if "stripe" in brief or "payment" in brief:
        stack_hints.append("Stripe: use server actions + webhook route; store customer_id on founders.")
    if "auth" in brief or "login" in brief:
        stack_hints.append("Auth: Supabase SSR cookies + middleware session refresh.")
    if "email" in brief or "newsletter" in brief:
        stack_hints.append("Email: Resend transactional + optional audience sync.")
    if not stack_hints:
        return ""
    return "Integration recipes:\n- " + "\n- ".join(stack_hints)


# ---------------------------------------------------------------------------
# Tier 3 — Compiled: build optimized context dict for specific pipeline stages
# ---------------------------------------------------------------------------

def compile_stage_context(
    karnex_ctx: Dict[str, Any],
    project_ctx: Optional[Dict[str, Any]] = None,
    stage: str = "build",
) -> Dict[str, Any]:
    """Build an optimized context dict tailored to a specific pipeline stage.

    Stages: crystallize, blueprint, assets, scaffold, build, integrate, qa, deploy
    """
    compiled: Dict[str, Any] = {
        "context_block": format_context_block(karnex_ctx),
        "stage": stage,
    }

    if project_ctx:
        compiled["project_context"] = project_ctx.get("project_context")
        compiled["icp_snapshot"] = project_ctx.get("icp_snapshot")
        compiled["roadmap_phase"] = project_ctx.get("roadmap_phase")
        compiled["past_decisions"] = project_ctx.get("forge_decisions", [])
        compiled["conversation_summary"] = project_ctx.get("conversation_summary")

    # Stage-specific context trimming for token efficiency
    if stage in ("crystallize", "blueprint"):
        # These stages need full ICP and roadmap
        compiled["include_icp"] = True
        compiled["include_roadmap"] = True
    elif stage == "assets":
        # Assets need ICP for copy but not full roadmap
        compiled["include_icp"] = True
        compiled["include_roadmap"] = False
    elif stage in ("build", "scaffold"):
        # Build stages need past decisions to avoid contradictions
        compiled["include_icp"] = False
        compiled["include_roadmap"] = False
    elif stage in ("qa", "deploy"):
        # QA and deploy need minimal context
        compiled["include_icp"] = False
        compiled["include_roadmap"] = False
        compiled.pop("past_decisions", None)

    return compiled


def build_run_manifest(
    input_dump: dict,
    *,
    detected_mode: str,
    project_type: str,
    model_ids_used: list,
) -> dict:
    return {
        "input": input_dump,
        "detected_mode": detected_mode,
        "project_type": project_type,
        "models_used": model_ids_used,
    }
