"""Mirror Agent integration — challenges startup assumptions before deployment."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from agents.builder.schemas import BuilderOutput
from agents.forge.catalog import load_catalog
from shared.logger import logger
from shared.openrouter_client import (
    invoke_structured_with_retry,
    model_from_catalog_entry,
    resolve_step_model,
)
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate


class MirrorChallenge(BaseModel):
    challenge: str = Field(..., description="The assumption or decision challenged by the Mirror Agent.")
    context: str = Field(..., description="Why this is a potential risk based on current startup progress.")
    recommendation: str = Field(..., description="Suggested remediation or pivot.")
    severity: str = Field(..., description="Severity level: 'high' | 'medium' | 'low'.")


class MirrorCheckResponse(BaseModel):
    challenges: List[MirrorChallenge] = Field(default_factory=list, description="List of product assumptions challenged.")
    recommendation: str = Field(..., description="Overall strategic recommendation.")
    severity: str = Field(..., description="Highest severity level found.")


async def run_mirror_check(
    founder_id: str,
    project_context: Dict[str, Any],
    output: BuilderOutput,
    supabase: Any = None,
) -> Dict[str, Any]:
    """Challenge assumptions before deploy.

    Uses OpenRouter to analyze the generated app specs/files against
    the founder's actual target customer pain points and roadmap progression.
    Returns Dict with challenges, recommendation, severity.
    """
    try:
        catalog = load_catalog()
        entry = resolve_step_model(
            catalog,
            model_id=None,
            auto_model=True,
            max_mode=False,
            step_role="mirror_check"
        )
        llm = model_from_catalog_entry(entry, step_role="mirror_check")

        file_manifest = [
            {"path": f.path, "description": f.description}
            for f in (output.files or [])
        ]

        system_prompt = (
            "You are the Mirror Agent, the critical sounding board for the startup founder.\n"
            "Your role is to challenge product decisions, point out scope creep, identify architectural risk,\n"
            "and call out features that do not align with the target customer persona or ICP.\n"
            "Compare what was built against the startup profile. Be direct, objective, and realistic."
        )

        user_prompt = (
            f"Founder Startup Context:\n{json.dumps(project_context, indent=2)}\n\n"
            f"Generated Product Summary:\n{output.summary}\n\n"
            f"Generated Files:\n{json.dumps(file_manifest, indent=2)}\n\n"
            "Analyze and output challenges to these assumptions, a strategic recommendation, and severity."
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_prompt}"),
        ])

        chain = prompt | llm.with_structured_output(MirrorCheckResponse)
        _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}

        res: MirrorCheckResponse = await invoke_structured_with_retry(chain, _input)
        return res.model_dump()

    except Exception as e:
        logger.warning(f"Mirror check failed: {e}")
        return {
            "challenges": [],
            "recommendation": "Could not execute Mirror Agent validation.",
            "severity": "low"
        }
