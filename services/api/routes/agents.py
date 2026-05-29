"""API endpoints for triggering and managing AI agent executions."""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from services.api.dependencies import get_current_user
from services.agents.pain_transformer import run_pain_transformer, PainTransformerInput, PainTransformerOutput
from services.agents.war_room import run_war_room, WarRoomInput, WarRoomOutput
from services.agents.war_room.schemas import FounderCapacity
from services.agents.daily_standup.schemas import DailyStandupInput, DailyStandupOutput
from services.agents.daily_standup.agent import run_daily_standup
from services.agents.outreach.schemas import OutreachInput, OutreachOutput, OutreachContact
from services.agents.outreach.agent import run_outreach

router = APIRouter(prefix="/v1/agents", tags=["Agents"])


class PainTransformerRequest(BaseModel):
    """API request payload for the Pain-to-Product Transformer agent."""

    pain_description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Founder's raw description of the frustration/problem."
    )
    industry_context: Optional[str] = Field(
        None,
        description="Optional high-level industry category/market segment."
    )
    existing_solutions: Optional[List[str]] = Field(
        None,
        description="Optional list of current workarounds/competitors tried."
    )


class WarRoomRequest(BaseModel):
    """API request payload for the 90-Day War Room agent."""

    product_brief: Dict[str, Any] = Field(
        ...,
        description="Crystallized product brief dictionary."
    )
    icp_document: Dict[str, Any] = Field(
        ...,
        description="Vivid target customer profile / buyer persona document."
    )
    founder_capacity: FounderCapacity = Field(
        ...,
        description="Available weekly hours, technical expertise level, and monthly budget."
    )
    start_date: Optional[str] = Field(
        None,
        description="Optional ISO 8601 start date for the plan. Defaults to current date."
    )


@router.post(
    "/pain-transformer",
    response_model=PainTransformerOutput,
    status_code=status.HTTP_200_OK,
    summary="Trigger the Pain-to-Product Transformer Agent"
)
async def trigger_pain_transformer(
    payload: PainTransformerRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> PainTransformerOutput:
    """Authenticates the request, resolves the founder ID from the JWT sub claim,
    injects it into the agent input, and runs the Pain-to-Product Transformer.
    """
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    agent_input = PainTransformerInput(
        pain_description=payload.pain_description,
        industry_context=payload.industry_context,
        existing_solutions=payload.existing_solutions,
        founder_id=founder_id
    )

    try:
        result = run_pain_transformer(agent_input)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )


@router.post(
    "/war-room",
    response_model=WarRoomOutput,
    status_code=status.HTTP_200_OK,
    summary="Trigger the 90-Day War Room Agent"
)
async def trigger_war_room(
    payload: WarRoomRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> WarRoomOutput:
    """Authenticates the request, resolves the founder ID from the JWT sub claim,
    injects it into the agent input, and runs the 90-Day War Room planner.
    """
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    agent_input = WarRoomInput(
        product_brief=payload.product_brief,
        icp_document=payload.icp_document,
        founder_capacity=payload.founder_capacity,
        start_date=payload.start_date,
        founder_id=founder_id
    )

    try:
        result = run_war_room(agent_input)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )


class DailyStandupRequest(BaseModel):
    """API request payload for the Daily Standup agent."""

    founder_update: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="Founder's daily status update text."
    )
    yesterday_tasks: Optional[List[str]] = Field(
        None,
        description="Tasks planned for yesterday."
    )
    today_sprint_tasks: Optional[List[str]] = Field(
        None,
        description="Sprint tasks scheduled for today."
    )


class OutreachRequest(BaseModel):
    """API request payload for the Outreach agent."""

    startup_id: str = Field(
        ...,
        description="Unique ID of the startup."
    )
    campaign_goal: str = Field(
        ...,
        description="The goal of the campaign."
    )
    target_audience: str = Field(
        ...,
        description="The target audience description."
    )
    contacts: List[OutreachContact] = Field(
        ...,
        description="List of contacts to reach."
    )
    channel: str = Field(
        "email",
        description="Communication channel: 'email' or 'linkedin'."
    )
    tone: Optional[str] = Field(
        "direct",
        description="Tone of the messages."
    )
    sequence_length: Optional[int] = Field(
        3,
        ge=1,
        le=5,
        description="Number of steps in the sequence."
    )
    reference_content: Optional[str] = Field(
        None,
        description="Optional additional reference content."
    )


@router.post(
    "/daily-standup",
    response_model=DailyStandupOutput,
    status_code=status.HTTP_200_OK,
    summary="Trigger the Daily Standup Agent"
)
async def trigger_daily_standup(
    payload: DailyStandupRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> DailyStandupOutput:
    """Authenticates the request, resolves the founder ID, and runs the Daily Standup agent."""
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    agent_input = DailyStandupInput(
        founder_id=founder_id,
        founder_update=payload.founder_update,
        yesterday_tasks=payload.yesterday_tasks,
        today_sprint_tasks=payload.today_sprint_tasks
    )

    try:
        result = await run_daily_standup(agent_input)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Daily Standup execution failed: {str(e)}"
        )


@router.post(
    "/outreach",
    response_model=OutreachOutput,
    status_code=status.HTTP_200_OK,
    summary="Trigger the Outreach Agent"
)
async def trigger_outreach(
    payload: OutreachRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> OutreachOutput:
    """Authenticates the request, resolves the founder ID, and runs the Outreach agent."""
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    agent_input = OutreachInput(
        founder_id=founder_id,
        startup_id=payload.startup_id,
        campaign_goal=payload.campaign_goal,
        target_audience=payload.target_audience,
        contacts=payload.contacts,
        channel=payload.channel,
        tone=payload.tone,
        sequence_length=payload.sequence_length,
        reference_content=payload.reference_content
    )

    try:
        result = await run_outreach(agent_input)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Outreach execution failed: {str(e)}"
        )
