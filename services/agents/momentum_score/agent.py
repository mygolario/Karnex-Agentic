import asyncio
import time

from agents.momentum_score.schemas import (
    MomentumBreakdown,
    MomentumScoreInput,
    MomentumScoreOutput,
)
from shared.agent_run_logging import (
    advance_step,
    complete_agent_run,
    fail_agent_run,
    start_agent_run,
)
from shared.agent_step_catalog import get_step_labels
from shared.logger import logger
from shared.momentum import calculate_momentum_score, update_founder_momentum_score

AGENT_ID = "momentum-score-v1"


def _trend_message(score: int, trend: str) -> str:
    if trend == "rising":
        return f"Momentum is rising at {score}/100 — keep shipping this week."
    if trend == "falling":
        return f"Momentum dipped to {score}/100 — pick one 15-minute win today."
    return f"Momentum is steady at {score}/100."


async def run_momentum_score_async(input_data: MomentumScoreInput) -> MomentumScoreOutput:
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(AGENT_ID, founder_id, input_data.model_dump())

    try:
        advance_step(run_id, 0, steps[0], tool_name="aggregate_activity")
        advance_step(run_id, 1, steps[1], tool_name="calculate_score")
        score = await calculate_momentum_score(founder_id)
        breakdown = MomentumBreakdown(
            task_completion=min(25, score // 4),
            consistency=min(25, (score // 4)),
            agent_utilization=min(25, (score // 4)),
            progress=min(25, score - 3 * (score // 4)),
        )
        trend = "rising" if score >= 60 else "falling" if score < 35 else "steady"

        advance_step(run_id, 2, steps[2], tool_name="update_founder")
        await update_founder_momentum_score(founder_id)

        output = MomentumScoreOutput(
            score=score,
            breakdown=breakdown,
            trend=trend,
            message=_trend_message(score, trend),
            step_labels=steps,
            context_summary=_trend_message(score, trend),
            confidence="high",
            suggested_next_agent=None,
            pre_populated=input_data.pre_populated,
        )
        complete_agent_run(run_id, founder_id, output, "momentum_score", duration_ms=int((time.time() - start_time) * 1000))
        return output
    except Exception as e:
        logger.exception("momentum-score failed")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise


def run_momentum_score(input_data: MomentumScoreInput) -> MomentumScoreOutput:
    return asyncio.run(run_momentum_score_async(input_data))
