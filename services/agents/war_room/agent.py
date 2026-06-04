"""Core implementation of the 90-Day War Room agent."""

import time
import uuid
from datetime import date

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.war_room.prompts import WAR_ROOM_SYSTEM_PROMPT
from agents.war_room.schemas import WarRoomInput, WarRoomLLMOutput, WarRoomOutput
from agents.war_room.tools import karnex_memory_write
from shared.agent_run_logging import (
    advance_step,
    complete_agent_run,
    fail_agent_run,
    start_agent_run,
)
from shared.agent_step_catalog import get_step_labels
from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin

AGENT_ID = "war-room-v1"


def run_war_room(input_data: WarRoomInput) -> WarRoomOutput:
    """Executes the 90-Day War Room agent."""
    founder_id = input_data.founder_id
    logger.info(f"Running {AGENT_ID} for founder={founder_id}")

    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(
        AGENT_ID,
        founder_id,
        input_data.model_dump(),
        llm_model=settings.GEMINI_MODEL_31_PRO,
    )

    try:
        advance_step(run_id, 0, steps[0], tool_name="karnex_memory_read")

        advance_step(run_id, 1, steps[1], tool_name="llm_roadmap")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_31_PRO,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_WAR_ROOM,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.5,
        )
        structured_llm = llm.with_structured_output(WarRoomLLMOutput)

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
            )),
        ])

        start_date_str = input_data.start_date or date.today().isoformat()
        chain = prompt | structured_llm
        raw: WarRoomLLMOutput = chain.invoke({
            "product_brief": str(input_data.product_brief),
            "icp_document": str(input_data.icp_document),
            "weekly_hours": input_data.founder_capacity.weekly_hours,
            "technical_level": input_data.founder_capacity.technical_level,
            "budget_monthly": input_data.founder_capacity.budget_monthly,
            "start_date": start_date_str,
        })

        advance_step(run_id, 2, steps[2], tool_name="karnex_memory_write")
        hours = input_data.founder_capacity.weekly_hours
        output = WarRoomOutput(
            roadmap=raw.roadmap,
            step_labels=steps,
            context_summary=(
                f"I built your 90-day roadmap in 3 phases, capped at about {hours} hours per week."
            ),
            confidence="medium",
            suggested_next_agent="sprint-planner-v1",
            pre_populated=input_data.pre_populated,
        )

        karnex_memory_write(
            founder_id=founder_id,
            namespace="war-room",
            key="latest_roadmap",
            value=output.model_dump(),
            tags=["roadmap", "planning", "strategy"],
        )

        try:
            supabase = get_supabase_admin()
            founder_res = (
                supabase.table("founders")
                .select("current_startup_id")
                .eq("id", founder_id)
                .maybe_single()
                .execute()
            )
            startup_id = founder_res.data.get("current_startup_id") if founder_res and founder_res.data else None

            if not startup_id:
                startup_res = (
                    supabase.table("startups")
                    .select("id")
                    .eq("founder_id", founder_id)
                    .eq("is_active", True)
                    .maybe_single()
                    .execute()
                )
                if startup_res and startup_res.data:
                    startup_id = startup_res.data.get("id")
                else:
                    startup_id = str(uuid.uuid4())
                    name = (
                        input_data.product_brief.get("selected_name")
                        or input_data.product_brief.get("title")
                        or "My Startup"
                    )
                    supabase.table("startups").insert({
                        "id": startup_id,
                        "founder_id": founder_id,
                        "name": name,
                        "tagline": input_data.product_brief.get("tagline", "AI co-founded solo startup"),
                        "description": input_data.product_brief.get(
                            "elevator_pitch", "Created by Karnex co-founder"
                        ),
                        "is_active": True,
                    }).execute()
                    supabase.table("founders").update({"current_startup_id": startup_id}).eq(
                        "id", founder_id
                    ).execute()

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
                "generated_by": AGENT_ID,
                "agent_run_id": run_id,
                "is_active": True,
            }).execute()
        except Exception as db_err:
            logger.warning(f"Could not persist roadmap record: {db_err}")

        duration_ms = int((time.time() - start_time) * 1000)
        complete_agent_run(run_id, founder_id, output, "90_day_roadmap", duration_ms=duration_ms)
        return output

    except Exception as e:
        logger.exception("Error executing 90-Day War Room agent")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
