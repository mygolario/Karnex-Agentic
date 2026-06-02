import time
import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Dict, Any, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin
from agents.pain_transformer.tools import karnex_memory_write
from agents.sprint_planner.schemas import SprintPlannerInput, SprintPlannerOutput
from agents.sprint_planner.prompts import SPRINT_PLANNER_SYSTEM_PROMPT


def _log_agent_run_start(founder_id: str, input_data: SprintPlannerInput) -> str:
    """Inserts a run log in agent_runs table."""
    run_id = str(uuid.uuid4())
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").insert({
            "id": run_id,
            "founder_id": founder_id,
            "agent_id": "sprint-planner-v1",
            "agent_version": "v1.0.0",
            "status": "running",
            "input": input_data.model_dump(),
            "triggered_by": "user",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "llm_model": settings.GEMINI_MODEL_FLASH
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log sprint planner run start: {e}")
    return run_id


def _log_agent_run_success(run_id: str, founder_id: str, output: SprintPlannerOutput, duration_ms: int):
    """Updates agent_runs table on success."""
    try:
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc).isoformat()
        
        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": now,
            "duration_ms": duration_ms
        }).eq("id", run_id).execute()

        supabase.table("agent_outputs").insert({
            "agent_run_id": run_id,
            "founder_id": founder_id,
            "output_type": "weekly_sprint_plan",
            "output": output.model_dump()
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log sprint planner success: {e}")


def _log_agent_run_failure(run_id: str, error_message: str, duration_ms: int):
    """Updates agent_runs table on error."""
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
        logger.warning(f"Could not log sprint planner failure: {e}")


def run_sprint_planner(input_data: SprintPlannerInput) -> SprintPlannerOutput:
    """Executes the Sprint Planner agent pipeline:
    
    1. Loads current roadmap phase details.
    2. Runs Gemini to format exactly 7 tasks fitting the founder's capacity.
    3. Saves the sprint and tasks into the Supabase database.
    """
    founder_id = input_data.founder_id
    logger.info(f"Running sprint-planner-v1 for founder={founder_id}")
    
    start_time = time.time()
    run_id = _log_agent_run_start(founder_id, input_data)
    
    try:
        # Step 1: Trigger Gemini model
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_FLASH,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS,
            default_headers={
                "HTTP-Referer": "https://karnex.ai",
                "X-Title": "Karnex"
            },
            temperature=0.4
        )
        structured_llm = llm.with_structured_output(SprintPlannerOutput)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", SPRINT_PLANNER_SYSTEM_PROMPT),
            ("user", (
                "Roadmap Phase: {phase}\n"
                "Planning Week: Week {week_number}\n"
                "Founder Capacity: {capacity} hours\n"
                "Active Blockers: {blockers}\n"
                "Completed last week: {completed}\n"
                "Deferred rollover tasks: {deferred}"
            ))
        ])
        
        chain = prompt | structured_llm
        output: SprintPlannerOutput = chain.invoke({
            "phase": str(input_data.roadmap_phase.model_dump()),
            "week_number": input_data.week_number,
            "capacity": input_data.founder_capacity_this_week,
            "blockers": ", ".join(input_data.blockers or ["None"]),
            "completed": ", ".join(input_data.completed_last_week or ["None"]),
            "deferred": ", ".join(input_data.deferred_tasks or ["None"])
        })

        # Step 2: Sync to Database (insert sprint and task records)
        try:
            supabase = get_supabase_admin()
            
            # Fetch active roadmap ID
            roadmap_res = supabase.table("roadmaps").select("id").eq("founder_id", founder_id).eq("is_active", True).maybe_single().execute()
            if roadmap_res and roadmap_res.data:
                roadmap_id = roadmap_res.data.get("id")
                
                # Determine dates
                today = date.today()
                start_offset = (input_data.week_number - 1) * 7
                week_start = today + timedelta(days=start_offset)
                week_end = week_start + timedelta(days=6)
                
                # Upsert sprint record
                sprint_payload = {
                    "roadmap_id": roadmap_id,
                    "founder_id": founder_id,
                    "sprint_number": input_data.week_number,
                    "title": output.sprint.title,
                    "week_start": week_start.isoformat(),
                    "week_end": week_end.isoformat(),
                    "goals": [t.title for t in output.sprint.tasks[:3]],
                    "focus_area": output.sprint.focus_area,
                    "capacity_hours": output.sprint.total_estimated_hours,
                    "status": "active"
                }
                
                # Check if sprint exists
                existing_sprint = supabase.table("sprints").select("id").eq("roadmap_id", roadmap_id).eq("sprint_number", input_data.week_number).maybe_single().execute()
                
                if existing_sprint and existing_sprint.data:
                    sprint_id = existing_sprint.data["id"]
                    supabase.table("sprints").update(sprint_payload).eq("id", sprint_id).execute()
                    # Delete existing tasks for this sprint to avoid duplicates
                    supabase.table("tasks").delete().eq("sprint_id", sprint_id).execute()
                else:
                    sprint_res = supabase.table("sprints").insert(sprint_payload).execute()
                    sprint_id = sprint_res.data[0]["id"]
                    
                # Insert task records
                tasks_payloads = []
                for t in output.sprint.tasks:
                    tasks_payloads.append({
                        "sprint_id": sprint_id,
                        "founder_id": founder_id,
                        "title": t.title,
                        "description": t.description,
                        "status": "todo",
                        "priority": t.priority,
                        "estimated_hours": t.estimated_hours,
                        "category": t.category,
                        "definition_of_done": t.definition_of_done,
                        "agent_id": t.can_delegate_to_agent
                    })
                    
                if tasks_payloads:
                    supabase.table("tasks").insert(tasks_payloads).execute()
                    
        except Exception as db_err:
            logger.warning(f"Failed to sync sprint plan to database tables: {db_err}")

        # Step 3: Write to memory cache
        karnex_memory_write(
            founder_id=founder_id,
            namespace="sprint_planner",
            key=f"sprint_{input_data.week_number}",
            value=output.model_dump(),
            tags=["sprint-plan", "tasks", "roadmap-weekly"]
        )

        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_success(run_id, founder_id, output, duration_ms)
        return output

    except Exception as e:
        logger.exception("Error executing Sprint Planner agent")
        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_failure(run_id, str(e), duration_ms)
        raise e
