"""Load and query the Forge OpenRouter model catalog."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional

_CATALOG_PATH = Path(__file__).resolve().parent / "models.catalog.json"


@lru_cache(maxsize=1)
def load_catalog() -> dict[str, Any]:
    with open(_CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def list_catalog_models() -> List[dict[str, Any]]:
    catalog = load_catalog()
    return list(catalog.get("models") or [])


def get_model_by_id(model_id: str) -> Optional[dict[str, Any]]:
    for entry in list_catalog_models():
        if entry.get("id") == model_id:
            return entry
    return None


def resolve_llm_model_label(
    model_id: Optional[str] = None,
    *,
    auto_model: bool = False,
    max_mode: bool = False,
) -> str:
    """Label stored on agent_runs.llm_model for observability."""
    if auto_model:
        suffix = "+max" if max_mode else ""
        return f"forge:auto{suffix}"
    catalog = load_catalog()
    entry = get_model_by_id(model_id) if model_id else None
    if entry:
        return entry["id"]
    return catalog.get("default_model_id", "karnex-forge-fast-high")


def format_display_label(entry: dict[str, Any]) -> str:
    tier = entry.get("tier")
    name = entry.get("display_name", entry.get("id", "Model"))
    if tier:
        return f"{name} ({tier})"
    return name
