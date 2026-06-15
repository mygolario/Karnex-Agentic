"""Shared OpenRouter LLM client for Karnex agents."""

from __future__ import annotations

import time
from typing import Any, Literal, Optional

from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI

from shared.config import settings

StepRole = Literal["classifier", "fast", "pro", "supervisor"]

_DEFAULT_HEADERS = {
    "HTTP-Referer": "https://karnex.ai",
    "X-Title": "Karnex",
}

# Phrases that indicate an empty / unfinished response from the upstream model.
# This happens when OpenRouter returns content='' with finish_reason=None.
_EMPTY_RESPONSE_PHRASES = (
    "does not have a 'parsed' field",
    "does not have a 'refusal' field",
)


def _make_retry_runnable(primary_chain: Any, fallback_chain: Any, max_retries: int = 3) -> RunnableLambda:
    """Return a RunnableLambda that retries *primary_chain* on empty OpenRouter responses.

    OpenRouter models (especially google/gemini-2.5-pro) occasionally return
    completely empty responses (content='', finish_reason=None, completion_tokens=0).
    LangChain's structured-output parser then raises a ValueError because it finds
    neither a 'parsed' nor a 'refusal' field in the empty message.

    The returned RunnableLambda is a genuine LangChain Runnable so it works
    transparently with the pipe operator (prompt | llm.with_structured_output(...)).

    Strategy:
      1. Retry primary (function_calling) chain up to *max_retries* times with
         exponential backoff (1 s → 2 s → 4 s) on the specific empty-response error.
      2. Fall back to json_mode chain if all retries are exhausted.
    """

    def _invoke(input_data: Any) -> Any:
        from shared.logger import logger  # local import to avoid circular deps

        last_err: Exception | None = None

        # ── Retry loop (function_calling) ───────────────────────────────
        for attempt in range(max_retries):
            try:
                return primary_chain.invoke(input_data)
            except ValueError as exc:
                msg = str(exc)
                is_empty = any(phrase in msg for phrase in _EMPTY_RESPONSE_PHRASES)
                if is_empty:
                    last_err = exc
                    wait = 2 ** attempt  # 1 s → 2 s → 4 s
                    logger.warning(
                        "[OpenRouter] Empty structured-output response "
                        f"(attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {wait}s…"
                    )
                    time.sleep(wait)
                else:
                    raise  # unrelated ValueError — propagate immediately

        # ── json_mode fallback ──────────────────────────────────────────
        logger.warning(
            f"[OpenRouter] function_calling exhausted after {max_retries} retries. "
            "Falling back to json_mode."
        )
        try:
            return fallback_chain.invoke(input_data)
        except Exception as fallback_exc:
            logger.error(f"[OpenRouter] json_mode fallback also failed: {fallback_exc}")
            raise last_err  # type: ignore[misc]

    return RunnableLambda(_invoke)


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
        # Force function_calling method and disable strict mode to maximize compatibility.
        kwargs["strict"] = False
        if method is None or method == "json_schema":
            method = "function_calling"

        primary_chain = super().with_structured_output(
            schema,
            method=method,
            include_raw=include_raw,
            **kwargs,
        )

        # Build a json_mode fallback chain used when function_calling keeps
        # returning empty responses. If json_mode is unsupported by the model,
        # reuse primary_chain so setup never crashes.
        try:
            fallback_chain = super().with_structured_output(
                schema,
                method="json_mode",
                include_raw=include_raw,
            )
        except Exception:
            fallback_chain = primary_chain

        # Return a genuine LangChain RunnableLambda so it works with | pipes.
        return _make_retry_runnable(primary_chain, fallback_chain)


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
        max_tokens = int(step_caps.get(step_role, global_max))
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
        if step_role in ("classifier", "fast") and selected.get("role") == "pro" and not max_mode:
            pass  # fall through to auto-select a cheaper model for fast steps
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


