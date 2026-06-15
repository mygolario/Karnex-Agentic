"""Shared OpenRouter LLM client for Karnex agents."""

from __future__ import annotations

import time
from typing import Any, Literal, Optional

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


class _RetryStructuredChain:
    """Wraps a structured-output chain with retry + json_mode fallback.

    OpenRouter models (especially google/gemini-2.5-pro) occasionally return
    completely empty responses (content='', finish_reason=None, completion_tokens=0).
    LangChain's structured-output parser then raises a ValueError because it finds
    neither a 'parsed' nor a 'refusal' field in the empty message.

    This wrapper:
      1. Retries the primary (function_calling) chain up to ``max_retries`` times
         with exponential backoff (1 s, 2 s, 4 s) when that specific error occurs.
      2. If all retries are exhausted, falls back to a json_mode chain as a last
         resort before re-raising.
    """

    def __init__(self, chain: Any, fallback_chain: Any, max_retries: int = 3) -> None:
        self._chain = chain
        self._fallback_chain = fallback_chain
        self._max_retries = max_retries

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _is_empty_response_error(exc: Exception) -> bool:
        msg = str(exc)
        return any(phrase in msg for phrase in _EMPTY_RESPONSE_PHRASES)

    # ------------------------------------------------------------------
    # Runnable interface — only invoke() is needed because all callers use
    # asyncio.to_thread(lambda: chain.invoke(...)) (synchronous invocation).
    # ------------------------------------------------------------------

    def invoke(self, input_data: Any, config: Any = None, **kwargs: Any) -> Any:
        from shared.logger import logger  # local import to avoid circular deps

        def _call(chain: Any) -> Any:
            if config is not None:
                return chain.invoke(input_data, config, **kwargs)
            return chain.invoke(input_data, **kwargs)

        last_err: Exception | None = None

        # ── Retry loop (function_calling) ───────────────────────────────
        for attempt in range(self._max_retries):
            try:
                return _call(self._chain)
            except ValueError as exc:
                if self._is_empty_response_error(exc):
                    last_err = exc
                    wait = 2 ** attempt  # 1 s → 2 s → 4 s
                    logger.warning(
                        "[OpenRouter] Empty structured-output response "
                        f"(attempt {attempt + 1}/{self._max_retries}). "
                        f"Retrying in {wait}s…"
                    )
                    time.sleep(wait)
                else:
                    raise  # unrelated ValueError — propagate immediately

        # ── json_mode fallback ──────────────────────────────────────────
        logger.warning(
            "[OpenRouter] function_calling exhausted after "
            f"{self._max_retries} retries. Falling back to json_mode."
        )
        try:
            return _call(self._fallback_chain)
        except Exception as fallback_exc:
            logger.error(f"[OpenRouter] json_mode fallback also failed: {fallback_exc}")
            raise last_err  # type: ignore[misc]

    # Forward any other attribute access (e.g. .stream, .batch) to the
    # underlying chain so callers that rely on other Runnable methods still work.
    def __getattr__(self, name: str) -> Any:
        return getattr(self._chain, name)


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
        # returning empty responses.  If json_mode itself is unsupported by the
        # current model, we reuse the primary chain (the fallback will raise
        # anyway, but at least it won't crash during setup).
        try:
            fallback_chain = super().with_structured_output(
                schema,
                method="json_mode",
                include_raw=include_raw,
            )
        except Exception:
            fallback_chain = primary_chain

        return _RetryStructuredChain(primary_chain, fallback_chain)


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


