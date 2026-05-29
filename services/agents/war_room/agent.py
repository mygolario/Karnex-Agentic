"""Core implementation of the 90-Day War Room agent."""

import time
import uuid
from datetime import datetime, timezone, date
from typing import Dict, Any, Optional

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from services.shared.config import settings
from services.shared.logger import logger
from services.shared.supabase_client import get_supabase_admin
from services.agents.war_room.schemas import WarRoomInput, WarRoomOutput
from services.agents.war_room.prompts import WAR_ROOM_SYSTEM_PROMPT
from services.agents.war_room.tools import karnex_memory_write


def _log_agent_run_start(founder_id: str, input_data: WarRoomInput) -> str:
    """Inserts an execution log row in agent_runs with status='running'.

    Returns the run ID.
    """
    run_id = str(uuid.uuid4())
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").insert({
            "id": run_id,
            "founder_id": founder_id,
            "agent_id": "war-room-v1",
            "agent_version": "v1.0.0",
            "status": "running",
            "input": input_data.model_dump(),
            "triggered_by": "user",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "llm_model": settings.GEMINI_MODEL
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log agent run start to database: {str(e)}")
    return run_id


def _log_agent_run_success(run_id: str, founder_id: str, output: WarRoomOutput, duration_ms: int):
    """Updates agent_runs with success state and inserts output into agent_outputs."""
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
            "output_type": "90_day_roadmap",
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


def run_war_room(input_data: WarRoomInput) -> WarRoomOutput:
    """Executes the 90-Day War Room agent.

    Generates a structured 90-day roadmap tailored to the founder's constraints,
    saving the roadmap to the Supabase database (and local fallback cache).
    """
    founder_id = input_data.founder_id
    logger.info(f"Running war-room-v1 for founder={founder_id}")
    
    start_time = time.time()
    run_id = _log_agent_run_start(founder_id, input_data)
    
    try:
        # Step 1: Initialize OpenRouter LLM with structured output mapping to our schema
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            default_headers={
                "HTTP-Referer": "https://karnex.ai",
                "X-Title": "Karnex"
            },
            temperature=0.5
        )
        structured_llm = llm.with_structured_output(WarRoomOutput)

        # Step 2: Setup prompt templates
        prompt = ChatPromptTemplate.from_messages([
            ("system", WAR_ROOM_SYSTEM_PROMPT),
            ("user", (
                "Here is the product brief candidate:\n"
                "{product_brief}\n\n"
                "Here is the Ideal Customer Profile (ICP) analysis:\n"
                "{icp_document}\n\n"
                "Founder Constraints:\n"
                "- Weekly hours available: {weekly_hours} hours\n"
                "- Technical level: {technical_level}\n"
                "- Monthly budget: ${budget_monthly} USD\n\n"
                "Start date: {start_date}\n\n"
                "Please construct a tailored 90-day roadmap in JSON format matching the schema."
            ))
        ])

        # Resolve start date
        start_date_str = input_data.start_date or date.today().isoformat()

        # Step 3: Execute chain
        chain = prompt | structured_llm
        output: WarRoomOutput = chain.invoke({
            "product_brief": str(input_data.product_brief),
            "icp_document": str(input_data.icp_document),
            "weekly_hours": input_data.founder_capacity.weekly_hours,
            "technical_level": input_data.founder_capacity.technical_level,
            "budget_monthly": input_data.founder_capacity.budget_monthly,
            "start_date": start_date_str
        })

        # Step 4: Write memory cache
        karnex_memory_write(
            founder_id=founder_id,
            namespace="war-room",
            key="latest_roadmap",
            value=output.model_dump(),
            tags=["roadmap", "planning", "strategy"]
        )

        # Step 5: Save roadmap to database table
        try:
            supabase = get_supabase_admin()
            
            # Fetch active startup ID for referential integrity
            founder_res = supabase.table("founders").select("current_startup_id").eq("id", founder_id).maybe_single().execute()
            startup_id = None
            if founder_res and founder_res.data:
                startup_id = founder_res.data.get("current_startup_id")
                
            if not startup_id:
                # Fallback check
                startup_res = supabase.table("startups").select("id").eq("founder_id", founder_id).eq("is_active", True).maybe_single().execute()
                if startup_res and startup_res.data:
                    startup_id = startup_res.data.get("id")
                else:
                    # Create default startup to preserve database structure constraints
                    startup_id = str(uuid.uuid4())
                    name = input_data.product_brief.get("selected_name") or input_data.product_brief.get("title") or "My Startup"
                    supabase.table("startups").insert({
                        "id": startup_id,
                        "founder_id": founder_id,
                        "name": name,
                        "tagline": input_data.product_brief.get("tagline", "AI co-founded solo startup"),
                        "description": input_data.product_brief.get("elevator_pitch", "Created by Karnex co-founder"),
                        "is_active": True
                    }).execute()
                    # Link to founder
                    supabase.table("founders").update({"current_startup_id": startup_id}).eq("id", founder_id).execute()

            # Insert roadmap record
            supabase.table("roadmaps").insert({
                "startup_id": startup_id,
                "founder_id": founder_id,
                "title": output.roadmap.title,
                "phases": [p.model_dump() for p in output.roadmap.phases],
                "current_phase": "phase_1",
                "founder_capacity_hours": input_data.founder_capacity.weekly_hours,
                "technical_level": input_data.founder_capacity.technical_level,
                "budget_monthly": input_data.founder_capacity.budget_monthly,
                "start_date": start_date_str,
                "generated_by": "war-room-v1",
                "agent_run_id": run_id,
                "is_active": True
            }).execute()

        except Exception as db_err:
            logger.warning(f"Could not persist roadmap record to roadmaps table: {str(db_err)}")

        # Log success and return
        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_success(run_id, founder_id, output, duration_ms)
        return output

    except Exception as e:
        logger.exception("Error executing 90-Day War Room agent")
        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_failure(run_id, str(e), duration_ms)
        raise e
