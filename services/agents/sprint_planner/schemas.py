from typing import List, Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentOutputBase


class WeeklyGoal(BaseModel):
    week_number: int = Field(..., description="Week number.")
    focus: str = Field(..., description="Focus area for the week.")
    goals: List[str] = Field(..., description="Main goals to achieve.")

class Phase(BaseModel):
    phase_number: int = Field(..., description="Phase number (1, 2, or 3).")
    title: str = Field(..., description="Title of the phase.")
    theme: str = Field(..., description="Phase theme.")
    weekly_goals: List[WeeklyGoal] = Field(..., description="Weekly goals list for the phase.")

class TaskAgentConfig(BaseModel):
    agent_id: str = Field(..., description="ID of the agent to execute (e.g., 'builder-v1')")
    pre_populated_input: dict = Field(default={}, description="Input arguments and settings pre-configured for the agent run.")
    context_summary: str = Field(..., description="Short explanation of what the agent will do.")
    estimated_duration_seconds: int = Field(..., description="Estimated runtime in seconds.")
    step_labels: List[str] = Field(default_factory=list, description="Live checklist labels for one-click execution.")

class SprintTask(BaseModel):
    title: str = Field(..., description="Short title of the task.")
    description: str = Field(..., description="Detailed description of what needs to be done.")
    category: str = Field("other", description="Category: 'build' | 'research' | 'outreach' | 'content' | 'design' | 'finance' | 'other'")
    estimated_hours: int = Field(2, description="Estimated hours to complete.")
    priority: int = Field(3, ge=1, le=5, description="Priority rating (1=highest, 5=lowest).")
    definition_of_done: str = Field(..., description="Clear completion criteria for this task.")
    can_delegate_to_agent: Optional[str] = Field(None, description="Optional agent ID if this task can be automated.")
    dependencies: Optional[List[str]] = Field(None, description="List of task titles this task depends on.")
    agent_config: Optional[TaskAgentConfig] = Field(None, description="Configuration details for agent automated run.")
    execute_label: Optional[str] = Field(None, description="Label for execution button (e.g. 'Let Karnex pitch outreach').")

class Sprint(BaseModel):
    week_number: int = Field(..., description="Week number.")
    title: str = Field(..., description="Title of the sprint.")
    focus_area: str = Field(..., description="Main focus area.")
    tasks: List[SprintTask] = Field(..., description="List of tasks (max 7).")
    total_estimated_hours: int = Field(..., description="Sum of estimated hours.")
    stretch_goal: Optional[str] = Field(None, description="Optional stretch goal task.")

class SprintPlannerInput(BaseModel):
    founder_id: str = Field(..., description="Unique ID of the founder.")
    roadmap_phase: Phase = Field(..., description="Active roadmap phase definition.")
    week_number: int = Field(..., description="The week number of the roadmap to plan for.")
    founder_capacity_this_week: int = Field(20, description="Available founder hours for this week.")
    blockers: Optional[List[str]] = Field(default=[], description="Active blockers identified.")
    completed_last_week: Optional[List[str]] = Field(default=[], description="Tasks completed in the previous sprint.")
    deferred_tasks: Optional[List[str]] = Field(default=[], description="Unresolved tasks to roll over.")

class SprintPlannerLLMOutput(BaseModel):
    """Structured LLM payload (envelope fields added in agent)."""

    sprint: Sprint = Field(..., description="The generated weekly sprint plan.")


class SprintPlannerOutput(AgentOutputBase):
    sprint: Sprint = Field(..., description="The generated weekly sprint plan.")
