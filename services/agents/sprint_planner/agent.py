import time
from datetime import date, timedelta
from typing import Any, Dict

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.pain_transformer.tools import karnex_memory_write
from agents.sprint_planner.prompts import SPRINT_PLANNER_SYSTEM_PROMPT
from agents.sprint_planner.schemas import (
    SprintPlannerInput,
    SprintPlannerLLMOutput,
    SprintPlannerOutput,
)
from agents.sprint_planner.task_config import (
    enrich_sprint_task,
    enrich_sprint_tasks,
    load_founder_context,
)
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

AGENT_ID = "sprint-planner-v1"


def run_sprint_planner(input_data: SprintPlannerInput) -> SprintPlannerOutput:
    """Executes the Sprint Planner agent pipeline."""
    founder_id = input_data.founder_id
    logger.info(f"Running {AGENT_ID} for founder={founder_id}")

    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(
        AGENT_ID,
        founder_id,
        input_data.model_dump(),
        llm_model=settings.GEMINI_MODEL_FLASH_LITE,
    )

    try:
        advance_step(run_id, 0, steps[0], tool_name="load_context")

        advance_step(run_id, 1, steps[1], tool_name="llm_sprint")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_FLASH_LITE,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_FLASH,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.4,
        )
        structured_llm = llm.with_structured_output(SprintPlannerLLMOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", SPRINT_PLANNER_SYSTEM_PROMPT),
            ("user", (
                "Roadmap Phase: {phase}\n"
                "Planning Week: Week {week_number}\n"
                "Founder Capacity: {capacity} hours\n"
                "Active Blockers: {blockers}\n"
                "Completed last week: {completed}\n"
                "Deferred rollover tasks: {deferred}"
            )),
        ])

        chain = prompt | structured_llm
        raw: SprintPlannerLLMOutput = chain.invoke({
            "phase": str(input_data.roadmap_phase.model_dump()),
            "week_number": input_data.week_number,
            "capacity": input_data.founder_capacity_this_week,
            "blockers": ", ".join(input_data.blockers or ["None"]),
            "completed": ", ".join(input_data.completed_last_week or ["None"]),
            "deferred": ", ".join(input_data.deferred_tasks or ["None"]),
        })

        advance_step(run_id, 2, steps[2], tool_name="enrich_tasks")
        enriched_tasks = enrich_sprint_tasks(raw.sprint.tasks, founder_id)
        delegate_count = sum(1 for t in enriched_tasks if t.agent_config)

        output = SprintPlannerOutput(
            sprint=raw.sprint.model_copy(update={"tasks": enriched_tasks}),
            step_labels=steps,
            context_summary=(
                f"I planned week {input_data.week_number} with {len(enriched_tasks)} tasks "
                f"({delegate_count} ready for one-click Karnex execution)."
            ),
            confidence="medium",
            suggested_next_agent="builder-v1" if delegate_count else None,
            pre_populated=input_data.pre_populated,
        )

        try:
            supabase = get_supabase_admin()
            roadmap_res = (
                supabase.table("roadmaps")
                .select("id")
                .eq("founder_id", founder_id)
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )
            if roadmap_res and roadmap_res.data:
                roadmap_id = roadmap_res.data.get("id")
                today = date.today()
                start_offset = (input_data.week_number - 1) * 7
                week_start = today + timedelta(days=start_offset)
                week_end = week_start + timedelta(days=6)

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
                    "status": "active",
                }

                existing_sprint = (
                    supabase.table("sprints")
                    .select("id")
                    .eq("roadmap_id", roadmap_id)
                    .eq("sprint_number", input_data.week_number)
                    .maybe_single()
                    .execute()
                )

                if existing_sprint and existing_sprint.data:
                    sprint_id = existing_sprint.data["id"]
                    supabase.table("sprints").update(sprint_payload).eq("id", sprint_id).execute()
                    supabase.table("tasks").delete().eq("sprint_id", sprint_id).execute()
                else:
                    sprint_res = supabase.table("sprints").insert(sprint_payload).execute()
                    sprint_id = sprint_res.data[0]["id"]

                founder_ctx = load_founder_context(founder_id)
                tasks_payloads = []
                for t in output.sprint.tasks:
                    config, execute_label, auto_executable, delegated = enrich_sprint_task(
                        t, founder_ctx, founder_id
                    )
                    if t.agent_config:
                        config = t.agent_config
                        execute_label = t.execute_label or execute_label
                        auto_executable = True
                        delegated = t.agent_config.agent_id

                    row: Dict[str, Any] = {
                        "sprint_id": sprint_id,
                        "founder_id": founder_id,
                        "title": t.title,
                        "description": t.description,
                        "status": "todo",
                        "priority": t.priority,
                        "estimated_hours": t.estimated_hours,
                        "category": t.category,
                        "definition_of_done": t.definition_of_done,
                        "delegated_to_agent": delegated or t.can_delegate_to_agent,
                        "execute_label": execute_label or None,
                        "auto_executable": auto_executable,
                    }
                    if config:
                        row["agent_config"] = config.model_dump()
                    tasks_payloads.append(row)

                if tasks_payloads:
                    supabase.table("tasks").insert(tasks_payloads).execute()
        except Exception as db_err:
            logger.warning(f"Failed to sync sprint plan to database: {db_err}")

        karnex_memory_write(
            founder_id=founder_id,
            namespace="sprint_planner",
            key=f"sprint_{input_data.week_number}",
            value=output.model_dump(),
            tags=["sprint-plan", "tasks", "roadmap-weekly"],
        )

        duration_ms = int((time.time() - start_time) * 1000)
        complete_agent_run(run_id, founder_id, output, "weekly_sprint_plan", duration_ms=duration_ms)
        return output

    except Exception as e:
        logger.exception("Error executing Sprint Planner agent")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
