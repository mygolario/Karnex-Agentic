from typing import Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase


class MomentumBreakdown(BaseModel):
    task_completion: int = 0
    consistency: int = 0
    agent_utilization: int = 0
    progress: int = 0


class MomentumScoreInput(AgentInputBase):
    tasks_completed_7d: Optional[int] = None
    tasks_total_7d: Optional[int] = None
    streak_days: Optional[int] = None
    agents_used_7d: Optional[int] = None
    standup_consistency_7d: Optional[int] = None
    revenue_progress: Optional[int] = None


class MomentumScoreOutput(AgentOutputBase):
    score: int = Field(..., ge=0, le=100)
    breakdown: MomentumBreakdown
    trend: str = Field("steady", description="rising | steady | falling")
    message: str = ""
