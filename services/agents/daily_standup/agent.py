"""Core implementation of the Daily Standup agent."""

import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.daily_standup.prompts import DAILY_STANDUP_SYSTEM_PROMPT
from agents.daily_standup.schemas import (
    DailyStandupInput,
    DailyStandupLLMOutput,
    DailyStandupOutput,
)
from agents.pain_transformer.tools import karnex_memory_write
from agents.daily_standup.tools import (
    get_active_sprint_tasks,
    update_task_status_by_name,
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

AGENT_ID = "daily-standup-v1"


async def run_daily_standup(input_data: DailyStandupInput) -> DailyStandupOutput:
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(
        AGENT_ID, founder_id, input_data.model_dump(), llm_model=settings.GEMINI_MODEL_FLASH_LITE
    )

    try:
        advance_step(run_id, 0, steps[0], tool_name="load_sprint_tasks")
        yesterday_tasks = input_data.yesterday_tasks
        today_sprint_tasks = input_data.today_sprint_tasks
 
        if yesterday_tasks is None or today_sprint_tasks is None:
            db_tasks = get_active_sprint_tasks(founder_id)
            if db_tasks:
                if yesterday_tasks is None:
                    yesterday_tasks = [
                        t["title"] for t in db_tasks if t["status"] in ("in_progress", "todo")
                    ]
                if today_sprint_tasks is None:
                    today_sprint_tasks = [t["title"] for t in db_tasks if t["status"] != "done"]
            if not yesterday_tasks:
                yesterday_tasks = ["No tasks currently scheduled"]
            if not today_sprint_tasks:
                today_sprint_tasks = ["No tasks currently scheduled"]
 
        advance_step(run_id, 1, steps[1], tool_name="llm_standup")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_FLASH_LITE,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=3000,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.5,
        )
        structured_llm = llm.with_structured_output(DailyStandupLLMOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", DAILY_STANDUP_SYSTEM_PROMPT),
            ("user", (
                "Founder Update: {founder_update}\n"
                "Yesterday's planned tasks: {yesterday_tasks}\n"
                "Today's sprint tasks: {today_sprint_tasks}\n"
            )),
        ])
        raw: DailyStandupLLMOutput = (prompt | structured_llm).invoke({
            "founder_update": input_data.founder_update,
            "yesterday_tasks": ", ".join(yesterday_tasks),
            "today_sprint_tasks": ", ".join(today_sprint_tasks),
        })

        summary = raw.standup_summary
        for task_name in summary.yesterday_completed:
            update_task_status_by_name(founder_id, task_name, "done")
        for idx, task_name in enumerate(summary.blockers_identified):
            reason = "Blocked during daily standup check-in"
            if summary.blocker_suggestions and idx < len(summary.blocker_suggestions):
                reason = f"Blocker suggestion: {summary.blocker_suggestions[idx]}"
            update_task_status_by_name(founder_id, task_name, "blocked", blocked_reason=reason)

        advance_step(run_id, 2, steps[2], tool_name="update_momentum")
        try:
            from shared.momentum import update_founder_momentum_score
            await update_founder_momentum_score(founder_id)
        except Exception as me:
            logger.warning(f"Could not update momentum score: {me}")

        priorities = ", ".join(summary.today_priorities[:3]) or "your sprint focus"
        output = DailyStandupOutput(
            standup_summary=summary,
            step_labels=steps,
            context_summary=f"Today's priorities: {priorities}.",
            confidence="high",
            suggested_next_agent="momentum-score-v1",
            pre_populated=input_data.pre_populated,
        )

        karnex_memory_write(
            founder_id=founder_id,
            namespace="daily-standup",
            key="latest_standup",
            value=output.model_dump(),
            tags=["standup", "accountability", "compass"],
        )

        complete_agent_run(
            run_id, founder_id, output, "standup_summary",
            duration_ms=int((time.time() - start_time) * 1000),
        )
        return output

    except Exception as e:
        logger.exception("Error executing Daily Standup agent")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
