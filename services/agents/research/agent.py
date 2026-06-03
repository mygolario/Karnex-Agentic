import asyncio
from typing import Any, List

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from agents.pain_transformer.tools import karnex_memory_write, web_search
from agents.research.prompts import (
    QUERY_GENERATOR_SYSTEM_PROMPT,
    RESEARCH_SYNTHESIZER_SYSTEM_PROMPT,
)
from agents.research.schemas import ResearchInput, ResearchLLMOutput, ResearchOutput
from shared.agent_run_logging import complete_agent_run
from shared.agent_step_catalog import RESEARCH_STATUS_TO_STEP, get_step_labels
from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


class QueryGeneratorOutput(BaseModel):
    queries: List[str] = Field(..., min_items=3, max_items=3, description="List of exactly 3 search queries.")


async def _update_run_status_detail(supabase: Any, run_id: str, detail: str):
    """Updates run status and advances checklist step."""
    from shared.agent_run_logging import advance_step

    steps = get_step_labels("research-v1")
    idx = RESEARCH_STATUS_TO_STEP.get(detail, 0)
    label = steps[idx] if idx < len(steps) else detail
    try:
        advance_step(run_id, idx, label, status_detail=detail, tool_name=detail)
    except Exception as e:
        logger.warning(f"Could not update status detail for run {run_id} to '{detail}': {e}")


async def run_research(input_data: ResearchInput, run_id: str, supabase: Any = None) -> ResearchOutput:
    """Executes the Research Agent using a supervisor-worker topology:

    1. Spawns query generator sub-agent to formulate 3 distinct queries.
    2. Spawns web scraper workers in parallel to gather DuckDuckGo data.
    3. Spawns a synthesizer sub-agent to compile the structured ResearchBrief.
    """
    if supabase is None:
        supabase = get_supabase_admin()
    founder_id = input_data.founder_id
    logger.info(f"Running research-v1 for founder={founder_id}, run_id={run_id}")

    # 1. Spawn Query Generator Sub-Agent
    await _update_run_status_detail(supabase, run_id, "generating_search_queries")

    llm_flash = ChatOpenAI(
        model=settings.GEMINI_MODEL_FLASH,
        openai_api_key=settings.OPENROUTER_API_KEY,
        openai_api_base=settings.OPENROUTER_BASE_URL,
        max_tokens=settings.OPENROUTER_MAX_TOKENS,
        default_headers={
            "HTTP-Referer": "https://karnex.ai",
            "X-Title": "Karnex"
        },
        temperature=0.3
    )

    structured_query_gen = llm_flash.with_structured_output(QueryGeneratorOutput)
    query_prompt = ChatPromptTemplate.from_messages([
        ("system", QUERY_GENERATOR_SYSTEM_PROMPT),
        ("user", (
            "Research Question: {question}\n"
            "Scope: {scope}\n"
            "Constraints: {constraints}"
        ))
    ])

    query_chain = query_prompt | structured_query_gen
    query_res: QueryGeneratorOutput = await asyncio.to_thread(
        lambda: query_chain.invoke({
            "question": input_data.research_question,
            "scope": input_data.scope,
            "constraints": input_data.constraints or "None specified"
        })
    )

    queries = query_res.queries
    logger.info(f"Sub-agent query-generator produced queries: {queries}")

    # 2. Spawn Parallel Web Search/Scraper Workers
    await _update_run_status_detail(supabase, run_id, "searching_web_sources")

    # RunDuckDuckGo search concurrently for each query
    search_tasks = []
    for q in queries:
        search_tasks.append(asyncio.to_thread(web_search, q))

    search_summaries = await asyncio.gather(*search_tasks)

    # Compile search data
    aggregated_context = ""
    for idx, (q, summary) in enumerate(zip(queries, search_summaries)):
        aggregated_context += f"### Results for Query {idx+1}: '{q}'\n{summary}\n\n"

    # 3. Spawn Synthesizer Sub-Agent
    await _update_run_status_detail(supabase, run_id, "synthesizing_brief")

    llm_pro = ChatOpenAI(
        model=settings.GEMINI_MODEL,
        openai_api_key=settings.OPENROUTER_API_KEY,
        openai_api_base=settings.OPENROUTER_BASE_URL,
        max_tokens=settings.OPENROUTER_MAX_TOKENS,
        default_headers={
            "HTTP-Referer": "https://karnex.ai",
            "X-Title": "Karnex"
        },
        temperature=0.4
    )

    structured_brief_gen = llm_pro.with_structured_output(ResearchLLMOutput)
    synthesis_prompt = ChatPromptTemplate.from_messages([
        ("system", RESEARCH_SYNTHESIZER_SYSTEM_PROMPT),
        ("user", (
            "Research Question: {question}\n"
            "Scope: {scope}\n"
            "Depth: {depth}\n"
            "Constraints: {constraints}\n\n"
            "Grounding context gathered by search sub-agents:\n"
            "{context}\n\n"
            "Please compile the detailed, structured research brief."
        ))
    ])

    synthesis_chain = synthesis_prompt | structured_brief_gen
    raw: ResearchLLMOutput = await asyncio.to_thread(
        lambda: synthesis_chain.invoke({
            "question": input_data.research_question,
            "scope": input_data.scope,
            "depth": input_data.depth,
            "constraints": input_data.constraints or "None specified",
            "context": aggregated_context
        })
    )
    steps = get_step_labels("research-v1")
    summary_text = raw.research_brief.executive_summary
    raw_conf = raw.research_brief.confidence
    conf: str = raw_conf if raw_conf in ("low", "medium", "high") else "medium"
    output = ResearchOutput(
        research_brief=raw.research_brief,
        context_summary=summary_text[:200] if summary_text else "I completed your research brief.",
        step_labels=steps,
        confidence=conf,
        suggested_next_agent=None,
        pre_populated=bool(getattr(input_data, "pre_populated", False)),
    )

    # 4. Save to Memory
    await asyncio.to_thread(
        lambda: karnex_memory_write(
            founder_id=founder_id,
            namespace="research",
            key=f"brief_{run_id}",
            value=output.model_dump(),
            tags=["research-brief", "intelligence", "market-analysis"]
        )
    )

    complete_agent_run(run_id, founder_id, output, "research_brief")
    return output
