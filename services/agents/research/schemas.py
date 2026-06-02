from typing import List, Optional
from pydantic import BaseModel, Field

class Finding(BaseModel):
    title: str = Field(..., description="Title of the research finding.")
    description: str = Field(..., description="Detailed description of the finding.")
    supporting_evidence: List[str] = Field(default=[], description="List of evidence snippets supporting this finding.")
    source_urls: List[str] = Field(default=[], description="List of source URLs for this finding.")
    confidence: str = Field("medium", description="Confidence level: 'low' | 'medium' | 'high'.")

class Source(BaseModel):
    title: str = Field(..., description="Title of the source publication or webpage.")
    url: str = Field(..., description="Full URL to the source.")

class DataTable(BaseModel):
    headers: List[str] = Field(..., description="Table column headers.")
    rows: List[List[str]] = Field(..., description="Table rows data.")
    title: Optional[str] = Field(None, description="Optional title for the table.")

class ResearchBrief(BaseModel):
    executive_summary: str = Field(..., description="2-3 sentence executive summary of the research.")
    key_findings: List[Finding] = Field(..., description="Key structured findings from the research.")
    data_tables: Optional[List[DataTable]] = Field(None, description="Optional structured data tables.")
    implications: List[str] = Field(..., description="What these findings mean for the founder.")
    recommended_actions: List[str] = Field(..., description="Recommended actions or next steps.")
    confidence: str = Field("medium", description="Overall research confidence: 'low' | 'medium' | 'high'.")
    sources: List[Source] = Field(..., description="List of all sources referenced in this brief.")
    gaps: List[str] = Field(..., description="Unresolved questions or details that could not be found.")

class ResearchInput(BaseModel):
    founder_id: str = Field(..., description="Unique ID of the founder triggering the agent.")
    research_question: str = Field(..., description="The main question/topic to research.")
    scope: str = Field("general", description="Scope of research: 'market' | 'competitor' | 'technology' | 'audience' | 'general'")
    depth: str = Field("standard", description="Depth of research: 'quick' | 'standard' | 'deep'")
    preferred_sources: Optional[List[str]] = Field(None, description="Optional list of domains/sources to prioritize.")
    constraints: Optional[str] = Field(None, description="Constraints or context guidelines.")

class ResearchOutput(BaseModel):
    research_brief: ResearchBrief = Field(..., description="The generated research brief.")
