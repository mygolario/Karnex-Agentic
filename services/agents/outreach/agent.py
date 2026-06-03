"""Core implementation of the Outreach agent."""

import time
from typing import Any, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.outreach.prompts import OUTREACH_SYSTEM_PROMPT
from agents.outreach.schemas import OutreachInput, OutreachLLMOutput, OutreachOutput
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
from shared.supabase_client import get_supabase_admin

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

        # 1. Map messages and ab_variants into message_templates list
        message_templates = []
        for msg in output.campaign.messages:
            message_templates.append(msg.model_dump())
        if output.campaign.ab_variants:
            for msg in output.campaign.ab_variants:
                message_templates.append(msg.model_dump())

        # 2. Insert campaign
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

        # 3. Insert contacts
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
    """Executes the Outreach agent pipeline.

    Takes contact details, campaign goal, target audience context and invokes Gemini 2.5 Pro
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

    try:
        advance_step(run_id, 0, steps[0], tool_name="web_search")
        grounding_context = ""
        if input_data.contacts:
            sample_contact = input_data.contacts[0]
            query = f"{sample_contact.company or ''} {sample_contact.title or ''} company profile".strip()
            if query:
                grounding_context = web_search(query)

        advance_step(run_id, 1, steps[1], tool_name="llm_compose")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS,
            default_headers={
                "HTTP-Referer": "https://karnex.ai",
                "X-Title": "Karnex"
            },
            temperature=0.7
        )
        structured_llm = llm.with_structured_output(OutreachLLMOutput)

        # Step 3: Setup prompt templates
        prompt = ChatPromptTemplate.from_messages([
            ("system", OUTREACH_SYSTEM_PROMPT),
            ("user", (
                "Here is the context for the outreach campaign:\n"
                "Campaign Goal: {campaign_goal}\n"
                "Target Audience: {target_audience}\n"
                "Tone Preferred: {tone}\n"
                "Sequence Length: {sequence_length}\n"
                "Reference Content: {reference_content}\n\n"
                "Here is the contact list size: {contact_count} contacts.\n"
                "Sample Contact 1 details: {first_name} {last_name} working as {title} at {company}.\n\n"
                "Grounding web search results for the target context:\n"
                "{grounding_context}\n\n"
                "Please compose the email outreach campaign template sequence (Variant A), A/B variants for Step 1 (Variant B), "
                "and schedule recommendation in JSON format matching the schema."
            ))
        ])

        # Step 4: Execute chain
        sample_contact = input_data.contacts[0] if input_data.contacts else None
        chain = prompt | structured_llm
        raw_output: OutreachLLMOutput = chain.invoke({
            "campaign_goal": input_data.campaign_goal,
            "target_audience": input_data.target_audience,
            "tone": input_data.tone or "direct",
            "sequence_length": input_data.sequence_length or 3,
            "reference_content": input_data.reference_content or "No reference content provided",
            "contact_count": len(input_data.contacts),
            "first_name": sample_contact.first_name if sample_contact else "N/A",
            "last_name": sample_contact.last_name if sample_contact else "N/A",
            "title": sample_contact.title if sample_contact else "N/A",
            "company": sample_contact.company if sample_contact else "N/A",
            "grounding_context": grounding_context or "No search context necessary"
        })

        output = OutreachOutput(
            campaign=raw_output.campaign,
            requires_approval=raw_output.requires_approval,
            context_summary=(
                f"I drafted outreach \"{raw_output.campaign.name}\" with "
                f"{len(raw_output.campaign.messages)} messages — awaiting your approval."
            ),
            step_labels=steps,
            confidence="medium",
            suggested_next_agent=None,
            pre_populated=bool(getattr(input_data, "pre_populated", False)),
        )

        advance_step(run_id, 2, steps[2], tool_name="save_campaign")
        campaign_id = save_campaign_to_db(founder_id, startup_id, run_id, input_data, output)

        # Step 6: Save output to Karnex Memory
        karnex_memory_write(
            founder_id=founder_id,
            namespace="outreach",
            key=f"campaign_{campaign_id or 'latest'}",
            value=output.model_dump(),
            tags=["campaign", "outreach", "executor", "email"]
        )

        complete_agent_run(
            run_id, founder_id, output, "outreach_campaign",
            duration_ms=int((time.time() - start_time) * 1000),
        )
        return output

    except Exception as e:
        logger.exception("Error executing Outreach agent")
        fail_agent_run(run_id, str(e), duration_ms=int((time.time() - start_time) * 1000))
        raise
