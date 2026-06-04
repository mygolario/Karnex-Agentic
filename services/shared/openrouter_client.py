"""Shared OpenRouter LLM client for Karnex agents."""

from __future__ import annotations

from typing import Any, Literal, Optional

from langchain_openai import ChatOpenAI

from shared.config import settings

StepRole = Literal["classifier", "fast", "pro", "supervisor"]

_DEFAULT_HEADERS = {
    "HTTP-Referer": "https://karnex.ai",
    "X-Title": "Karnex",
}


def create_chat_model(
    openrouter_model: str,
    *,
    max_tokens: int,
    temperature: float = 0.3,
) -> ChatOpenAI:
    """Create a LangChain ChatOpenAI pointed at OpenRouter."""
    return ChatOpenAI(
        model=openrouter_model,
        openai_api_key=settings.OPENROUTER_API_KEY,
        openai_api_base=settings.OPENROUTER_BASE_URL,
        max_tokens=max_tokens,
        default_headers=_DEFAULT_HEADERS,
        temperature=temperature,
    )


def model_from_catalog_entry(entry: dict[str, Any]) -> ChatOpenAI:
    """Instantiate ChatOpenAI from a catalog entry dict."""
    return create_chat_model(
        entry["openrouter_model"],
        max_tokens=int(entry.get("max_tokens", settings.OPENROUTER_MAX_TOKENS_BUILDER)),
        temperature=float(entry.get("temperature", 0.3)),
    )


def resolve_step_model(
    catalog: dict[str, Any],
    *,
    model_id: Optional[str],
    auto_model: bool,
    max_mode: bool,
    step_role: StepRole,
) -> dict[str, Any]:
    """Pick catalog entry for a pipeline step."""
    models = catalog.get("models") or []
    by_id = {m["id"]: m for m in models}

    if model_id and model_id in by_id and not auto_model:
        selected = by_id[model_id]
        if step_role in ("classifier", "fast") and selected.get("role") == "pro" and not max_mode:
            pass
        else:
            return selected

    if max_mode or step_role in ("supervisor", "pro"):
        for prefer in ("gemini-3.1-pro-high", "claude-sonnet-4.6-thinking", "karnex-forge-fast-high"):
            if prefer in by_id:
                return by_id[prefer]

    if step_role == "classifier":
        for prefer in ("karnex-forge-fast-low", "gemini-3.5-flash-low"):
            if prefer in by_id:
                return by_id[prefer]

    if step_role == "fast":
        for prefer in ("karnex-forge-fast-medium", "gemini-3.5-flash-medium"):
            if prefer in by_id:
                return by_id[prefer]

    default_id = catalog.get("default_model_id", "karnex-forge-fast-high")
    return by_id.get(default_id) or models[0]
