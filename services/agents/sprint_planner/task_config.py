"""Deterministic agent_config enrichment for sprint tasks."""

from typing import Any, Dict, List, Optional, Tuple

from agents.pain_transformer.tools import karnex_memory_read
from agents.sprint_planner.schemas import SprintTask, TaskAgentConfig
from shared.agent_step_catalog import get_step_labels
from shared.logger import logger
from shared.supabase_client import get_supabase_admin

AGENT_ID_ALIASES: Dict[str, str] = {
    "builder": "builder-v1",
    "builder-v1": "builder-v1",
    "research": "research-v1",
    "research-v1": "research-v1",
    "outreach": "outreach-v1",
    "outreach-v1": "outreach-v1",
    "content-seo-v1": "content-seo-v1",
    "content": "content-seo-v1",
}

EXECUTE_LABELS: Dict[str, str] = {
    "build": "Let Karnex build this",
    "research": "Let Karnex research this",
    "outreach": "Let Karnex draft this campaign",
    "content": "Let Karnex write this",
}

DURATION_SECONDS: Dict[str, int] = {
    "build": 90,
    "research": 45,
    "outreach": 30,
    "content": 60,
}

IMPLEMENTED_AGENTS = {"builder-v1", "research-v1", "outreach-v1"}


def _normalize_agent_id(raw: Optional[str], category: str) -> Optional[str]:
    if raw:
        normalized = AGENT_ID_ALIASES.get(raw.strip().lower(), raw.strip())
        if normalized in IMPLEMENTED_AGENTS:
            return normalized
        if normalized == "content-seo-v1":
            return None
    category_defaults = {
        "build": "builder-v1",
        "research": "research-v1",
        "outreach": "outreach-v1",
    }
    return category_defaults.get(category)


def load_founder_context(founder_id: str) -> Dict[str, Any]:
    """Load product brief, ICP, startup, and tech context for task pre-population."""
    ctx: Dict[str, Any] = {
        "product_brief": {},
        "icp_document": {},
        "startup_id": None,
        "github_repo": None,
        "tech_stack": {
            "framework": "nextjs",
            "styling": "tailwind",
            "database": "supabase",
        },
        "codebase_summary": "Next.js App Router app with Supabase auth and Tailwind styling.",
    }

    try:
        supabase = get_supabase_admin()
        startup_res = (
            supabase.table("startups")
            .select("id, product_brief, icp_document, github_repo_url, tech_stack")
            .eq("founder_id", founder_id)
            .eq("is_active", True)
            .limit(1)
            .maybe_single()
            .execute()
        )
        if startup_res and startup_res.data:
            row = startup_res.data
            ctx["startup_id"] = row.get("id")
            if row.get("product_brief"):
                ctx["product_brief"] = row["product_brief"]
            if row.get("icp_document"):
                ctx["icp_document"] = row["icp_document"]
            if row.get("github_repo_url"):
                ctx["github_repo"] = row["github_repo_url"]
            if row.get("tech_stack") and isinstance(row["tech_stack"], dict):
                ctx["tech_stack"] = {**ctx["tech_stack"], **row["tech_stack"]}
    except Exception as e:
        logger.warning(f"Could not load startup context for sprint planner: {e}")

    if not ctx["product_brief"]:
        for ns, key in [
            ("idea-crystallizer", "product_brief"),
            ("idea_crystallizer", "product_brief"),
            ("war-room", "product_brief"),
        ]:
            mem = karnex_memory_read(founder_id, ns, key)
            if mem:
                ctx["product_brief"] = mem.get("product_brief", mem)
                break

    if not ctx["icp_document"]:
        for ns, key in [
            ("icp-definer", "icp"),
            ("icp_definer", "icp"),
            ("war-room", "icp_document"),
        ]:
            mem = karnex_memory_read(founder_id, ns, key)
            if mem:
                ctx["icp_document"] = mem.get("icp", mem.get("icp_document", mem))
                break

    if not ctx["github_repo"]:
        try:
            supabase = get_supabase_admin()
            gh = (
                supabase.table("integrations")
                .select("config")
                .eq("founder_id", founder_id)
                .eq("provider", "github")
                .eq("status", "active")
                .limit(1)
                .maybe_single()
                .execute()
            )
            if gh and gh.data and isinstance(gh.data.get("config"), dict):
                repo = gh.data["config"].get("repo_url") or gh.data["config"].get("default_repo")
                if repo:
                    ctx["github_repo"] = repo
        except Exception as e:
            logger.warning(f"Could not load GitHub integration: {e}")

    brief = ctx["product_brief"] if isinstance(ctx["product_brief"], dict) else {}
    if brief:
        pitch = brief.get("elevator_pitch") or brief.get("tagline") or ""
        name = brief.get("selected_name") or brief.get("title") or ""
        if pitch or name:
            ctx["codebase_summary"] = f"{name}: {pitch}".strip(": ").strip() or ctx["codebase_summary"]

    for ns, key in [
        ("founder_preferences", "tech_stack_preferences"),
        ("idea-crystallizer", "tech_stack_preferences"),
        ("war-room", "tech_stack"),
        ("idea_crystallizer", "product_brief"),
    ]:
        mem = karnex_memory_read(founder_id, ns, key)
        if not mem:
            continue
        if key == "tech_stack_preferences" and isinstance(mem, dict):
            ctx["tech_stack"] = {**ctx["tech_stack"], **mem}
        elif key == "tech_stack" and isinstance(mem, dict):
            ctx["tech_stack"] = {**ctx["tech_stack"], **mem}
        elif key == "product_brief" and isinstance(mem, dict):
            prefs = mem.get("founder_preferences") or mem.get("tech_preference")
            if isinstance(prefs, dict) and prefs.get("tech_preference"):
                ctx["tech_stack"]["framework"] = prefs.get("tech_preference", ctx["tech_stack"]["framework"])

    return ctx


def _icp_audience_snippet(icp: Any) -> str:
    if not isinstance(icp, dict):
        return "Target ICP from your product brief"
    demo = icp.get("demographic") or {}
    psycho = icp.get("psychographic") or {}
    titles = demo.get("job_titles") if isinstance(demo, dict) else None
    if titles and isinstance(titles, list):
        return ", ".join(titles[:3])
    if isinstance(psycho, dict) and psycho.get("motivations"):
        m = psycho["motivations"]
        if isinstance(m, list) and m:
            return str(m[0])
    personas = icp.get("personas")
    if isinstance(personas, list) and personas:
        p0 = personas[0]
        if isinstance(p0, dict):
            return p0.get("job_title") or p0.get("name") or "Target ICP profiles"
    return "Target ICP profiles matching your product brief"


def _envelope_fields(founder_id: str) -> Dict[str, Any]:
    return {"founder_id": founder_id, "pre_populated": True}


def _build_pre_populated_input(
    task: SprintTask,
    agent_id: str,
    founder_ctx: Dict[str, Any],
    founder_id: str,
) -> Dict[str, Any]:
    spec = f"{task.title}\n\n{task.description}\n\nDefinition of done: {task.definition_of_done}"
    brief = founder_ctx.get("product_brief") or {}
    icp = founder_ctx.get("icp_document") or {}
    base = _envelope_fields(founder_id)

    if agent_id == "builder-v1":
        task_type = "custom"
        title_lower = task.title.lower()
        if any(w in title_lower for w in ("landing", "page", "homepage")):
            task_type = "landing_page"
        elif any(w in title_lower for w in ("auth", "login", "signup")):
            task_type = "auth_setup"
        elif any(w in title_lower for w in ("payment", "stripe", "billing")):
            task_type = "payment_integration"
        elif any(w in title_lower for w in ("dashboard", "admin")):
            task_type = "dashboard"
        elif any(w in title_lower for w in ("api", "endpoint", "route")):
            task_type = "api_endpoint"

        payload: Dict[str, Any] = {
            "task_type": task_type,
            "specification": spec,
            "tech_stack": founder_ctx.get("tech_stack"),
            "existing_codebase_context": founder_ctx.get("codebase_summary"),
        }
        if founder_ctx.get("github_repo"):
            payload["github_repo"] = founder_ctx["github_repo"]
        return {**base, **payload}

    if agent_id == "research-v1":
        scope = "general"
        title_lower = task.title.lower()
        if any(w in title_lower for w in ("competitor", "competitive", "rival")):
            scope = "competitor"
        elif any(w in title_lower for w in ("market", "tam", "sam")):
            scope = "market"
        elif any(w in title_lower for w in ("audience", "customer", "icp")):
            scope = "audience"
        return {
            **base,
            "research_question": task.title,
            "scope": scope,
            "depth": "standard",
            "constraints": f"ICP context: {_icp_audience_snippet(icp)}. Task: {task.description}",
        }

    if agent_id == "outreach-v1":
        contacts: List[Dict[str, str]] = []
        personas = icp.get("personas") if isinstance(icp, dict) else None
        if isinstance(personas, list):
            for p in personas[:3]:
                if isinstance(p, dict):
                    contacts.append({
                        "first_name": (p.get("name") or "Target").split()[0],
                        "company": p.get("company") or "Prospect Co",
                        "title": p.get("job_title") or "Decision maker",
                    })
        if not contacts:
            contacts = [
                {
                    "first_name": "Target",
                    "company": "Prospect",
                    "title": "Decision maker",
                }
            ]
        return {
            **base,
            "startup_id": founder_ctx.get("startup_id") or "active",
            "campaign_goal": task.title,
            "target_audience": _icp_audience_snippet(icp),
            "contacts": contacts,
            "channel": "email",
            "tone": "direct",
            "sequence_length": 3,
            "reference_content": (
                brief.get("elevator_pitch") if isinstance(brief, dict) else None
            ),
        }

    return base


def _build_context_summary(task: SprintTask, agent_id: str) -> str:
    if agent_id == "builder-v1":
        return (
            f"I'll build \"{task.title}\" — scaffolding code, Supabase schema where needed, "
            "and React components. I'll push to a feature branch when GitHub is connected."
        )
    if agent_id == "research-v1":
        return (
            f"I'll research \"{task.title}\" and deliver a structured brief with sources "
            "and recommended next steps, saved to your Vault."
        )
    if agent_id == "outreach-v1":
        return (
            f"I'll draft a personalized outreach campaign for \"{task.title}\". "
            "Nothing will be sent until you review and approve."
        )
    return f"Karnex will execute \"{task.title}\" using pre-configured sprint context."


def _is_config_complete(agent_id: str, pre_input: Dict[str, Any]) -> bool:
    if agent_id == "builder-v1":
        return bool(pre_input.get("specification") and pre_input.get("task_type"))
    if agent_id == "research-v1":
        return bool(pre_input.get("research_question"))
    if agent_id == "outreach-v1":
        return bool(
            pre_input.get("campaign_goal")
            and pre_input.get("target_audience")
            and pre_input.get("contacts")
        )
    return False


def enrich_sprint_task(
    task: SprintTask,
    founder_ctx: Dict[str, Any],
    founder_id: str,
) -> Tuple[Optional[TaskAgentConfig], str, bool, Optional[str]]:
    """
    Returns (agent_config, execute_label, auto_executable, delegated_to_agent).
    """
    agent_id = _normalize_agent_id(task.can_delegate_to_agent, task.category)
    if not agent_id:
        return None, "", False, None

    pre_input = _build_pre_populated_input(task, agent_id, founder_ctx, founder_id)
    if not _is_config_complete(agent_id, pre_input):
        return None, "", False, agent_id

    config = TaskAgentConfig(
        agent_id=agent_id,
        pre_populated_input=pre_input,
        context_summary=_build_context_summary(task, agent_id),
        estimated_duration_seconds=DURATION_SECONDS.get(task.category, 45),
        step_labels=get_step_labels(agent_id),
    )
    execute_label = EXECUTE_LABELS.get(task.category, "Let Karnex →")
    return config, execute_label, True, agent_id


def enrich_sprint_tasks(tasks: List[SprintTask], founder_id: str) -> List[SprintTask]:
    """Post-process all sprint tasks with agent_config metadata."""
    founder_ctx = load_founder_context(founder_id)
    enriched: List[SprintTask] = []
    for task in tasks:
        config, label, auto_exec, delegated = enrich_sprint_task(task, founder_ctx, founder_id)
        updates: Dict[str, Any] = {}
        if config:
            updates["agent_config"] = config
            if label:
                updates["execute_label"] = label
        if delegated and not task.can_delegate_to_agent:
            updates["can_delegate_to_agent"] = delegated
        enriched.append(task.model_copy(update=updates))
    return enriched
