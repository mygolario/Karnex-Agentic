"""Plan mode — architecture and file list without writes."""

from __future__ import annotations

import asyncio
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from agents.builder.schemas import BuilderInput, BuilderOutput
from agents.forge.catalog import load_catalog
from agents.forge.events import emit_forge_event, flush_all_forge_events
from agents.forge.project_types import resolve_project_type, stack_prompt_suffix
from shared.agent_run_logging import complete_agent_run
from shared.agent_step_catalog import get_step_labels
from shared.openrouter_client import invoke_structured_with_retry, model_from_catalog_entry, resolve_step_model


class PlanOutput(BaseModel):
    summary_of_approach: str = Field(..., description="Architecture summary")
    files_planned: list[str] = Field(..., description="Relative paths to generate")
    risks: list[str] = Field(default_factory=list)
    estimated_minutes: int = Field(15, description="Rough effort estimate")
    status_message: str = Field(..., description="User-facing plan summary")


async def run_plan_mode(
    input_data: BuilderInput,
    run_id: str,
    supabase: Any,
    *,
    context_block: str,
    project_type: str,
) -> BuilderOutput:
    catalog = load_catalog()
    entry = resolve_step_model(
        catalog,
        model_id=getattr(input_data, "model_id", None),
        auto_model=bool(getattr(input_data, "auto_model", False)),
        max_mode=bool(getattr(input_data, "max_mode", False)),
        step_role="supervisor",
    )
    llm = model_from_catalog_entry(entry)

    await emit_forge_event(
        supabase,
        run_id,
        event_type="plan_step",
        sender="design",
        message="Drafting architecture plan (no code writes in Plan mode).",
        model_id=entry.get("id"),
    )

    stack = input_data.tech_stack.model_dump() if input_data.tech_stack else {}
    suffix = stack_prompt_suffix(project_type, stack)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are the Karnex Forge planning agent. Produce a clear build plan only — do not write full file contents. "
            "Include architecture, file list, risks, and time estimate.",
        ),
        (
            "user",
            "Specification:\n{spec}\n\nKarnex context:\n{ctx}\n\n{suffix}",
        ),
    ])
    chain = prompt | llm.with_structured_output(PlanOutput)
    _plan_input = {"spec": input_data.specification, "ctx": context_block, "suffix": suffix}
    plan: PlanOutput = await asyncio.to_thread(
        lambda: invoke_structured_with_retry(chain, _plan_input)
    )

    summary = (
        f"**Plan ready** (no code written yet)\n\n"
        f"{plan.status_message}\n\n"
        f"**Approach:** {plan.summary_of_approach}\n\n"
        f"**Files ({len(plan.files_planned)}):** "
        + ", ".join(plan.files_planned[:12])
        + ("…" if len(plan.files_planned) > 12 else "")
        + f"\n\n**Risks:** " + "; ".join(plan.risks[:5])
        + f"\n\n**Est. time:** ~{plan.estimated_minutes} min. "
        "Switch to Build mode or approve plan (Developer mode) to execute."
    )

    await emit_forge_event(
        supabase,
        run_id,
        event_type="plan_step",
        sender="design",
        message=plan.status_message,
        files_planned=plan.files_planned,
    )

    steps = get_step_labels("builder-v1")
    output = BuilderOutput(
        files=[],
        summary=summary,
        context_summary=plan.summary_of_approach[:200],
        step_labels=steps,
        confidence="high",
        setup_instructions=["Approve plan and run in Build mode to generate files."],
        tests_included=False,
        deployment_ready=False,
        suggested_improvements=plan.risks,
        pre_populated=bool(getattr(input_data, "pre_populated", False)),
        pending_plan={
            "summary_of_approach": plan.summary_of_approach,
            "status_message": plan.status_message,
            "files_planned": plan.files_planned,
            "risks": plan.risks,
            "estimated_minutes": plan.estimated_minutes,
        },
    )
    await flush_all_forge_events(supabase, run_id)
    complete_agent_run(run_id, input_data.founder_id, output, "builder_output")
    return output
