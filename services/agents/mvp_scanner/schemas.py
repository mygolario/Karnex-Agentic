from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase

class SitemapPage(BaseModel):
    path: str = Field(..., description="The URL path of the page, e.g. '/' or '/dashboard'")
    title: str = Field(..., description="The parsed page title")
    features: List[str] = Field(default_factory=list, description="Extracted features on this page")
    copy_snippets: Dict[str, str] = Field(default_factory=dict, description="Active headers, call-to-actions, and text snippets")

class MvpScannerInput(AgentInputBase):
    url: str = Field(..., description="The public website URL of the MVP to scan.")
    github_repo: Optional[str] = Field(None, description="Optional GitHub repository URL of the MVP.")
    mvp_source_platform: Optional[str] = Field("custom", description="lovable | v0 | base44 | custom")
    forge_project_id: Optional[str] = Field(None, description="Forge project ID for tracking session.")
    startup_id: Optional[str] = Field(None, description="Startup ID for memory and state synchronization.")

class MvpScannerOutput(AgentOutputBase):
    sitemap: List[SitemapPage] = Field(..., description="Crawled pages and extracted features/copy.")
    features: List[str] = Field(..., description="Overall inventory of must-have features identified.")
    tech_stack: Dict[str, Any] = Field(..., description="Identified tech stack dependencies and frameworks.")
    copy_bank: Dict[str, List[str]] = Field(..., description="Extracted copywriting slogans and pitches.")
    summary: str = Field(..., description="Detailed summary of the scanned MVP structure and context.")
    project_id: Optional[str] = Field(None, description="Associated forge project ID.")
