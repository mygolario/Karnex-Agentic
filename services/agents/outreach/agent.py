import time
import shutil
import logging
from pathlib import Path
from typing import Any, Optional
from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI

from agents.outreach.prompts import OUTREACH_SYSTEM_PROMPT
from agents.outreach.schemas import OutreachInput, OutreachLLMOutput, OutreachOutput
from agents.pain_transformer.tools import karnex_memory_write, web_search
from shared.agent_run_logging import complete_agent_run, fail_agent_run, advance_step, start_agent_run
from shared.agent_step_catalog import get_step_labels
from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin

# Deep Agents integration imports
from deepagents import create_deep_agent
from shared.deepagents_integration.middleware import KarnexLoggingMiddleware
from shared.deepagents_integration.backend import KarnexMemoryBackend

AGENT_ID = "outreach-v1"


def save_campaign_to_db(
    founder_id: str,
    startup_id: str,
    agent_run_id: str,
    input_data: OutreachInput,
    output: OutreachOutput
) -> str:
    """Saves the generated campaign and its contacts to the database as draft."""
    try:
        supabase = get_supabase_admin()

        message_templates = []
        for msg in output.campaign.messages:
            message_templates.append(msg.model_dump())
        if output.campaign.ab_variants:
            for msg in output.campaign.ab_variants:
                message_templates.append(msg.model_dump())

        campaign_payload = {
            "startup_id": startup_id,
            "founder_id": founder_id,
            "name": output.campaign.name,
            "goal": input_data.campaign_goal,
            "channel": input_data.channel,
            "message_templates": message_templates,
            "status": "draft",
            "total_contacts": len(input_data.contacts),
            "generated_by": "outreach-v1",
            "agent_run_id": agent_run_id
        }
        campaign_res = supabase.table("outreach_campaigns").insert(campaign_payload).execute()
        if not campaign_res.data:
            raise Exception("Failed to insert campaign into database")

        campaign_id = campaign_res.data[0]["id"]

        contacts_payloads = []
        for c in input_data.contacts:
            contacts_payloads.append({
                "campaign_id": campaign_id,
                "founder_id": founder_id,
                "email": c.email,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "company": c.company,
                "title": c.title,
                "linkedin_url": c.linkedin_url,
                "status": "pending",
                "current_step": 0,
                "personalization_data": {
                    "personalization_notes": output.campaign.personalization_notes,
                    "schedule_recommendation": output.campaign.send_schedule.model_dump()
                }
            })

        if contacts_payloads:
            supabase.table("outreach_contacts").insert(contacts_payloads).execute()

        logger.info(f"Successfully saved campaign {campaign_id} with {len(contacts_payloads)} contacts")
        return campaign_id
    except Exception as e:
        logger.error(f"Failed to save campaign to DB: {e}")
        return ""


async def run_outreach(
    input_data: OutreachInput,
    run_id: Optional[str] = None,
    supabase: Any = None,
) -> OutreachOutput:
    """Executes the Outreach agent pipeline using LangChain Deep Agents.

    Takes contact details, campaign goal, target audience context and invokes Gemini Pro
    to write personalized outreach sequences, including subject lines, follow-ups, and A/B test variations.
    Saves the drafts directly to the PostgreSQL database in Supabase and returns the output.
    """
    founder_id = input_data.founder_id
    startup_id = input_data.startup_id
    logger.info(f"Running outreach-v1 for founder={founder_id}, startup={startup_id}")

    steps = get_step_labels(AGENT_ID)
    start_time = time.time()

    if not run_id:
        run_id = start_agent_run(AGENT_ID, founder_id, input_data.model_dump(), llm_model=settings.GEMINI_MODEL)
    elif supabase is None:
        supabase = get_supabase_admin()

    # 1. Setup local temporary sandbox directory
    sandbox_dir = Path("c:/Karnex-Agentic/sandbox") / f"outreach_{run_id}"
    sandbox_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 2. Initialize LLM (Gemini Pro via OpenRouter)
        logger.info("Initializing OpenRouter LLM model client...")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_OUTREACH,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.7,
        )

        # 3. Construct integration backend and middleware
        backend = KarnexMemoryBackend(root_dir=sandbox_dir, founder_id=founder_id)
        logging_middleware = KarnexLoggingMiddleware(run_id=run_id, founder_id=founder_id)

        # 4. Wrap web search function as a LangChain tool
        search_tool = Tool(
            name="web_search",
            func=web_search,
            description="Searches DuckDuckGo to retrieve real-time facts about companies, industry context, or targets."
        )

        # 5. Create deep agent compiled graph with structured output format
        logger.info("Compiling LangChain Deep Agents Outreach graph...")
        agent = create_deep_agent(
            model=llm,
            backend=backend,
            middleware=[logging_middleware],
            tools=[search_tool],
            response_format=OutreachLLMOutput,
            system_prompt=(
                "You are an outreach and lead generation specialist. Your goal is to review a campaign goal, "
                "audience, and contact list details, and produce a high-performing outreach sequence.\n"
                "You must perform web searches to research target companies or audience context, "
                "then write personalized email templates matching the structured schema."
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
            logger.warning(f"Could not load mvp_context for outreach: {err}")

        # 6. Formulate user prompt and trigger agent execution loop
        sample_contact = input_data.contacts[0] if input_data.contacts else None
        initial_message = (
            f"Campaign Goal: {input_data.campaign_goal}\n"
            f"Target Audience: {input_data.target_audience}\n"
            f"Tone Preferred: {input_data.tone or 'direct'}\n"
            f"Sequence Length: {input_data.sequence_length or 3}\n"
            f"Reference Content: {input_data.reference_content or 'No reference content provided'}\n"
            f"{mvp_details}\n"
            f"Contact Count: {len(input_data.contacts)} contacts.\n"
            f"Sample Contact Details: {sample_contact.first_name if sample_contact else 'N/A'} "
            f"{sample_contact.last_name if sample_contact else 'N/A'} working as "
            f"{sample_contact.title if sample_contact else 'N/A'} at {sample_contact.company if sample_contact else 'N/A'}.\n\n"
            "Please perform any necessary research and output the campaign sequences."
        )

        state = {"messages": [("user", initial_message)]}
        logger.info("Invoking Deep Agent outreach loop...")
        final_state = await agent.ainvoke(state)

        # 7. Extract structured response
        raw = final_state.get("structured_response")
        if not raw or not isinstance(raw, OutreachLLMOutput):
            raise ValueError("Agent execution completed but did not produce a structured OutreachLLMOutput.")

        output = OutreachOutput(
            campaign=raw.campaign,
            requires_approval=raw.requires_approval,
            context_summary=(
                f"I drafted outreach \"{raw.campaign.name}\" with "
                f"{len(raw.campaign.messages)} messages — awaiting your approval."
            ),
            step_labels=steps,
            confidence="medium",
            suggested_next_agent=None,
            pre_populated=bool(getattr(input_data, "pre_populated", False)),
        )

        # 8. Save campaign and contacts to database
        advance_step(run_id, 2, steps[2], tool_name="save_campaign")
        campaign_id = save_campaign_to_db(founder_id, startup_id, run_id, input_data, output)

        # 9. Save output to Karnex Memory
        logger.info("Persisting campaign output to founder memory...")
        karnex_memory_write(
            founder_id=founder_id,
            namespace="outreach",
            key=f"campaign_{campaign_id or 'latest'}",
            value=output.model_dump(),
            tags=["campaign", "outreach", "executor", "email"]
        )

        # 10. Clean up temporary directories
        shutil.rmtree(sandbox_dir, ignore_errors=True)

        # 11. Complete agent run
        duration_ms = int((time.time() - start_time) * 1000)
        complete_agent_run(run_id, founder_id, output, "outreach_campaign", duration_ms=duration_ms)
        return output

    except Exception as e:
        logger.exception("Deep Agents Outreach pipeline failed")
        duration_ms = int((time.time() - start_time) * 1000)
        fail_agent_run(run_id, str(e), duration_ms=duration_ms)
        shutil.rmtree(sandbox_dir, ignore_errors=True)
        raise
