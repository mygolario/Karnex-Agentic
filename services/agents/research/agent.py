import asyncio
import time
import shutil
import logging
from pathlib import Path
from typing import Any
from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI

from agents.pain_transformer.tools import karnex_memory_write, web_search
from agents.research.schemas import ResearchInput, ResearchLLMOutput, ResearchOutput
from shared.agent_run_logging import complete_agent_run, fail_agent_run
from shared.agent_step_catalog import get_step_labels
from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin

# Deep Agents integration imports
from deepagents import create_deep_agent
from shared.deepagents_integration.middleware import KarnexLoggingMiddleware
from shared.deepagents_integration.backend import KarnexMemoryBackend

AGENT_ID = "research-v1"


async def run_research(input_data: ResearchInput, run_id: str, supabase: Any = None) -> ResearchOutput:
    """Executes the Research Agent using LangChain Deep Agents with a unified search tool."""
    if supabase is None:
        supabase = get_supabase_admin()
    founder_id = input_data.founder_id
    steps = get_step_labels(AGENT_ID)
    start_time = time.time()

    logger.info(f"Running research-v1 for founder={founder_id}, run_id={run_id}")

    # 1. Setup local temporary sandbox directory
    sandbox_dir = Path("c:/Karnex-Agentic/sandbox") / f"research_{run_id}"
    sandbox_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 2. Initialize LLM (Gemini Pro via OpenRouter)
        logger.info("Initializing OpenRouter LLM model client...")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_RESEARCH,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.4,
        )

        # 3. Construct integration backend and middleware
        backend = KarnexMemoryBackend(root_dir=sandbox_dir, founder_id=founder_id)
        logging_middleware = KarnexLoggingMiddleware(run_id=run_id, founder_id=founder_id)

        # 4. Wrap web search function as a LangChain tool
        search_tool = Tool(
            name="web_search",
            func=web_search,
            description="Searches DuckDuckGo to retrieve real-time facts, competitor information, pricing, or technical details."
        )

        # 5. Create deep agent compiled graph with structured output format
        logger.info("Compiling LangChain Deep Agents Research graph...")
        agent = create_deep_agent(
            model=llm,
            backend=backend,
            middleware=[logging_middleware],
            tools=[search_tool],
            response_format=ResearchLLMOutput,
            system_prompt=(
                "You are a professional Research Agent. Your goal is to gather detailed market, competitor, "
                "audience, or technology insights to answer the founder's research question.\n"
                "You must formulate search queries, execute web searches, read relevant pages, and synthesize "
                "your findings into a comprehensive ResearchBrief matching the response format."
            )
        )

        # Query active MVP context from founder_memory if available
        mvp_details = ""
        try:
            db_client = supabase or get_supabase_admin()
            res = db_client.table("founder_memory").select("value").eq("founder_id", founder_id).eq("namespace", "mvp_context").eq("key", "active_mvp").maybe_single().execute()
            if res.data and "value" in res.data:
                val = res.data["value"]
                mvp_details = (
                    f"\n--- Linked MVP Context ---\n"
                    f"Product Summary: {val.get('summary', '')}\n"
                    f"Key Features: {', '.join(val.get('features', []))}\n"
                    f"Tech Stack: {val.get('tech_stack', {})}\n"
                    f"---------------------------\n"
                )
        except Exception as err:
            logger.warning(f"Could not load mvp_context for research: {err}")

        # 6. Formulate user prompt and trigger agent execution loop
        initial_message = (
            f"Research Question: {input_data.research_question}\n"
            f"Scope: {input_data.scope}\n"
            f"Depth: {input_data.depth}\n"
            f"Preferred Sources: {input_data.preferred_sources or 'Any'}\n"
            f"Constraints: {input_data.constraints or 'None'}\n"
            f"{mvp_details}\n"
            "Please perform the required research and compile the detailed brief."
        )

        state = {"messages": [("user", initial_message)]}
        logger.info("Invoking Deep Agent research loop...")
        final_state = await agent.ainvoke(state)

        # 7. Extract structured response
        raw = final_state.get("structured_response")
        if not raw or not isinstance(raw, ResearchLLMOutput):
            raise ValueError("Agent execution completed but did not produce a structured ResearchLLMOutput.")

        brief = raw.research_brief
        output = ResearchOutput(
            research_brief=brief,
            context_summary=brief.executive_summary[:200] if brief.executive_summary else "I completed your research brief.",
            step_labels=steps,
            confidence=brief.confidence if brief.confidence in ("low", "medium", "high") else "medium",
            suggested_next_agent=None,
            pre_populated=bool(getattr(input_data, "pre_populated", False)),
        )

        # 8. Save output to Memory
        logger.info("Persisting research brief output to founder memory...")
        karnex_memory_write(
            founder_id=founder_id,
            namespace="research",
            key=f"brief_{run_id}",
            value=output.model_dump(),
            tags=["research-brief", "intelligence", "market-analysis"]
        )

        # 9. Clean up temporary directories
        shutil.rmtree(sandbox_dir, ignore_errors=True)

        # 10. Complete agent run
        duration_ms = int((time.time() - start_time) * 1000)
        complete_agent_run(run_id, founder_id, output, "research_brief", duration_ms=duration_ms)
        return output

    except Exception as e:
        logger.exception("Deep Agents Research pipeline failed")
        duration_ms = int((time.time() - start_time) * 1000)
        fail_agent_run(run_id, str(e), duration_ms=duration_ms)
        shutil.rmtree(sandbox_dir, ignore_errors=True)
        raise
