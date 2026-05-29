"""Deterministic momentum score calculator."""

from datetime import datetime, timezone, timedelta
from services.shared.logger import logger
from services.shared.supabase_client import get_supabase_admin


async def calculate_momentum_score(founder_id: str) -> int:
    """Calculates a deterministic 0-100 Momentum Score for a founder.

    The score is divided into 4 buckets, each worth up to 25 points:
    1. Task Completion (0-25 pts): Based on tasks completed in the last 7 days.
    2. Consistency (0-25 pts): Based on standup check-ins in the last 7 days.
    3. Agent Utilization (0-25 pts): Based on distinct AI agents run in the last 7 days.
    4. Progress (0-25 pts): Based on completed milestones and active sprint progress.
    """
    logger.info(f"Calculating momentum score for founder: {founder_id}")
    
    supabase = get_supabase_admin()
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    # --- Bucket 1: Task Completion (0-25 pts) ---
    # Tasks completed in the last 7 days
    task_pts = 0
    try:
        tasks_res = (
            supabase.table("tasks")
            .select("id")
            .eq("founder_id", founder_id)
            .eq("status", "done")
            .gte("completed_at", seven_days_ago)
            .execute()
        )
        completed_count = len(tasks_res.data) if tasks_res.data else 0
        task_pts = min(25, completed_count * 5)  # 5 tasks = 25 pts
    except Exception as e:
        logger.warning(f"Failed to calculate task completion points: {e}")

    # --- Bucket 2: Consistency (0-25 pts) ---
    # Standup check-ins in the last 7 days
    consistency_pts = 0
    try:
        standups_res = (
            supabase.table("agent_runs")
            .select("started_at")
            .eq("founder_id", founder_id)
            .eq("agent_id", "daily-standup-v1")
            .eq("status", "success")
            .gte("started_at", seven_days_ago)
            .execute()
        )
        if standups_res.data:
            # Count unique days of check-ins
            unique_days = set()
            for run in standups_res.data:
                # Parse date string to extract the day part
                try:
                    dt = datetime.fromisoformat(run["started_at"].replace("Z", "+00:00"))
                    unique_days.add(dt.date())
                except ValueError:
                    pass
            consistency_pts = min(25, len(unique_days) * 5)  # 5 distinct days = 25 pts
    except Exception as e:
        logger.warning(f"Failed to calculate consistency points: {e}")

    # --- Bucket 3: Agent Utilization (0-25 pts) ---
    # Distinct agents run successfully in the last 7 days
    agent_pts = 0
    try:
        agents_res = (
            supabase.table("agent_runs")
            .select("agent_id")
            .eq("founder_id", founder_id)
            .eq("status", "success")
            .gte("started_at", seven_days_ago)
            .execute()
        )
        if agents_res.data:
            distinct_agents = {run["agent_id"] for run in agents_res.data}
            count = len(distinct_agents)
            if count >= 3:
                agent_pts = 25
            elif count == 2:
                agent_pts = 18
            elif count == 1:
                agent_pts = 10
    except Exception as e:
        logger.warning(f"Failed to calculate agent utilization points: {e}")

    # --- Bucket 4: Progress (0-25 pts) ---
    # Completed milestones & active sprint progress
    progress_pts = 0
    try:
        # 1. Check completed milestones
        milestones_res = (
            supabase.table("milestones")
            .select("id")
            .eq("founder_id", founder_id)
            .eq("status", "completed")
            .execute()
        )
        completed_milestones = len(milestones_res.data) if milestones_res.data else 0
        
        if completed_milestones >= 2:
            progress_pts = 25
        elif completed_milestones == 1:
            progress_pts = 15
        else:
            # Fallback to current active sprint progress percentage
            sprints_res = (
                supabase.table("sprints")
                .select("id")
                .eq("founder_id", founder_id)
                .eq("status", "active")
                .execute()
            )
            if sprints_res.data:
                sprint_id = sprints_res.data[0]["id"]
                sprint_tasks = (
                    supabase.table("tasks")
                    .select("status")
                    .eq("sprint_id", sprint_id)
                    .execute()
                )
                if sprint_tasks.data:
                    total_tasks = len(sprint_tasks.data)
                    done_tasks = sum(1 for t in sprint_tasks.data if t["status"] == "done")
                    ratio = done_tasks / total_tasks
                    progress_pts = int(ratio * 15)  # Max 15 pts for task completion ratio
    except Exception as e:
        logger.warning(f"Failed to calculate progress points: {e}")

    total_score = task_pts + consistency_pts + agent_pts + progress_pts
    logger.info(f"Momentum components: task={task_pts}, consistency={consistency_pts}, agent={agent_pts}, progress={progress_pts}. Total={total_score}")
    return max(0, min(100, total_score))


async def update_founder_momentum_score(founder_id: str) -> int:
    """Calculates and updates the founder's momentum_score in the database.

    Returns the updated score.
    """
    try:
        score = await calculate_momentum_score(founder_id)
        supabase = get_supabase_admin()
        supabase.table("founders").update({"momentum_score": score}).eq("id", founder_id).execute()
        logger.info(f"Updated momentum score to {score} for founder {founder_id}")
        return score
    except Exception as e:
        logger.warning(f"Failed to update founder momentum score in DB: {e}")
        return 50  # Fallback to default
