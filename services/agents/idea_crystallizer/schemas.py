from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase


class IdeaCrystallizerInput(AgentInputBase):
    selected_hypothesis: Dict[str, Any] = Field(..., description="Product hypothesis from pain-transformer.")
    founder_preferences: Optional[Dict[str, Any]] = Field(None, description="Tech, budget, timeline preferences.")
    additional_context: Optional[str] = Field(None, description="Extra founder notes.")


class IdeaCrystallizerLLMOutput(BaseModel):
    product_brief: Dict[str, Any] = Field(..., description="Structured product brief.")


class IdeaCrystallizerOutput(AgentOutputBase):
    product_brief: Dict[str, Any] = Field(..., description="Structured product brief.")
