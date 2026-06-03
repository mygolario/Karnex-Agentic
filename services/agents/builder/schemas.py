from typing import List, Optional

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

class BuilderInput(AgentInputBase):
    task_type: str = Field(..., description="Type of task: 'landing_page' | 'auth_setup' | 'payment_integration' | 'dashboard' | 'api_endpoint' | 'custom'")
    specification: str = Field(..., description="Feature specification description from the roadmap or user.")
    tech_stack: Optional[TechStack] = Field(None, description="Technical stack parameters.")
    existing_codebase_context: Optional[str] = Field(None, description="Context about the existing repository layout.")
    design_references: Optional[List[str]] = Field(None, description="Optional list of layout styles or design specs.")
    github_repo: Optional[str] = Field(None, description="User's target GitHub repository URL.")

class BuilderOutput(AgentOutputBase):
    files: List[GeneratedFile] = Field(..., description="Generated file artifacts.")
    summary: str = Field(..., description="Summary of what code files were generated and why.")
    branch_name: Optional[str] = Field(None, description="Git feature branch name when code was pushed.")
    pr_url: Optional[str] = Field(None, description="GitHub pull request URL when available.")
    setup_instructions: List[str] = Field(..., description="Step-by-step instructions to run/deploy the code.")
    tests_included: bool = Field(False, description="Flag indicating if test suites were created.")
    deployment_ready: bool = Field(False, description="Flag indicating if code is ready to deploy directly.")
    suggested_improvements: List[str] = Field(default=[], description="Future performance/architecture recommendations.")
