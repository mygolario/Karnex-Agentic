import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.pain_transformer.tools import karnex_memory_write
from agents.weekly_debrief.prompts import WEEKLY_DEBRIEF_SYSTEM_PROMPT
from agents.weekly_debrief.schemas import (
    WeeklyDebriefInput,
    WeeklyDebriefLLMOutput,
    WeeklyDebriefOutput,
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

AGENT_ID = "weekly-debrief-v1"


def run_weekly_debrief(input_data: WeeklyDebriefInput) -> WeeklyDebriefOutput:
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(AGENT_ID, founder_id, input_data.model_dump(), llm_model=settings.GEMINI_MODEL)

    try:
        advance_step(run_id, 0, steps[0], tool_name="aggregate_week")
        advance_step(run_id, 1, steps[1], tool_name="llm_debrief")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.5,
        )
        structured_llm = llm.with_structured_output(WeeklyDebriefLLMOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", WEEKLY_DEBRIEF_SYSTEM_PROMPT),
            ("user", (
                "Sprint: {sprint}\nStandups: {standups}\nAgent runs: {runs}\nMetrics: {metrics}"
            )),
        ])
        raw: WeeklyDebriefLLMOutput = (prompt | structured_llm).invoke({
            "sprint": str(input_data.sprint_data)[:4000],
            "standups": str(input_data.standup_summaries)[:3000],
            "runs": str(input_data.agent_runs_this_week)[:2000],
            "metrics": str(input_data.metrics or []),
        })

        advance_step(run_id, 2, steps[2], tool_name="save_debrief")
        assessment = raw.debrief.overall_assessment or "Solid week — keep momentum on your top priority."
        output = WeeklyDebriefOutput(
            debrief=raw.debrief,
            step_labels=steps,
            context_summary=assessment[:200],
            confidence="medium",
            suggested_next_agent="sprint-planner-v1",
            pre_populated=input_data.pre_populated,
        )
        karnex_memory_write(
            founder_id=founder_id,
            namespace="weekly-debrief",
            key="latest_debrief",
            value=output.model_dump(),
            tags=["debrief", "compass"],
        )
        complete_agent_run(run_id, founder_id, output, "weekly_debrief", duration_ms=int((time.time() - start_time) * 1000))
        return output
    except Exception as e:
        logger.exception("weekly-debrief failed")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
