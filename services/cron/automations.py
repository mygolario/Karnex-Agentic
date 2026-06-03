"""Automation recipe scheduler — runs every 15 minutes on Railway.

Evaluates schedule/condition recipes and POSTs to Next.js /api/automations/trigger.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


def _app_base_url() -> str:
    return (
        settings.NEXT_PUBLIC_APP_URL
        or settings.KARNEX_APP_URL
        or "http://localhost:3000"
    ).rstrip("/")


def _internal_headers() -> Dict[str, str]:
    secret = settings.KARNEX_INTERNAL_WEBHOOK_SECRET or ""
    return {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }


def trigger_recipe(
    founder_id: str,
    recipe_id: str,
    trigger_event: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    if not settings.KARNEX_INTERNAL_WEBHOOK_SECRET:
        logger.warning("KARNEX_INTERNAL_WEBHOOK_SECRET not set; skipping trigger")
        return False

    url = f"{_app_base_url()}/api/automations/trigger"
    payload = {
        "founder_id": founder_id,
        "recipe_id": recipe_id,
        "trigger_event": trigger_event,
        "metadata": metadata or {},
    }
    try:
        res = httpx.post(url, headers=_internal_headers(), json=payload, timeout=60.0)
        if res.status_code >= 400:
            logger.warning(
                "Automation trigger %s for %s returned %s: %s",
                recipe_id,
                founder_id,
                res.status_code,
                res.text,
            )
            return False
        body = res.json()
        return bool(body.get("ok"))
    except Exception as e:
        logger.exception("Failed to trigger %s: %s", recipe_id, e)
        return False


def parse_automation_rules(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    return [r for r in raw if isinstance(r, dict) and r.get("recipe_id")]


def is_recipe_enabled(rules: List[Dict[str, Any]], recipe_id: str) -> bool:
    for r in rules:
        if r.get("recipe_id") == recipe_id:
            return bool(r.get("enabled"))
    return False


def _local_now(tz_name: str) -> datetime:
    try:
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(ZoneInfo("America/New_York"))


def _in_schedule_window(local: datetime, hour: int, minute: int, days: List[str]) -> bool:
    day_key = local.strftime("%a").lower()[:3]
    day_map = {
        "mon": "mon",
        "tue": "tue",
        "wed": "wed",
        "thu": "thu",
        "fri": "fri",
        "sat": "sat",
        "sun": "sun",
    }
    current = day_map.get(day_key, day_key)
    if days and current not in [d[:3] for d in days]:
        return False
    return local.hour == hour and local.minute < 15


def evaluate_momentum_alert(
    supabase, founder_id: str, momentum_score: int, metadata: Dict[str, Any]
) -> bool:
    """Return True if we should fire momentum_alert (score < 40 for 2+ days)."""
    today = datetime.now(timezone.utc).date().isoformat()
    meta = dict(metadata or {})
    low_since = meta.get("momentum_low_since")

    if momentum_score < 40:
        if not low_since:
            meta["momentum_low_since"] = today
            supabase.table("integrations").update({"metadata": meta}).eq(
                "founder_id", founder_id
            ).eq("provider", "karnex_hub").execute()
            return False
        try:
            since_date = datetime.fromisoformat(str(low_since)).date()
        except ValueError:
            since_date = datetime.now(timezone.utc).date()
        if (datetime.now(timezone.utc).date() - since_date).days >= 2:
            return True
        return False

    if low_since:
        meta.pop("momentum_low_since", None)
        supabase.table("integrations").update({"metadata": meta}).eq(
            "founder_id", founder_id
        ).eq("provider", "karnex_hub").execute()
    return False


def run_automation_cron() -> None:
    logger.info("Starting automation cron check...")
    if not settings.KARNEX_INTERNAL_WEBHOOK_SECRET:
        logger.error("KARNEX_INTERNAL_WEBHOOK_SECRET required for automation cron")
        return

    try:
        supabase = get_supabase_admin()
    except Exception as e:
        logger.error("Supabase connection failed: %s", e)
        return

    hubs = (
        supabase.table("integrations")
        .select("founder_id, automation_rules, metadata")
        .eq("provider", "karnex_hub")
        .eq("status", "active")
        .execute()
    )

    catalog_res = (
        supabase.table("automation_recipe_catalog")
        .select("id, trigger_type, trigger_config")
        .execute()
    )
    catalog = {r["id"]: r for r in (catalog_res.data or [])}

    for hub in hubs.data or []:
        founder_id = hub["founder_id"]
        rules = parse_automation_rules(hub.get("automation_rules"))
        hub_meta = hub.get("metadata") or {}

        founder_res = (
            supabase.table("founders")
            .select("momentum_score, timezone")
            .eq("id", founder_id)
            .maybe_single()
            .execute()
        )
        founder = founder_res.data or {}
        tz = founder.get("timezone") or "America/New_York"
        local = _local_now(tz)
        momentum = int(founder.get("momentum_score") or 50)

        if is_recipe_enabled(rules, "morning_brief"):
            cfg = (catalog.get("morning_brief") or {}).get("trigger_config") or {}
            if _in_schedule_window(
                local,
                int(cfg.get("hour", 8)),
                int(cfg.get("minute", 0)),
                cfg.get("days") or [],
            ):
                trigger_recipe(founder_id, "morning_brief", "schedule:morning_brief")

        if is_recipe_enabled(rules, "weekly_debrief_auto"):
            cfg = (catalog.get("weekly_debrief_auto") or {}).get("trigger_config") or {}
            if _in_schedule_window(
                local,
                int(cfg.get("hour", 17)),
                int(cfg.get("minute", 0)),
                cfg.get("days") or ["fri"],
            ):
                trigger_recipe(
                    founder_id,
                    "weekly_debrief_auto",
                    "schedule:weekly_debrief",
                )

        if is_recipe_enabled(rules, "momentum_alert"):
            if evaluate_momentum_alert(supabase, founder_id, momentum, hub_meta):
                fired = trigger_recipe(
                    founder_id,
                    "momentum_alert",
                    "condition:momentum_low",
                    {"momentum_score": momentum},
                )
                if fired:
                    meta = dict(hub_meta)
                    meta.pop("momentum_low_since", None)
                    supabase.table("integrations").update({"metadata": meta}).eq(
                        "founder_id", founder_id
                    ).eq("provider", "karnex_hub").execute()

    logger.info("Automation cron check complete.")


if __name__ == "__main__":
    run_automation_cron()
