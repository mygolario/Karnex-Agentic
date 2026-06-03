from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase


class ICPDefinerInput(AgentInputBase):
    product_brief: Dict[str, Any] = Field(..., description="Product brief from idea crystallizer.")
    competitive_landscape: Optional[Dict[str, Any]] = Field(None, description="Optional competitive analysis.")
    founder_intuition: Optional[str] = Field(None, description="Founder's audience intuition.")


class ICPDefinerLLMOutput(BaseModel):
    icp: Dict[str, Any] = Field(..., description="ICP document.")
    personas: List[Dict[str, Any]] = Field(..., min_length=3, max_length=3)


class ICPDefinerOutput(AgentOutputBase):
    icp: Dict[str, Any] = Field(..., description="ICP document.")
    personas: List[Dict[str, Any]] = Field(..., min_length=3, max_length=3)
