import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.idea_crystallizer.prompts import IDEA_CRYSTALLIZER_SYSTEM_PROMPT
from agents.idea_crystallizer.schemas import (
    IdeaCrystallizerInput,
    IdeaCrystallizerLLMOutput,
    IdeaCrystallizerOutput,
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

AGENT_ID = "idea-crystallizer-v1"


def run_idea_crystallizer(input_data: IdeaCrystallizerInput) -> IdeaCrystallizerOutput:
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(AGENT_ID, founder_id, input_data.model_dump(), llm_model=settings.GEMINI_MODEL)

    try:
        advance_step(run_id, 0, steps[0], tool_name="karnex_memory_read")
        memory_ctx = karnex_memory_read(founder_id, "pain-transformer", "latest_hypotheses") or {}
        search_query = f"{input_data.selected_hypothesis.get('title', '')} pricing competitors SaaS"
        grounding = web_search(search_query)
        search_weak = "unavailable" in (grounding or "").lower()

        advance_step(run_id, 1, steps[1], tool_name="llm_brief")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.7,
        )
        structured_llm = llm.with_structured_output(IdeaCrystallizerLLMOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", IDEA_CRYSTALLIZER_SYSTEM_PROMPT),
            ("user", (
                "Selected hypothesis: {hypothesis}\n"
                "Founder preferences: {prefs}\n"
                "Additional context: {extra}\n"
                "Prior pain analysis: {memory}\n"
                "Market grounding: {grounding}\n"
            )),
        ])
        raw: IdeaCrystallizerLLMOutput = (prompt | structured_llm).invoke({
            "hypothesis": str(input_data.selected_hypothesis),
            "prefs": str(input_data.founder_preferences or {}),
            "extra": input_data.additional_context or "None",
            "memory": str(memory_ctx)[:4000],
            "grounding": grounding,
        })

        brief = raw.product_brief
        name = brief.get("selected_name") or brief.get("title") or "your product"
        advance_step(run_id, 2, steps[2], tool_name="karnex_memory_write")
        output = IdeaCrystallizerOutput(
            product_brief=brief,
            step_labels=steps,
            context_summary=f"I turned your hypothesis into a product brief for {name}, including pricing and GTM channels.",
            confidence="low" if search_weak else "medium",
            suggested_next_agent="competitive-landscape-v1",
            pre_populated=input_data.pre_populated,
        )
        karnex_memory_write(
            founder_id=founder_id,
            namespace="idea-crystallizer",
            key="product_brief",
            value=brief,
            tags=["product-brief", "dream-engine"],
        )
        complete_agent_run(
            run_id, founder_id, output, "product_brief",
            duration_ms=int((time.time() - start_time) * 1000),
        )
        return output
    except Exception as e:
        logger.exception("idea-crystallizer failed")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
