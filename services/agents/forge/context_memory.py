"""Karnex Forge Context & Memory Engine.
Synchronizes long-term startup profiles and manages sliding-window conversation compression.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

from shared.openrouter_client import (
    invoke_structured_with_retry,
    model_from_catalog_entry,
    resolve_step_model,
)
from agents.forge.catalog import load_catalog
from agents.pain_transformer.tools import karnex_memory_read


class ConversationSummary(BaseModel):
    summary: str = Field(..., description="A concise summary of user intent and code updates so far")
    key_decisions: List[str] = Field(default_factory=list, description="Architecture or design choices made")
    active_features: List[str] = Field(default_factory=list, description="List of features implemented or queued")


async def compress_conversation_history(
    messages: List[Dict[str, Any]],
    previous_summary: Optional[str] = None,
    model_id: Optional[str] = None,
) -> ConversationSummary:
    """Summarizes historic messages into a compressed state context block to prevent token overflow."""
    if not messages:
        return ConversationSummary(summary="No conversations recorded.", key_decisions=[], active_features=[])

    catalog = load_catalog()
    entry = resolve_step_model(
        catalog,
        model_id=model_id,
        auto_model=True,
        max_mode=False,
        step_role="classifier",
    )
    llm = model_from_catalog_entry(entry, step_role="classifier")

    system_prompt = (
        "You are the Chief of Staff memory agent. Your role is to analyze a sequence of developer conversation messages "
        "and produce a tight, compressed summary, listing key architectural decisions and active features built. "
        "Keep the summary brief and technical."
    )

    user_prompt = (
        f"Previous summary: {previous_summary or 'None'}\n"
        f"Recent messages to incorporate:\n{json.dumps(messages[-10:], indent=2)}\n"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", user_prompt),
    ])

    chain = prompt | llm.with_structured_output(ConversationSummary)
    
    _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}
    compressed: ConversationSummary = await asyncio.to_thread(
        lambda: invoke_structured_with_retry(chain, _input)
    )

    return compressed


def get_forge_context_summary(founder_id: str, supabase: Any) -> Dict[str, Any]:
    """Pulls Startup Brief, ICP details, and roadmap targets into a combined context dict."""
    ctx = {
        "startup_brief": "Not specified yet",
        "icp_personas": "Not specified yet",
        "active_milestone": "Not specified yet",
    }

    try:
        brief = karnex_memory_read(founder_id, "idea-crystallizer", "product_brief")
        if brief:
            ctx["startup_brief"] = brief
    except Exception:
        pass

    try:
        personas = karnex_memory_read(founder_id, "icp-definer", "personas")
        if personas:
            ctx["icp_personas"] = personas
    except Exception:
        pass

    try:
        roadmap = karnex_memory_read(founder_id, "war-room", "roadmap_90_day")
        if roadmap:
            ctx["active_milestone"] = roadmap
    except Exception:
        pass

    return ctx
