"""Core implementation of the Pain-to-Product Transformer agent."""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from services.shared.config import settings
from services.shared.logger import logger
from services.shared.supabase_client import get_supabase_admin
from services.agents.pain_transformer.schemas import PainTransformerInput, PainTransformerOutput
from services.agents.pain_transformer.prompts import PAIN_TRANSFORMER_SYSTEM_PROMPT
from services.agents.pain_transformer.tools import web_search, karnex_memory_write


def _log_agent_run_start(founder_id: str, input_data: PainTransformerInput) -> str:
    """Inserts an execution log row in agent_runs with status='running'.

    Returns the run ID.
    """
    run_id = str(uuid.uuid4())
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").insert({
            "id": run_id,
            "founder_id": founder_id,
            "agent_id": "pain-transformer-v1",
            "agent_version": "v1.0.0",
            "status": "running",
            "input": input_data.model_dump(),
            "triggered_by": "user",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "llm_model": settings.GEMINI_MODEL
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log agent run start to database: {str(e)}")
    return run_id


def _log_agent_run_success(run_id: str, founder_id: str, output: PainTransformerOutput, duration_ms: int):
    """Updates agent_runs with success state and inserts the output into agent_outputs."""
    try:
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc).isoformat()
        
        # Update run status
        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": now,
            "duration_ms": duration_ms
        }).eq("id", run_id).execute()

        # Insert output
        supabase.table("agent_outputs").insert({
            "agent_run_id": run_id,
            "founder_id": founder_id,
            "output_type": "product_hypothesis",
            "output": output.model_dump()
        }).execute()
        
    except Exception as e:
        logger.warning(f"Could not log agent run success to database: {str(e)}")


def _log_agent_run_failure(run_id: str, error_message: str, duration_ms: int):
    """Updates agent_runs with error state."""
    try:
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("agent_runs").update({
            "status": "error",
            "completed_at": now,
            "duration_ms": duration_ms,
            "error_message": error_message,
            "error_type": "agent_failure"
        }).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Could not log agent run failure to database: {str(e)}")


def run_pain_transformer(input_data: PainTransformerInput) -> PainTransformerOutput:
    """Executes the Pain-to-Product Transformer agent pipeline.

    It performs web search grounding and uses Gemini to analyze the pain and propose 3 hypotheses.
    Results are saved to the Supabase database (and local fallback cache).
    """
    founder_id = input_data.founder_id
    logger.info(f"Running pain-transformer-v1 for founder={founder_id}")
    
    start_time = time.time()
    run_id = _log_agent_run_start(founder_id, input_data)
    
    try:
        # Step 1: Pre-search grounding. Determine a query based on pain description
        search_query = f"{input_data.industry_context or ''} {input_data.pain_description[:100]} competitors alternative solutions".strip()
        search_results = web_search(search_query)

        # Step 2: Initialize Gemini LLM with structured output mapping to our schema
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_GEMINI_API_KEY,
            temperature=0.8
        )
        structured_llm = llm.with_structured_output(PainTransformerOutput)

        # Step 3: Setup prompt templates
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
            ))
        ])

        # Step 4: Execute chain
        chain = prompt | structured_llm
        output: PainTransformerOutput = chain.invoke({
            "pain_description": input_data.pain_description,
            "industry_context": input_data.industry_context or "General startup/technology space",
            "existing_solutions": ", ".join(input_data.existing_solutions or ["None specified"]),
            "search_results": search_results
        })

        # Step 5: Save output to Karnex Memory (per agent spec rules)
        karnex_memory_write(
            founder_id=founder_id,
            namespace="pain-transformer",
            key="latest_hypotheses",
            value=output.model_dump(),
            tags=["hypotheses", "ideation", "pain-analysis"]
        )

        # Log success and return
        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_success(run_id, founder_id, output, duration_ms)
        return output

    except Exception as e:
        logger.exception("Error executing Pain-to-Product Transformer agent")
        duration_ms = int((time.time() - start_time) * 1000)
        _log_agent_run_failure(run_id, str(e), duration_ms)
        raise e
