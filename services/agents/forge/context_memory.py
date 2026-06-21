"""Karnex Forge Context & Memory Engine.
Synchronizes long-term startup profiles and manages sliding-window conversation compression.
"""

from __future__ import annotations

import asyncio
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
from shared.logger import logger
from shared.supabase_client import get_supabase_admin
from agents.forge.catalog import load_catalog
from agents.pain_transformer.tools import karnex_memory_read


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ConversationSummary(BaseModel):
    summary: str = Field(..., description="A concise summary of user intent and code updates so far")
    key_decisions: List[str] = Field(default_factory=list, description="Architecture or design choices made")
    active_features: List[str] = Field(default_factory=list, description="List of features implemented or queued")
    project_state: str = Field("", description="High-level project state description")


# ---------------------------------------------------------------------------
# Sliding-window conversation compression
# ---------------------------------------------------------------------------

_VERBATIM_WINDOW = 10  # Keep last N messages verbatim


async def compress_conversation_history(
    messages: List[Dict[str, Any]],
    previous_summary: Optional[str] = None,
    model_id: Optional[str] = None,
) -> ConversationSummary:
    """Summarizes historic messages into a compressed state context block to prevent token overflow.

    Implements proper sliding window:
      - Last 10 messages are kept verbatim (not summarized)
      - Older messages are compressed into a structured project state
    """
    if not messages:
        return ConversationSummary(
            summary="No conversations recorded.",
            key_decisions=[],
            active_features=[],
            project_state="empty",
        )

    # If fewer than the window size, no compression needed
    if len(messages) <= _VERBATIM_WINDOW and not previous_summary:
        return ConversationSummary(
            summary="Conversation is within context window; no compression needed.",
            key_decisions=[],
            active_features=[],
            project_state="active",
        )

    # Separate messages into old (to summarize) and recent (verbatim)
    old_messages = messages[:-_VERBATIM_WINDOW] if len(messages) > _VERBATIM_WINDOW else []
    recent_messages = messages[-_VERBATIM_WINDOW:]

    # Only summarize if there are old messages to compress
    if not old_messages and previous_summary:
        return ConversationSummary(
            summary=previous_summary,
            key_decisions=[],
            active_features=[],
            project_state="active",
        )

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
        "Keep the summary brief and technical. Include a project_state field that captures the overall state "
        "(e.g., 'scaffolding', 'building UI', 'debugging', 'deploying')."
    )

    user_prompt = (
        f"Previous summary: {previous_summary or 'None'}\n"
        f"Messages to compress (older batch):\n{json.dumps(old_messages[-20:], indent=2)}\n"
        f"Note: {len(recent_messages)} recent messages are kept verbatim and not included here.\n"
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


async def save_conversation_compression(
    project_id: str,
    messages: List[Dict[str, Any]],
    summary: ConversationSummary,
    supabase: Any = None,
) -> None:
    """Save compressed summary to forge_conversations table.

    Persists:
      - summary text
      - message_count
      - context_window_tokens (estimated)
    """
    sb = supabase or get_supabase_admin()

    # Estimate token count (rough: 4 chars per token)
    total_chars = sum(len(json.dumps(m)) for m in messages)
    estimated_tokens = total_chars // 4

    try:
        # Upsert based on project_id
        sb.table("forge_conversations").upsert({
            "project_id": project_id,
            "messages": messages[-_VERBATIM_WINDOW:],  # Only keep recent verbatim
            "summary": summary.model_dump(),
            "message_count": len(messages),
            "context_window_tokens": estimated_tokens,
            "compressed_at": "now()",
        }, on_conflict="project_id").execute()
    except Exception as e:
        logger.warning(f"Could not save conversation compression for project {project_id}: {e}")


# ---------------------------------------------------------------------------
# Startup context aggregation
# ---------------------------------------------------------------------------

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
