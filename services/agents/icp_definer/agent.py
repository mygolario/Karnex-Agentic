import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.icp_definer.prompts import ICP_DEFINER_SYSTEM_PROMPT
from agents.icp_definer.schemas import (
    ICPDefinerInput,
    ICPDefinerLLMOutput,
    ICPDefinerOutput,
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

AGENT_ID = "icp-definer-v1"


def run_icp_definer(input_data: ICPDefinerInput) -> ICPDefinerOutput:
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(AGENT_ID, founder_id, input_data.model_dump(), llm_model=settings.GEMINI_MODEL_FLASH)

    try:
        advance_step(run_id, 0, steps[0], tool_name="karnex_memory_read")
        if not input_data.product_brief:
            input_data = input_data.model_copy(
                update={
                    "product_brief": karnex_memory_read(founder_id, "idea-crystallizer", "product_brief") or {},
                }
            )
        comp = input_data.competitive_landscape or karnex_memory_read(
            founder_id, "competitive-landscape", "latest_analysis"
        )
        grounding = web_search(
            f"{input_data.product_brief.get('selected_name', 'product')} target customer persona B2B"
        )

        advance_step(run_id, 1, steps[1], tool_name="llm_icp")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_FLASH,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_FLASH,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.7,
            timeout=30,
        )
        structured_llm = llm.with_structured_output(ICPDefinerLLMOutput)
        prompt = ChatPromptTemplate.from_messages([
            ("system", ICP_DEFINER_SYSTEM_PROMPT),
            ("user", (
                "Product brief: {brief}\nCompetitive context: {comp}\n"
                "Founder intuition: {intuition}\nGrounding: {grounding}"
            )),
        ])
        raw: ICPDefinerLLMOutput = (prompt | structured_llm).invoke({
            "brief": str(input_data.product_brief)[:4000],
            "comp": str(comp)[:2000],
            "intuition": input_data.founder_intuition or "None",
            "grounding": grounding,
        })

        advance_step(run_id, 2, steps[2], tool_name="karnex_memory_write")
        p0 = raw.personas[0].get("name", "your primary persona") if raw.personas else "your ICP"
        output = ICPDefinerOutput(
            icp=raw.icp,
            personas=raw.personas,
            step_labels=steps,
            context_summary=f"I defined your ICP and 3 personas — lead with {p0} for early outreach.",
            confidence="medium",
            suggested_next_agent="war-room-v1",
            pre_populated=input_data.pre_populated,
        )
        karnex_memory_write(
            founder_id=founder_id,
            namespace="icp-definer",
            key="icp",
            value={"icp": raw.icp, "personas": raw.personas},
            tags=["icp", "personas", "dream-engine"],
        )
        complete_agent_run(run_id, founder_id, output, "icp_document", duration_ms=int((time.time() - start_time) * 1000))
        return output
    except Exception as e:
        logger.exception("icp-definer failed")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
