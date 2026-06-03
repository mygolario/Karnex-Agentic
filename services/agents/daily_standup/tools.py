"""Database helper tools for the Daily Standup agent."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from shared.logger import logger
from shared.supabase_client import get_supabase_admin


def get_active_sprint_tasks(founder_id: str) -> List[Dict[str, Any]]:
    """Fetches tasks for the founder's currently active sprint.

    Args:
        founder_id: Unique ID of the founder.

    Returns:
        List[Dict[str, Any]]: List of task records.
    """
    try:
        supabase = get_supabase_admin()
        # Find active sprint
        sprint_res = (
            supabase.table("sprints")
            .select("id")
            .eq("founder_id", founder_id)
            .eq("status", "active")
            .execute()
        )
        if not sprint_res.data:
            logger.info(f"No active sprint found for founder: {founder_id}")
            return []

        sprint_id = sprint_res.data[0]["id"]
        # Find tasks in that sprint
        tasks_res = (
            supabase.table("tasks")
            .select("*")
            .eq("sprint_id", sprint_id)
            .execute()
        )
        return tasks_res.data or []
    except Exception as e:
        logger.warning(f"Failed to fetch active sprint tasks: {e}")
        return []


def update_task_status_by_name(
    founder_id: str, task_name: str, status: str, blocked_reason: Optional[str] = None
) -> bool:
    """Matches a task name to an active sprint task and updates its status in Supabase.

    Args:
        founder_id: Unique ID of the founder.
        task_name: The name/title of the task.
        status: The target status ('todo', 'in_progress', 'done', 'blocked', 'deferred').
        blocked_reason: Optional reason if status is 'blocked'.

    Returns:
        bool: True if task was updated, False otherwise.
    """
    try:
        supabase = get_supabase_admin()
        tasks = get_active_sprint_tasks(founder_id)
        if not tasks:
            return False

        # Try to find a match by title (case-insensitive)
        best_match = None
        task_name_clean = task_name.lower().strip()

        # 1. Exact match
        for t in tasks:
            if t["title"].lower().strip() == task_name_clean:
                best_match = t
                break

        # 2. Substring match
        if not best_match:
            for t in tasks:
                t_title_clean = t["title"].lower().strip()
                if t_title_clean in task_name_clean or task_name_clean in t_title_clean:
                    best_match = t
                    break

        if best_match:
            payload = {"status": status}
            if status == "done":
                payload["completed_at"] = datetime.now(timezone.utc).isoformat()
            else:
                payload["completed_at"] = None

            if status == "blocked" and blocked_reason:
                payload["blocked_reason"] = blocked_reason
            else:
                payload["blocked_reason"] = None

            supabase.table("tasks").update(payload).eq("id", best_match["id"]).execute()
            logger.info(f"Updated task '{best_match['title']}' (id: {best_match['id']}) to '{status}' for founder {founder_id}")
            return True

        logger.info(f"Could not find matching task for '{task_name}' in active sprint tasks.")
        return False
    except Exception as e:
        logger.warning(f"Failed to update task status by name: {e}")
        return False
