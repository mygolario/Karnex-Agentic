"""Project type detection and subagent rosters for multi-stack Forge builds."""

from __future__ import annotations

import re
from typing import List, Literal, Optional

ProjectType = Literal[
    "web_nextjs",
    "mobile_expo",
    "api_service",
    "infra_devops",
    "fullstack_monorepo",
    "auto",
]

_VALID_TYPES = {
    "web_nextjs",
    "mobile_expo",
    "api_service",
    "infra_devops",
    "fullstack_monorepo",
}


def normalize_project_type(value: Optional[str]) -> ProjectType:
    if value and value in _VALID_TYPES:
        return value  # type: ignore[return-value]
    return "auto"


def detect_project_type(specification: str, task_type: str) -> str:
    """Infer project type from spec and task_type."""
    text = f"{task_type} {specification}".lower()
    if any(k in text for k in ("expo", "react native", "react-native", "mobile app", "ios", "android")):
        return "mobile_expo"
    if any(k in text for k in ("dockerfile", "ci/cd", "github actions", "railway", "terraform", "kubernetes")):
        return "infra_devops"
    if any(k in text for k in ("fastapi only", "api service", "rest api", "graphql api", "backend only")):
        return "api_service"
    if any(k in text for k in ("monorepo", "full stack", "fullstack", "web and mobile")):
        return "fullstack_monorepo"
    return "web_nextjs"


def resolve_project_type(specification: str, task_type: str, declared: Optional[str]) -> str:
    normalized = normalize_project_type(declared)
    if normalized != "auto":
        return normalized
    return detect_project_type(specification, task_type)


def get_subagent_roster(project_type: str) -> List[str]:
    rosters = {
        "web_nextjs": ["supervisor", "db_designer", "ui_coder", "linter", "github"],
        "mobile_expo": ["supervisor", "expo_scaffold", "rn_screen_coder", "linter", "github"],
        "api_service": ["supervisor", "api_route_coder", "db_designer", "openapi", "github"],
        "infra_devops": ["supervisor", "docker_coder", "ci_coder", "railway_config"],
        "fullstack_monorepo": ["supervisor", "db_designer", "ui_coder", "api_route_coder", "linter", "github"],
    }
    return rosters.get(project_type, rosters["web_nextjs"])


def file_role_hints(project_type: str) -> str:
    hints = {
        "web_nextjs": "Use roles: db_migration, frontend_page, component, api_route.",
        "mobile_expo": "Use roles: expo_config, rn_screen, component, db_migration. Paths under app/ or src/.",
        "api_service": "Use roles: api_route, db_migration, openapi. Python FastAPI or Node preferred.",
        "infra_devops": "Use roles: dockerfile, ci_workflow, railway_config. No frontend pages.",
        "fullstack_monorepo": "Use roles: db_migration, frontend_page, api_route, component, expo_config if mobile mentioned.",
    }
    return hints.get(project_type, hints["web_nextjs"])


def stack_prompt_suffix(project_type: str, tech_stack: Optional[dict]) -> str:
    stack = tech_stack or {}
    base = (
        f"Project type: {project_type}. "
        f"Framework: {stack.get('framework', 'nextjs')}. "
        f"Styling: {stack.get('styling', 'tailwind')}. "
        f"Database: {stack.get('database', 'supabase')}. "
        f"{file_role_hints(project_type)}"
    )
    if project_type == "mobile_expo":
        base += " Generate Expo Router structure and TypeScript screens."
    elif project_type == "api_service":
        base += " Prefer FastAPI or Next.js API routes with clear OpenAPI comments."
    elif project_type == "infra_devops":
        base += re.sub(r"frontend_page|component", "config", base)
    return base
