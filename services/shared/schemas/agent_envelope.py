"""Shared fields for Karnex agent input/output schemas."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class AgentInputBase(BaseModel):
    founder_id: str = Field(..., description="Unique ID of the founder.")
    pre_populated: bool = Field(
        False,
        description="True when input was pre-filled by sprint-planner for one-click execution.",
    )
    task_id: Optional[str] = Field(
        None,
        description="Sprint task ID when execution was triggered from a task card.",
    )


class AgentOutputBase(BaseModel):
    context_summary: str = Field(
        "",
        description="Short human-readable summary of what the agent did (< 2 sentences).",
    )
    step_labels: list[str] = Field(
        default_factory=list,
        description="Human-readable labels for each execution step / tool call.",
    )
    confidence: Literal["low", "medium", "high"] = Field(
        "medium",
        description="Overall confidence in the output.",
    )
    suggested_next_agent: Optional[str] = Field(
        None,
        description="Registry agent ID recommended as the next handoff.",
    )
    pre_populated: bool = Field(
        False,
        description="Echo of whether the run used pre-populated sprint task input.",
    )


# Alias used in product specs
BaseAgentOutput = AgentOutputBase
