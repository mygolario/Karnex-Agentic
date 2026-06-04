import time
from typing import Any, Dict, List

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.analytics_insight.prompts import ANALYTICS_INSIGHT_SYSTEM_PROMPT
from agents.analytics_insight.schemas import (
    AnalyticsInsightInput,
    AnalyticsInsightLLMOutput,
    AnalyticsInsightOutput,
)
from agents.pain_transformer.tools import karnex_memory_write
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

AGENT_ID = "analytics-insight-v1"


def _load_internal_metrics(founder_id: str, time_range: str) -> Dict[str, Any]:
    """Aggregate lightweight internal metrics when PostHog is unavailable."""
    supabase = get_supabase_admin()
    metrics: List[Dict[str, str]] = []
    try:
        tasks = (
            supabase.table("tasks")
            .select("status")
            .eq("founder_id", founder_id)
            .execute()
        )
        rows = tasks.data or []
        done = sum(1 for t in rows if t.get("status") == "done")
        total = len(rows) or 1
        metrics.append({"name": "Task completion rate", "value": f"{int(done / total * 100)}%", "change": time_range})
    except Exception as e:
        logger.warning(f"analytics metrics load failed: {e}")
    try:
        runs = (
            supabase.table("agent_runs")
            .select("agent_id")
            .eq("founder_id", founder_id)
            .eq("status", "success")
            .execute()
        )
        agents = {r.get("agent_id") for r in (runs.data or [])}
        metrics.append({"name": "Agents used", "value": str(len(agents)), "change": "recent"})
    except Exception:
        pass
    return {"metrics": metrics, "source": "karnex_internal"}


def run_analytics_insight(input_data: AnalyticsInsightInput) -> AnalyticsInsightOutput:
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(AGENT_ID, founder_id, input_data.model_dump(), llm_model=settings.GEMINI_MODEL_FLASH_LITE)

    try:
        advance_step(run_id, 0, steps[0], tool_name="load_metrics")
        bundle = _load_internal_metrics(founder_id, input_data.time_range)

        advance_step(run_id, 1, steps[1], tool_name="detect_anomalies")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_FLASH_LITE,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_SIMPLE,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.3,
        )
        structured_llm = llm.with_structured_output(AnalyticsInsightLLMOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", ANALYTICS_INSIGHT_SYSTEM_PROMPT),
            ("user", "Data source: {source}\nTime range: {range}\nFocus: {focus}\nMetrics: {metrics}"),
        ])
        raw: AnalyticsInsightLLMOutput = (prompt | structured_llm).invoke({
            "source": input_data.data_source,
            "range": input_data.time_range,
            "focus": input_data.focus_area or "all",
            "metrics": str(bundle),
        })

        advance_step(run_id, 2, steps[2], tool_name="save_insights")
        so_what = raw.insights.so_what or "Review recommendations and pick one action for this week."
        output = AnalyticsInsightOutput(
            insights=raw.insights,
            step_labels=steps,
            context_summary=so_what[:200],
            confidence="medium" if bundle.get("metrics") else "low",
            suggested_next_agent="sprint-planner-v1",
            pre_populated=input_data.pre_populated,
        )
        karnex_memory_write(
            founder_id=founder_id,
            namespace="analytics-insight",
            key=f"insights_{input_data.time_range}",
            value=output.model_dump(),
            tags=["analytics", "metrics"],
        )
        complete_agent_run(run_id, founder_id, output, "analytics_insights", duration_ms=int((time.time() - start_time) * 1000))
        return output
    except Exception as e:
        logger.exception("analytics-insight failed")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
