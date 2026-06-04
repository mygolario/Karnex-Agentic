from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase


class TechStack(BaseModel):
    framework: str = Field("nextjs", description="Frontend framework (e.g., 'nextjs').")
    styling: str = Field("tailwind", description="CSS styling library (e.g., 'tailwind').")
    database: str = Field("supabase", description="Database provider (e.g., 'supabase').")

class GeneratedFile(BaseModel):
    path: str = Field(..., description="Relative file path for the generated file.")
    content: str = Field(..., description="Full text code content of the file.")
    language: str = Field(..., description="Coding language of the file (e.g., 'typescript', 'sql', 'css').")
    description: str = Field(..., description="A short summary of what this file does.")

ForgeMode = Literal["plan", "ask", "debug", "build", "auto"]
ForgeAutonomy = Literal["founder", "developer"]
ForgeProjectType = Literal[
    "web_nextjs",
    "mobile_expo",
    "api_service",
    "infra_devops",
    "fullstack_monorepo",
    "auto",
]


class BuilderInput(AgentInputBase):
    task_type: str = Field(..., description="Type of task: 'landing_page' | 'auth_setup' | 'payment_integration' | 'dashboard' | 'api_endpoint' | 'custom'")
    specification: str = Field(..., description="Feature specification description from the roadmap or user.")
    tech_stack: Optional[TechStack] = Field(None, description="Technical stack parameters.")
    existing_codebase_context: Optional[str] = Field(None, description="Context about the existing repository layout.")
    design_references: Optional[List[str]] = Field(None, description="Optional list of layout styles or design specs.")
    github_repo: Optional[str] = Field(None, description="User's target GitHub repository URL.")
    mode: ForgeMode = Field("auto", description="Forge interaction mode.")
    autonomy: ForgeAutonomy = Field("founder", description="founder = autonomous; developer = gated steps.")
    project_type: ForgeProjectType = Field("auto", description="Build target stack template.")
    model_id: Optional[str] = Field(None, description="Catalog model id from ModelPicker.")
    auto_model: bool = Field(False, description="When true, orchestrator picks model per step.")
    max_mode: bool = Field(False, description="High-effort mode: stronger models and token ceiling.")
    plan_approved: bool = Field(False, description="Developer mode: user approved pending plan.")
    war_room_task_id: Optional[str] = Field(None, description="Optional War Room / sprint task link.")
    preview_url: Optional[str] = Field(None, description="Live preview URL for debug monitoring.")
    use_selected_model_all_steps: bool = Field(False, description="Developer: use selected model for subagents too.")
    skip_github_push: bool = Field(False, description="Developer: generate files without pushing to GitHub.")
    estimated_cost_usd: Optional[List[float]] = Field(None, description="Client-side cost estimate range [low, high].")

class BuilderOutput(AgentOutputBase):
    files: List[GeneratedFile] = Field(..., description="Generated file artifacts.")
    summary: str = Field(..., description="Summary of what code files were generated and why.")
    branch_name: Optional[str] = Field(None, description="Git feature branch name when code was pushed.")
    pr_url: Optional[str] = Field(None, description="GitHub pull request URL when available.")
    setup_instructions: List[str] = Field(..., description="Step-by-step instructions to run/deploy the code.")
    tests_included: bool = Field(False, description="Flag indicating if test suites were created.")
    deployment_ready: bool = Field(False, description="Flag indicating if code is ready to deploy directly.")
    suggested_improvements: List[str] = Field(default=[], description="Future performance/architecture recommendations.")
    pending_plan: Optional[Dict[str, Any]] = Field(None, description="Plan mode output awaiting approval.")
    debug_path: Optional[str] = Field(None, description="Debug mode path: paste_error | proactive | live_app.")
    detected_mode: Optional[str] = Field(None, description="Resolved forge mode after auto-detect.")
    project_type: Optional[str] = Field(None, description="Resolved project type for this run.")
    run_manifest: Optional[Dict[str, Any]] = Field(None, description="Reproducibility metadata for the run.")
    approval_required: bool = Field(False, description="True when developer gate blocks next step.")
    handoff_actions: List[str] = Field(
        default_factory=list,
        description="Let Karnex suggested next agents e.g. research-v1, outreach-v1.",
    )
