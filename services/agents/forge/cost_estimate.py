"""Rough OpenRouter cost estimate before long Forge runs."""

from __future__ import annotations

from agents.builder.schemas import BuilderInput
from agents.forge.catalog import get_model_by_id, load_catalog


def estimate_forge_run_cost(input_data: BuilderInput) -> dict:
    """Return USD estimate range and token budget hint (not billing-accurate)."""
    spec_len = len(input_data.specification or "")
    mode = getattr(input_data, "mode", "auto") or "auto"
    max_mode = bool(getattr(input_data, "max_mode", False))
    autonomy = getattr(input_data, "autonomy", "founder") or "founder"

    base_tokens = 8000
    if max_mode:
        base_tokens = 24000
    if mode == "build" or mode == "auto":
        base_tokens += min(spec_len * 8, 32000)
    if autonomy == "developer":
        base_tokens += 4000

    catalog = load_catalog()
    model_id = getattr(input_data, "model_id", None) or catalog.get("default_model_id")
    entry = get_model_by_id(model_id) if model_id else None
    tier = (entry or {}).get("tier", "Medium")

    rate_per_1m = {"Low": 0.15, "Medium": 0.35, "High": 0.6, "Fast": 0.2, "Thinking": 0.9}.get(tier, 0.35)
    usd_low = round((base_tokens / 1_000_000) * rate_per_1m * 0.7, 3)
    usd_high = round((base_tokens / 1_000_000) * rate_per_1m * 1.4, 3)

    return {
        "estimated_tokens": base_tokens,
        "usd_range": [usd_low, max(usd_high, usd_low + 0.01)],
        "tier": tier,
        "model_id": model_id,
        "disclaimer": "Estimate only; actual OpenRouter usage may vary.",
    }
