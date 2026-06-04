import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.competitive_landscape.prompts import COMPETITIVE_LANDSCAPE_SYSTEM_PROMPT
from agents.competitive_landscape.schemas import (
    CompetitiveLandscapeInput,
    CompetitiveLandscapeLLMOutput,
    CompetitiveLandscapeOutput,
)
from agents.pain_transformer.tools import (
    karnex_memory_read,
    karnex_memory_write,
    web_search,
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

AGENT_ID = "competitive-landscape-v1"


def run_competitive_landscape(input_data: CompetitiveLandscapeInput) -> CompetitiveLandscapeOutput:
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(AGENT_ID, founder_id, input_data.model_dump(), llm_model=settings.GEMINI_MODEL_31_FLASH_LITE)

    try:
        advance_step(run_id, 0, steps[0], tool_name="web_search")
        brief = karnex_memory_read(founder_id, "idea-crystallizer", "product_brief") or {}
        q = f"{input_data.product_category} competitors {' '.join(input_data.known_competitors or [])}"
        grounding = web_search(q)
        search_weak = "unavailable" in (grounding or "").lower()

        advance_step(run_id, 1, steps[1], tool_name="llm_matrix")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_31_FLASH_LITE,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_COMPETITIVE,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.4,
        )
        structured_llm = llm.with_structured_output(CompetitiveLandscapeLLMOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", COMPETITIVE_LANDSCAPE_SYSTEM_PROMPT),
            ("user", (
                "Category: {category}\nFeatures: {features}\nAudience: {audience}\n"
                "Known competitors: {known}\nProduct brief: {brief}\nGrounding: {grounding}"
            )),
        ])
        raw: CompetitiveLandscapeLLMOutput = (prompt | structured_llm).invoke({
            "category": input_data.product_category,
            "features": ", ".join(input_data.key_features),
            "audience": input_data.target_audience,
            "known": ", ".join(input_data.known_competitors or []),
            "brief": str(brief)[:3000],
            "grounding": grounding,
        })

        advance_step(run_id, 2, steps[2], tool_name="karnex_memory_write")
        count = len(raw.competitors)
        output = CompetitiveLandscapeOutput(
            competitors=raw.competitors,
            competitive_matrix=raw.competitive_matrix,
            gaps=raw.gaps,
            positioning_recommendations=raw.positioning_recommendations,
            pricing_intelligence=raw.pricing_intelligence,
            step_labels=steps,
            context_summary=f"I mapped {count} competitors and highlighted gaps you can own in positioning.",
            confidence="low" if search_weak else "medium",
            suggested_next_agent="icp-definer-v1",
            pre_populated=input_data.pre_populated,
        )
        karnex_memory_write(
            founder_id=founder_id,
            namespace="competitive-landscape",
            key="latest_analysis",
            value=output.model_dump(),
            tags=["competitive", "dream-engine"],
        )
        complete_agent_run(
            run_id, founder_id, output, "competitive_landscape",
            duration_ms=int((time.time() - start_time) * 1000),
        )
        return output
    except Exception as e:
        logger.exception("competitive-landscape failed")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
