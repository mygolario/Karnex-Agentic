"""Shared OpenRouter LLM client for Karnex agents."""

from __future__ import annotations

import time
from typing import Any, Literal, Optional

from langchain_openai import ChatOpenAI

from shared.config import settings

StepRole = Literal[
    "classifier", "fast", "pro", "supervisor",
    "intent", "visual", "scaffold", "complex_logic", "debug", "deploy",
    "asset_generation", "copy_generation", "quality_check", "mirror_check"
]

_DEFAULT_HEADERS = {
    "HTTP-Referer": "https://karnex.ai",
    "X-Title": "Karnex",
}

# Error phrases that indicate an empty / unfinished response from the upstream model.
# This happens when OpenRouter returns content='' with finish_reason=None.
_EMPTY_RESPONSE_PHRASES = (
    "does not have a 'parsed' field",
    "does not have a 'refusal' field",
)


def invoke_structured_with_retry(chain: Any, input_data: Any, max_retries: int = 3) -> Any:
    """Invoke a LangChain structured-output chain with automatic retry.

    OpenRouter models (especially google/gemini-2.5-pro) occasionally return
    completely empty responses (content='', finish_reason=None, completion_tokens=0).
    LangChain's structured-output parser then raises a ValueError because it finds
    neither a 'parsed' nor a 'refusal' field in the empty message.

    Use this instead of chain.invoke() everywhere a structured-output chain is called.
    Retries up to max_retries times with exponential backoff (1s → 2s → 4s).
    """
    from shared.logger import logger  # local import to avoid circular deps

    last_err: Exception | None = None

    for attempt in range(max_retries):
        try:
            return chain.invoke(input_data)
        except ValueError as exc:
            msg = str(exc)
            if any(phrase in msg for phrase in _EMPTY_RESPONSE_PHRASES):
                last_err = exc
                wait = 2 ** attempt  # 1s → 2s → 4s
                logger.warning(
                    "[OpenRouter] Empty structured-output response "
                    f"(attempt {attempt + 1}/{max_retries}). "
                    f"Retrying in {wait}s…"
                )
                time.sleep(wait)
            else:
                raise  # unrelated ValueError — propagate immediately

    logger.error(
        f"[OpenRouter] Structured output failed after {max_retries} retries. "
        "Check OpenRouter quota / model availability."
    )
    raise last_err  # type: ignore[misc]


class OpenRouterChatModel(ChatOpenAI):
    """Custom ChatOpenAI subclass to handle OpenRouter structured output compatibility."""

    def with_structured_output(
        self,
        schema: Any,
        *,
        method: Optional[str] = None,
        include_raw: bool = False,
        **kwargs: Any,
    ) -> Any:
        # OpenRouter models often fail with strict=True or default json_schema.
        # Force function_calling and disable strict mode for maximum compatibility.
        kwargs["strict"] = False
        if method is None or method == "json_schema":
            method = "function_calling"

        return super().with_structured_output(
            schema,
            method=method,
            include_raw=include_raw,
            **kwargs,
        )


def create_chat_model(
    openrouter_model: str,
    *,
    max_tokens: int,
    temperature: float = 0.3,
) -> OpenRouterChatModel:
    """Create a LangChain ChatOpenAI pointed at OpenRouter."""
    return OpenRouterChatModel(
        model=openrouter_model,
        openai_api_key=settings.OPENROUTER_API_KEY,
        openai_api_base=settings.OPENROUTER_BASE_URL,
        max_tokens=max_tokens,
        default_headers=_DEFAULT_HEADERS,
        temperature=temperature,
    )


def model_from_catalog_entry(
    entry: dict[str, Any],
    *,
    step_role: Optional[StepRole] = None,
) -> ChatOpenAI:
    """Instantiate ChatOpenAI from a catalog entry dict.

    If step_role is provided and the entry has a step_max_tokens mapping,
    the per-role token cap is used instead of the global max_tokens.
    This prevents expensive oversized responses for simple steps.
    """
    global_max = int(entry.get("max_tokens", settings.OPENROUTER_MAX_TOKENS_BUILDER))

    if step_role:
        step_caps: dict = entry.get("step_max_tokens") or {}
        mapped_role = step_role
        if step_role in ("intent", "supervisor"):
            mapped_role = "supervisor"
        elif step_role in ("visual", "complex_logic", "debug", "pro", "asset_generation", "copy_generation", "quality_check", "mirror_check"):
            mapped_role = "pro"
        elif step_role in ("scaffold", "deploy", "fast"):
            mapped_role = "fast"

        max_tokens = int(step_caps.get(mapped_role, global_max))
    else:
        max_tokens = global_max

    return create_chat_model(
        entry["openrouter_model"],
        max_tokens=max_tokens,
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
        if step_role in ("classifier", "fast", "scaffold", "deploy") and selected.get("role") == "pro" and not max_mode:
            pass  # fall through to auto-select a cheaper model for fast steps
        else:
            return selected

    # Dynamic routing overrides based on requested stage role
    if step_role == "intent":
        for prefer in ("claude-sonnet-4.6-thinking", "gemini-3.1-pro-high"):
            if prefer in by_id:
                return by_id[prefer]
    elif step_role in ("visual", "asset_generation", "copy_generation"):
        for prefer in ("gemini-3.1-pro-high", "claude-sonnet-4.6-thinking"):
            if prefer in by_id:
                return by_id[prefer]
    elif step_role in ("complex_logic", "mirror_check"):
        for prefer in ("claude-opus-4.6-thinking", "claude-sonnet-4.6-thinking", "gemini-3.1-pro-high"):
            if prefer in by_id:
                return by_id[prefer]
    elif step_role in ("debug", "quality_check"):
        for prefer in ("claude-sonnet-4.6-thinking", "gemini-3.1-pro-high"):
            if prefer in by_id:
                return by_id[prefer]

    elif step_role == "scaffold":
        for prefer in ("karnex-forge-fast-high", "gemini-3.5-flash-high"):
            if prefer in by_id:
                return by_id[prefer]
    elif step_role == "deploy":
        for prefer in ("karnex-forge-fast-medium", "gemini-3.5-flash-medium"):
            if prefer in by_id:
                return by_id[prefer]

    # Fallbacks for standard roles
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
