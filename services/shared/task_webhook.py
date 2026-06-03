"""Notify Next.js when a task-linked agent run finishes."""

from typing import Any, Dict, Optional

import httpx

from shared.config import settings
from shared.logger import logger


async def notify_task_complete(
    task_id: Optional[str],
    run_id: str,
    status: str,
    agent_output: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> None:
    if not task_id:
        return

    secret = settings.KARNEX_INTERNAL_WEBHOOK_SECRET or ""
    base_url = (
        settings.NEXT_PUBLIC_APP_URL
        or settings.KARNEX_APP_URL
        or "http://localhost:3000"
    )
    if not secret:
        logger.warning(
            "KARNEX_INTERNAL_WEBHOOK_SECRET not set; skipping task complete webhook"
        )
        return

    url = f"{base_url.rstrip('/')}/api/tasks/{task_id}/complete"
    payload: Dict[str, Any] = {
        "run_id": run_id,
        "status": status,
    }
    if agent_output is not None:
        payload["agent_output"] = agent_output
    if error_message:
        payload["error_message"] = error_message

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {secret}"},
            )
            if res.status_code >= 400:
                logger.warning(
                    f"Task complete webhook failed task={task_id} status={res.status_code} body={res.text}"
                )
    except Exception as e:
        logger.warning(f"Task complete webhook error for task={task_id}: {e}")
