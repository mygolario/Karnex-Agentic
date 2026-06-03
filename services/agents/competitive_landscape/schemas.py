from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase


class CompetitiveLandscapeInput(AgentInputBase):
    product_category: str = Field(..., description="Product category.")
    key_features: List[str] = Field(default_factory=list, description="Key features to compare.")
    target_audience: str = Field(..., description="Target audience description.")
    known_competitors: Optional[List[str]] = Field(None, description="Optional competitor names.")


class CompetitiveLandscapeLLMOutput(BaseModel):
    competitors: List[Dict[str, Any]] = Field(default_factory=list)
    competitive_matrix: Dict[str, Any] = Field(default_factory=dict)
    gaps: List[str] = Field(default_factory=list)
    positioning_recommendations: List[str] = Field(default_factory=list)
    pricing_intelligence: Dict[str, Any] = Field(default_factory=dict)


class CompetitiveLandscapeOutput(AgentOutputBase):
    competitors: List[Dict[str, Any]] = Field(default_factory=list)
    competitive_matrix: Dict[str, Any] = Field(default_factory=dict)
    gaps: List[str] = Field(default_factory=list)
    positioning_recommendations: List[str] = Field(default_factory=list)
    pricing_intelligence: Dict[str, Any] = Field(default_factory=dict)
