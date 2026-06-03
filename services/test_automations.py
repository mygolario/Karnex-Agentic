"""Tests for automation condition evaluation (Momentum Alert)."""

import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(__file__))

from cron.automations import (
    evaluate_momentum_alert,
    is_recipe_enabled,
    parse_automation_rules,
)


def test_parse_automation_rules():
    rules = parse_automation_rules(
        [{"recipe_id": "momentum_alert", "enabled": True}]
    )
    assert len(rules) == 1
    assert rules[0]["recipe_id"] == "momentum_alert"


def test_is_recipe_enabled():
    rules = [{"recipe_id": "momentum_alert", "enabled": True}]
    assert is_recipe_enabled(rules, "momentum_alert") is True
    assert is_recipe_enabled(rules, "morning_brief") is False


def test_momentum_alert_not_fired_first_day():
    supabase = MagicMock()
    meta: dict = {}
    result = evaluate_momentum_alert(supabase, "founder-1", 35, meta)
    assert result is False
    supabase.table.assert_called()


def test_momentum_alert_fired_after_two_days():
    supabase = MagicMock()
    two_days_ago = (datetime.now(timezone.utc).date() - timedelta(days=2)).isoformat()
    meta = {"momentum_low_since": two_days_ago}
    result = evaluate_momentum_alert(supabase, "founder-1", 35, meta)
    assert result is True


def test_momentum_alert_resets_when_score_recovers():
    supabase = MagicMock()
    meta = {"momentum_low_since": "2020-01-01"}
    result = evaluate_momentum_alert(supabase, "founder-1", 55, meta)
    assert result is False


@patch("cron.automations.httpx.post")
def test_trigger_recipe_mock(mock_post):
    from cron.automations import trigger_recipe
    from shared.config import settings

    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"ok": True})
    original = settings.KARNEX_INTERNAL_WEBHOOK_SECRET
    settings.KARNEX_INTERNAL_WEBHOOK_SECRET = "test-secret"
    try:
        ok = trigger_recipe("uid", "momentum_alert", "test")
        assert ok is True
        mock_post.assert_called_once()
        body = mock_post.call_args.kwargs["json"]
        assert body["recipe_id"] == "momentum_alert"
    finally:
        settings.KARNEX_INTERNAL_WEBHOOK_SECRET = original


if __name__ == "__main__":
    test_parse_automation_rules()
    test_is_recipe_enabled()
    test_momentum_alert_not_fired_first_day()
    test_momentum_alert_fired_after_two_days()
    test_momentum_alert_resets_when_score_recovers()
    test_trigger_recipe_mock()
    print("All automation tests passed.")
