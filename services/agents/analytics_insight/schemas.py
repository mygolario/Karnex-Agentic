from typing import List, Optional

from pydantic import BaseModel, Field

from shared.schemas.agent_envelope import AgentInputBase, AgentOutputBase


class AnalyticsInsightInput(AgentInputBase):
    data_source: str = Field("karnex_internal", description="posthog | karnex_internal")
    time_range: str = Field("7d", description="7d | 14d | 30d | 90d")
    focus_area: Optional[str] = Field("all", description="growth | engagement | revenue | conversion | all")


class MetricSummary(BaseModel):
    name: str
    value: str
    change: Optional[str] = None


class Anomaly(BaseModel):
    metric: str
    description: str
    severity: str = "medium"


class AnalyticsInsights(BaseModel):
    metrics_summary: List[MetricSummary] = Field(default_factory=list)
    anomalies: List[Anomaly] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    so_what: str = ""


class AnalyticsInsightLLMOutput(BaseModel):
    insights: AnalyticsInsights


class AnalyticsInsightOutput(AgentOutputBase):
    insights: AnalyticsInsights
