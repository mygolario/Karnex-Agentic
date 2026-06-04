"""Core implementation of the Pain-to-Product Transformer agent."""

import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.pain_transformer.prompts import PAIN_TRANSFORMER_SYSTEM_PROMPT
from agents.pain_transformer.schemas import (
    PainTransformerInput,
    PainTransformerLLMOutput,
    PainTransformerOutput,
)
from agents.pain_transformer.tools import karnex_memory_write, web_search
from shared.agent_run_logging import (
    advance_step,
    complete_agent_run,
    fail_agent_run,
    start_agent_run,
)
from shared.agent_step_catalog import get_step_labels
from shared.config import settings
from shared.logger import logger

AGENT_ID = "pain-transformer-v1"


def run_pain_transformer(input_data: PainTransformerInput) -> PainTransformerOutput:
    """Executes the Pain-to-Product Transformer agent pipeline."""
    founder_id = input_data.founder_id
    logger.info(f"Running {AGENT_ID} for founder={founder_id}")

    steps = get_step_labels(AGENT_ID)
    start_time = time.time()
    run_id = start_agent_run(
        AGENT_ID,
        founder_id,
        input_data.model_dump(),
        llm_model=settings.GEMINI_MODEL_FLASH,
    )

    try:
        advance_step(run_id, 0, steps[0], tool_name="web_search")
        search_query = (
            f"{input_data.industry_context or ''} "
            f"{input_data.pain_description[:100]} competitors alternative solutions"
        ).strip()
        search_results = web_search(search_query)
        search_weak = "unavailable" in (search_results or "").lower()

        advance_step(run_id, 1, steps[1], tool_name="llm_hypotheses")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_FLASH,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_FLASH,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.8,
        )
        structured_llm = llm.with_structured_output(PainTransformerLLMOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", PAIN_TRANSFORMER_SYSTEM_PROMPT),
            ("user", (
                "Here is the raw input from the founder:\n"
                "Pain Description: {pain_description}\n"
                "Industry Context: {industry_context}\n"
                "Existing Solutions Tried: {existing_solutions}\n\n"
                "Here are relevant web search results for context:\n"
                "{search_results}\n\n"
                "Please analyze this pain and produce exactly 3 product hypotheses in JSON format matching the schema."
            )),
        ])

        chain = prompt | structured_llm
        raw: PainTransformerLLMOutput = chain.invoke({
            "pain_description": input_data.pain_description,
            "industry_context": input_data.industry_context or "General startup/technology space",
            "existing_solutions": ", ".join(input_data.existing_solutions or ["None specified"]),
            "search_results": search_results,
        })

        advance_step(run_id, 2, steps[2], tool_name="karnex_memory_write")
        best = raw.hypotheses[raw.recommended_hypothesis].title if raw.hypotheses else "your top idea"
        output = PainTransformerOutput(
            pain_analysis=raw.pain_analysis,
            hypotheses=raw.hypotheses,
            recommended_hypothesis=raw.recommended_hypothesis,
            step_labels=steps,
            context_summary=(
                f"I analyzed your pain and generated 3 product hypotheses; "
                f"'{best}' is the strongest starting point."
            ),
            confidence="low" if search_weak else "medium",
            suggested_next_agent="idea-crystallizer-v1",
            pre_populated=input_data.pre_populated,
        )

        karnex_memory_write(
            founder_id=founder_id,
            namespace="pain-transformer",
            key="latest_hypotheses",
            value=output.model_dump(),
            tags=["hypotheses", "ideation", "pain-analysis"],
        )

        duration_ms = int((time.time() - start_time) * 1000)
        complete_agent_run(
            run_id,
            founder_id,
            output,
            "product_hypothesis",
            duration_ms=duration_ms,
            confidence_rationale="Web search had limited results." if search_weak else None,
        )
        return output

    except Exception as e:
        logger.exception("Error executing Pain-to-Product Transformer agent")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
