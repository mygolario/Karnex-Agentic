from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase


class WeeklyDebriefInput(AgentInputBase):
    sprint_data: Dict[str, Any] = Field(default_factory=dict)
    standup_summaries: List[Dict[str, Any]] = Field(default_factory=list)
    agent_runs_this_week: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Optional[List[Dict[str, Any]]] = Field(None)


class MissedTarget(BaseModel):
    target: str
    root_cause: str


class Debrief(BaseModel):
    achievements: List[str] = Field(default_factory=list)
    missed_targets: List[MissedTarget] = Field(default_factory=list)
    key_learnings: List[str] = Field(default_factory=list)
    next_week_focus: List[str] = Field(default_factory=list)
    roadmap_adjustment: Optional[str] = None
    momentum_trend: str = "steady"
    overall_assessment: str = ""


class WeeklyDebriefLLMOutput(BaseModel):
    debrief: Debrief


class WeeklyDebriefOutput(AgentOutputBase):
    debrief: Debrief
