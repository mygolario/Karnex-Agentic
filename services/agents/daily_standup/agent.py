"""Core implementation of the Daily Standup agent."""

import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from services.shared.config import settings
from services.shared.logger import logger
from services.shared.supabase_client import get_supabase_admin
from services.agents.daily_standup.schemas import DailyStandupInput, DailyStandupOutput
from services.agents.daily_standup.prompts import DAILY_STANDUP_SYSTEM_PROMPT
from services.agents.daily_standup.tools import (
    get_active_sprint_tasks,
    update_task_status_by_name,
    karnex_memory_write
)


def _log_agent_run_start(founder_id: str, input_data: DailyStandupInput) -> str:
    """Inserts an execution log row in agent_runs with status='running'.

    Returns the run ID.
    """
    run_id = str(uuid.uuid4())
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").insert({
            "id": run_id,
            "founder_id": founder_id,
            "agent_id": "daily-standup-v1",
            "agent_version": "v1.0.0",
            "status": "running",
            "input": input_data.model_dump(),
            "triggered_by": "user",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "llm_model": settings.GEMINI_MODEL_FLASH
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log agent run start to database: {str(e)}")
    return run_id


def _log_agent_run_success(run_id: str, founder_id: str, output: DailyStandupOutput, duration_ms: int):
    """Updates agent_runs with success state and inserts the output into agent_outputs."""
    try:
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc).isoformat()
        
        # Update run status
        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": now,
            "duration_ms": duration_ms
        }).eq("id", run_id).execute()

        # Insert output
        supabase.table("agent_outputs").insert({
            "agent_run_id": run_id,
            "founder_id": founder_id,
            "output_type": "standup_summary",
            "output": output.model_dump()
        }).execute()
        
    except Exception as e:
        logger.warning(f"Could not log agent run success to database: {str(e)}")


def _log_agent_run_failure(run_id: str, error_message: str, duration_ms: int):
    """Updates agent_runs with error state."""
    try:
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("agent_runs").update({
            "status": "error",
            "completed_at": now,
            "duration_ms": duration_ms,
            "error_message": error_message,
            "error_type": "agent_failure"
        }).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not log agent run failure to database: {str(e)}")


async def run_daily_standup(input_data: DailyStandupInput) -> DailyStandupOutput:
    """Executes the Daily Standup agent pipeline.

    Fetches current sprint tasks (if not provided), calls Gemini 2.5 Flash to summarize
    and analyze the check-in, matches completed/blocked tasks to database records, and updates them.
    It then recalculates the founder's momentum score.
    """
    founder_id = input_data.founder_id
    logger.info(f"Running daily-standup-v1 for founder={founder_id}")
    
    start_time = time.time()
    run_id = _log_agent_run_start(founder_id, input_data)
    
    try:
        # Step 1: Pre-populate tasks from active sprint if not provided
        yesterday_tasks = input_data.yesterday_tasks
        today_sprint_tasks = input_data.today_sprint_tasks
        
        if yesterday_tasks is None or today_sprint_tasks is None:
            db_tasks = get_active_sprint_tasks(founder_id)
            if db_tasks:
                # Group tasks by status or just provide all active ones
                all_titles = [t["title"] for t in db_tasks]
                if yesterday_tasks is None:
                    # In progress or todo tasks are what they should have worked on
                    yesterday_tasks = [t["title"] for t in db_tasks if t["status"] in ("in_progress", "todo")]
                if today_sprint_tasks is None:
                    # All unfinished tasks
                    today_sprint_tasks = [t["title"] for t in db_tasks if t["status"] != "done"]
            
            # Fallbacks if still empty
            if not yesterday_tasks:
                yesterday_tasks = ["No tasks currently scheduled"]
            if not today_sprint_tasks:
                today_sprint_tasks = ["No tasks currently scheduled"]

        # Step 2: Initialize Gemini Flash LLM with structured output
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL_FLASH,
            google_api_key=settings.GOOGLE_GEMINI_API_KEY,
            temperature=0.5
        )
        structured_llm = llm.with_structured_output(DailyStandupOutput)

        # Step 3: Setup prompt templates
        prompt = ChatPromptTemplate.from_messages([
            ("system", DAILY_STANDUP_SYSTEM_PROMPT),
            ("user", (
                "Here is the founder's daily check-in update:\n"
                "Founder Update: {founder_update}\n\n"
                "Context of tasks:\n"
                "Yesterday's planned tasks: {yesterday_tasks}\n"
                "Today's sprint tasks available: {today_sprint_tasks}\n\n"
                "Please analyze this update and produce the structured standup summary matching the schema."
            ))
        ])

        # Step 4: Execute chain
        chain = prompt | structured_llm
        output: DailyStandupOutput = chain.invoke({
            "founder_update": input_data.founder_update,
            "yesterday_tasks": ", ".join(yesterday_tasks),
            "today_sprint_tasks": ", ".join(today_sprint_tasks)
        })

        # Step 5: Post-execution task updates in the database
        summary = output.standup_summary
        
        # 5.1. Update completed tasks
        for task_name in summary.yesterday_completed:
            update_task_status_by_name(founder_id, task_name, "done")
            
        # 5.2. Update blocked tasks
        for idx, task_name in enumerate(summary.blockers_identified):
            reason = "Blocked during daily standup check-in"
            if summary.blocker_suggestions and idx < len(summary.blocker_suggestions):
                reason = f"Blocker suggestion: {summary.blocker_suggestions[idx]}"
            update_task_status_by_name(founder_id, task_name, "blocked", blocked_reason=reason)

        # Step 6: Recalculate Momentum Score
        try:
            from services.shared.momentum import update_founder_momentum_score
            await update_founder_momentum_score(founder_id)
        except Exception as me:
            logger.warning(f"Could not update momentum score: {str(me)}")

        # Step 7: Save output to Karnex Memory
        karnex_memory_write(
            founder_id=founder_id,
            namespace="daily-standup",
            key="latest_standup",
            value=output.model_dump(),
            tags=["standup", "accountability", "compass"]
        )

        # Log success and return
        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_success(run_id, founder_id, output, duration_ms)
        return output

    except Exception as e:
        logger.exception("Error executing Daily Standup agent")
        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_failure(run_id, str(e), duration_ms)
        raise e
