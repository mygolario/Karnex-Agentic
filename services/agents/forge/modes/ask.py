"""Ask mode — Q&A without code changes."""

from __future__ import annotations

import asyncio
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from agents.builder.schemas import BuilderInput, BuilderOutput
from agents.forge.catalog import load_catalog
from agents.forge.events import emit_forge_event, flush_all_forge_events
from shared.agent_run_logging import complete_agent_run
from shared.agent_step_catalog import get_step_labels
from shared.openrouter_client import model_from_catalog_entry, resolve_step_model


async def run_ask_mode(
    input_data: BuilderInput,
    run_id: str,
    supabase: Any,
    *,
    context_block: str,
    prev_run_context: str,
) -> BuilderOutput:
    catalog = load_catalog()
    entry = resolve_step_model(
        catalog,
        model_id=getattr(input_data, "model_id", None),
        auto_model=bool(getattr(input_data, "auto_model", False)),
        max_mode=bool(getattr(input_data, "max_mode", False)),
        step_role="pro",
    )
    llm = model_from_catalog_entry(entry)

    await emit_forge_event(
        supabase,
        run_id,
        event_type="mode_detected",
        sender="builder",
        message="Ask mode — answering without modifying code.",
        model_id=entry.get("id"),
    )

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are the Karnex Forge Agent in Ask mode. Answer clearly for founders and developers. "
            "Do not generate full file contents. Use Karnex context when relevant. Be concise and actionable.\n\n"
            f"Previous run context:\n{prev_run_context}",
        ),
        ("user", "{question}\n\nKarnex context:\n{ctx}"),
    ])
    chain = prompt | llm
    res = await asyncio.to_thread(
        lambda: chain.invoke({
            "question": input_data.specification,
            "ctx": context_block,
        })
    )
    reply = res.content if hasattr(res, "content") else str(res)

    await emit_forge_event(supabase, run_id, event_type="log", sender="builder", message=reply[:500])

    steps = get_step_labels("builder-v1")
    output = BuilderOutput(
        files=[],
        summary=reply,
        context_summary=reply[:200],
        step_labels=steps,
        confidence="high",
        setup_instructions=["No setup required for Ask mode."],
        tests_included=False,
        deployment_ready=False,
        suggested_improvements=[],
        pre_populated=bool(getattr(input_data, "pre_populated", False)),
    )
    await flush_all_forge_events(supabase, run_id)
    complete_agent_run(run_id, input_data.founder_id, output, "builder_output")
    return output
