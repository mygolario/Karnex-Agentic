"""Debug mode — paste error, proactive scan, live-app hints, patch apply."""

from __future__ import annotations

import asyncio
import re
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from agents.builder.schemas import BuilderInput, BuilderOutput, GeneratedFile
from agents.forge.catalog import load_catalog
from agents.forge.events import emit_forge_event, flush_all_forge_events
from agents.forge.linter import run_forge_linter
from shared.agent_run_logging import complete_agent_run
from shared.agent_step_catalog import get_step_labels
from shared.openrouter_client import model_from_catalog_entry, resolve_step_model

_STACK_RE = re.compile(r"Traceback|Error:|at .+\(.+:\d+", re.I)


class DebugDiagnosis(BaseModel):
    root_cause: str = Field(..., description="Likely root cause")
    affected_files: list[str] = Field(default_factory=list)
    fix_steps: list[str] = Field(..., description="Ordered fix steps")
    patch_summary: str = Field(..., description="What to change")
    debug_path: str = Field(..., description="paste_error | proactive | live_app")


class DebugFilePatch(BaseModel):
    path: str = Field(..., description="Relative file path to create or update")
    content: str = Field(..., description="Full patched file content")
    language: str = Field("typescript", description="File language")
    description: str = Field("", description="What this patch fixes")


class DebugPatchPlan(BaseModel):
    diagnosis: DebugDiagnosis
    patches: list[DebugFilePatch] = Field(default_factory=list)


def _detect_debug_path(spec: str, preview_url: str | None) -> str:
    if preview_url and "preview" in (preview_url or "").lower():
        return "live_app"
    if _STACK_RE.search(spec):
        return "paste_error"
    lower = spec.lower()
    if any(k in lower for k in ("scan", "proactive", "find bugs", "lint")):
        return "proactive"
    return "paste_error"


async def run_debug_mode(
    input_data: BuilderInput,
    run_id: str,
    supabase: Any,
    *,
    context_block: str,
    preview_url: str | None = None,
    autonomy: str = "founder",
    plan_approved: bool = False,
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
    path = _detect_debug_path(input_data.specification, preview_url)

    await emit_forge_event(
        supabase,
        run_id,
        event_type="subagent_spawn",
        sender="debug",
        message=f"Debug agent started ({path}).",
        debug_path=path,
    )

    path_instructions = {
        "paste_error": "User pasted a stack trace or error. Map to files and produce real code patches.",
        "proactive": "Proactive scan: find bugs, missing error handling, type issues; produce patches where possible.",
        "live_app": (
            f"Live app debugging. Preview URL: {preview_url or 'not connected'}. "
            "Infer runtime failure modes and suggest patches."
        ),
    }

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are Karnex Forge Debug mode. Diagnose with evidence and output concrete file patches. "
            "Never recommend pushing to production without review. "
            f"{path_instructions.get(path, path_instructions['paste_error'])}",
        ),
        (
            "user",
            "Report / error:\n{spec}\n\nKarnex context:\n{ctx}\n\nCodebase:\n{codebase}",
        ),
    ])
    chain = prompt | llm.with_structured_output(DebugPatchPlan)
    plan: DebugPatchPlan = await asyncio.to_thread(
        lambda: chain.invoke({
            "spec": input_data.specification,
            "ctx": context_block,
            "codebase": input_data.existing_codebase_context or "No local tree provided.",
        })
    )
    diag = plan.diagnosis
    diag.debug_path = path

    summary = (
        f"**Debug ({diag.debug_path})**\n\n"
        f"**Root cause:** {diag.root_cause}\n\n"
        f"**Files:** {', '.join(diag.affected_files) or 'TBD'}\n\n"
        f"**Fix steps:**\n"
        + "\n".join(f"- {s}" for s in diag.fix_steps)
        + f"\n\n**Patch plan:** {diag.patch_summary}"
    )

    await emit_forge_event(
        supabase,
        run_id,
        event_type="plan_step",
        sender="debug",
        message=diag.patch_summary,
        debug_path=diag.debug_path,
    )

    files: list[GeneratedFile] = []
    can_apply = autonomy == "founder" or plan_approved

    if not can_apply:
        await emit_forge_event(
            supabase,
            run_id,
            event_type="approval_required",
            sender="system",
            message="Developer mode: approve debug patch plan before applying code changes.",
            approval_type="debug_patch",
        )
    elif plan.patches:
        await emit_forge_event(
            supabase,
            run_id,
            event_type="subagent_progress",
            sender="debug",
            message=f"Applying {len(plan.patches)} patch file(s)…",
        )
        for patch in plan.patches[:6]:
            files.append(
                GeneratedFile(
                    path=patch.path,
                    content=patch.content,
                    language=patch.language,
                    description=patch.description or "Debug patch",
                )
            )
            await emit_forge_event(
                supabase,
                run_id,
                event_type="artifact",
                sender="debug",
                message=f"Patched {patch.path}",
                fileCreated=patch.path,
            )
        lint_result = run_forge_linter(files)
        if lint_result.issues:
            summary += f"\n\n**Linter:** {len(lint_result.issues)} note(s) after patch."
    else:
        for fp in diag.affected_files[:3]:
            files.append(
                GeneratedFile(
                    path=fp if "." in fp else f"{fp}.debug.md",
                    content=f"# Debug notes\n\n{diag.patch_summary}\n\n" + "\n".join(diag.fix_steps),
                    language="markdown",
                    description="Debug guidance",
                )
            )

    steps = get_step_labels("builder-v1")
    output = BuilderOutput(
        files=files,
        summary=summary,
        context_summary=diag.root_cause[:200],
        step_labels=steps,
        confidence="medium",
        setup_instructions=diag.fix_steps,
        tests_included=False,
        deployment_ready=bool(files) and can_apply,
        suggested_improvements=[],
        pre_populated=bool(getattr(input_data, "pre_populated", False)),
        debug_path=diag.debug_path,
        approval_required=not can_apply,
    )
    await flush_all_forge_events(supabase, run_id)
    complete_agent_run(run_id, input_data.founder_id, output, "builder_output")
    return output
