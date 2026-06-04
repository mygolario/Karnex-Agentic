"""Build mode — full codegen pipeline (supervisor + subagents)."""

from __future__ import annotations

from typing import Any

from agents.builder.schemas import BuilderInput, BuilderOutput
from agents.builder.agent import run_build_pipeline


async def run_build_mode(
    input_data: BuilderInput,
    run_id: str,
    supabase: Any,
    *,
    context_block: str,
    project_type: str,
    prev_run_context: str,
) -> BuilderOutput:
    return await run_build_pipeline(
        input_data,
        run_id,
        supabase,
        karnex_context=context_block,
        project_type=project_type,
        prev_run_context=prev_run_context,
    )
