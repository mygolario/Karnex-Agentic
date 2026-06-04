"""Karnex context injection — Memory, ICP, War Room / sprint tasks."""

from __future__ import annotations

from typing import Any, Dict, Optional

from agents.pain_transformer.tools import karnex_memory_read
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


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

    sprint_id = task_id or war_room_task_id
    if sprint_id:
        try:
            sb = supabase or get_supabase_admin()
            res = (
                sb.table("sprint_tasks")
                .select("id, title, description, category, agent_config")
                .eq("id", sprint_id)
                .maybe_single()
                .execute()
            )
            if res.data:
                ctx["sprint_task"] = res.data
                ctx["lineage_label"] = f"Sprint: {res.data.get('title', sprint_id)}"
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
