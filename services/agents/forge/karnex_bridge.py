"""Karnex Forge cross-module context bridge.

Aggregates context from Karnex Memory, Architect, Compass, and Decision Journal
to provide the Forge pipeline with full founder context.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from agents.pain_transformer.tools import karnex_memory_read
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


async def load_icp_context(founder_id: str) -> Dict[str, Any]:
    """Pull ICP personas from Karnex Memory for copy generation."""
    try:
        personas = karnex_memory_read(founder_id, "icp-definer", "personas")
        if personas and isinstance(personas, dict):
            return {
                "personas": personas.get("personas", []),
                "target_audience": personas.get("target_audience", ""),
                "positioning": personas.get("positioning", ""),
                "pain_points": personas.get("pain_points", []),
            }
    except Exception as e:
        logger.warning(f"Karnex bridge: could not load ICP for {founder_id}: {e}")
    return {}


async def load_roadmap_context(founder_id: str, supabase: Any = None) -> Dict[str, Any]:
    """Pull current roadmap phase and active sprint from Architect layer."""
    sb = supabase or get_supabase_admin()
    context: Dict[str, Any] = {
        "phase": None,
        "active_sprint": None,
        "blocking_tasks": [],
        "next_milestone": None,
    }
    try:
        # Load 90-day roadmap excerpt from memory
        roadmap = karnex_memory_read(founder_id, "war-room", "roadmap_90_day")
        if roadmap and isinstance(roadmap, dict):
            context["phase"] = roadmap.get("current_phase")
    except Exception as e:
        logger.warning(f"Karnex bridge: roadmap memory unavailable: {e}")

    try:
        # Load active sprint
        res = (
            sb.table("sprints")
            .select("id, title, sprint_number, focus_area, status, goals")
            .eq("founder_id", founder_id)
            .eq("status", "active")
            .order("week_start", desc=True)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            sprint = res.data[0]
            context["active_sprint"] = {
                "id": sprint["id"],
                "title": sprint["title"],
                "number": sprint["sprint_number"],
                "focus": sprint.get("focus_area"),
                "goals": sprint.get("goals", []),
            }

            # Load blocking tasks in this sprint
            tasks_res = (
                sb.table("tasks")
                .select("id, title, status, category")
                .eq("sprint_id", sprint["id"])
                .eq("status", "blocked")
                .execute()
            )
            if tasks_res.data:
                context["blocking_tasks"] = [
                    {"title": t["title"], "category": t.get("category")}
                    for t in tasks_res.data[:5]
                ]
    except Exception as e:
        logger.warning(f"Karnex bridge: sprint data unavailable: {e}")

    try:
        # Load next milestone
        res = (
            sb.table("milestones")
            .select("title, target_date, status, target_metric")
            .eq("founder_id", founder_id)
            .in_("status", ["not_started", "in_progress", "at_risk"])
            .order("target_date", desc=False)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            m = res.data[0]
            context["next_milestone"] = {
                "title": m["title"],
                "target_date": m.get("target_date"),
                "status": m["status"],
            }
    except Exception as e:
        logger.warning(f"Karnex bridge: milestone data unavailable: {e}")

    return context


async def load_momentum_score(founder_id: str, supabase: Any = None) -> Optional[int]:
    """Get founder's current momentum score."""
    sb = supabase or get_supabase_admin()
    try:
        res = (
            sb.table("founders")
            .select("momentum_score")
            .eq("id", founder_id)
            .maybe_single()
            .execute()
        )
        if res.data:
            return res.data.get("momentum_score")
    except Exception as e:
        logger.warning(f"Karnex bridge: could not load momentum for {founder_id}: {e}")
    return None


async def load_founder_voice(founder_id: str) -> Dict[str, Any]:
    """Get founder voice profile for copy generation tone matching."""
    try:
        voice = karnex_memory_read(founder_id, "founder-profile", "voice")
        if voice and isinstance(voice, dict):
            return {
                "tone": voice.get("communication_tone", "professional"),
                "style": voice.get("writing_style", ""),
                "vocabulary": voice.get("preferred_vocabulary", []),
            }
    except Exception as e:
        logger.warning(f"Karnex bridge: voice profile unavailable: {e}")
    return {"tone": "professional", "style": "", "vocabulary": []}


async def load_decision_history(
    founder_id: str, supabase: Any = None, limit: int = 10
) -> List[Dict[str, Any]]:
    """Get relevant past decisions to prevent contradictory architectural choices."""
    sb = supabase or get_supabase_admin()
    decisions: List[Dict[str, Any]] = []
    try:
        res = (
            sb.table("decisions")
            .select("title, description, rationale, category, created_at")
            .eq("founder_id", founder_id)
            .in_("category", ["technical", "product", "strategy"])
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        if res.data:
            decisions = [
                {
                    "title": d["title"],
                    "rationale": d.get("rationale", ""),
                    "category": d["category"],
                }
                for d in res.data
            ]
    except Exception as e:
        logger.warning(f"Karnex bridge: decision history unavailable: {e}")

    # Also check forge-specific decisions in founder_memory
    try:
        forge_decisions = karnex_memory_read(founder_id, "forge", "decision_journal")
        if forge_decisions and isinstance(forge_decisions, dict):
            entries = forge_decisions.get("entries", [])
            for entry in entries[-5:]:
                decisions.append({
                    "title": entry.get("decision", ""),
                    "rationale": entry.get("context", ""),
                    "category": "forge",
                })
    except Exception:
        pass

    return decisions


async def build_full_karnex_context(
    founder_id: str, supabase: Any = None
) -> Dict[str, Any]:
    """Aggregate all cross-module context into a single dict for Forge pipeline injection."""
    sb = supabase or get_supabase_admin()

    icp = await load_icp_context(founder_id)
    roadmap = await load_roadmap_context(founder_id, sb)
    momentum = await load_momentum_score(founder_id, sb)
    voice = await load_founder_voice(founder_id)
    decisions = await load_decision_history(founder_id, sb)

    return {
        "icp": icp,
        "roadmap": roadmap,
        "momentum_score": momentum,
        "founder_voice": voice,
        "decisions": decisions,
        "has_icp": bool(icp.get("personas")),
        "has_roadmap": bool(roadmap.get("phase")),
        "momentum_level": (
            "high" if (momentum or 0) >= 70
            else "medium" if (momentum or 0) >= 40
            else "low"
        ),
    }
