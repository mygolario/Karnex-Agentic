"""API endpoints for triggering and managing AI agent executions."""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone
from shared.logger import logger
from shared.supabase_client import get_supabase_admin
from shared.config import settings

from api.dependencies import get_current_user, check_premium_subscription
from agents.pain_transformer import run_pain_transformer, PainTransformerInput, PainTransformerOutput
from agents.war_room import run_war_room, WarRoomInput, WarRoomOutput
from agents.war_room.schemas import FounderCapacity
from agents.daily_standup.schemas import DailyStandupInput, DailyStandupOutput
from agents.daily_standup.agent import run_daily_standup
from agents.outreach.schemas import OutreachInput, OutreachOutput, OutreachContact
from agents.outreach.agent import run_outreach
from agents.research import ResearchInput, ResearchOutput, run_research
from agents.builder import BuilderInput, BuilderOutput, run_builder
from agents.sprint_planner import SprintPlannerInput, SprintPlannerOutput, run_sprint_planner

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
        detail = str(e)
        if "402" in detail and "credits" in detail.lower():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    "OpenRouter credits are insufficient for this request. "
                    "Add credits at https://openrouter.ai/settings/credits "
                    "or lower OPENROUTER_MAX_TOKENS on the agent service."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {detail}",
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
    current_user: Dict[str, Any] = Depends(check_premium_subscription)
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


class ResearchRequest(BaseModel):
    """API request payload for the Research Agent."""
    research_question: str = Field(..., min_length=5, description="The main question/topic to research.")
    scope: Optional[str] = Field("general", description="Scope of research: 'market' | 'competitor' | 'technology' | 'audience' | 'general'")
    depth: Optional[str] = Field("standard", description="Depth of research: 'quick' | 'standard' | 'deep'")
    preferred_sources: Optional[List[str]] = Field(None, description="Optional domains to prioritize.")
    constraints: Optional[str] = Field(None, description="Constraints/context guidelines.")


class BuilderTechStackRequest(BaseModel):
    framework: str = Field("nextjs", description="Frontend framework.")
    styling: str = Field("tailwind", description="CSS framework.")
    database: str = Field("supabase", description="Database provider.")


class BuilderRequest(BaseModel):
    """API request payload for the Builder Agent."""
    task_type: str = Field(..., description="Type of build task.")
    specification: str = Field(..., description="Feature specification description.")
    tech_stack: Optional[BuilderTechStackRequest] = Field(None, description="Technical stack parameters.")
    existing_codebase_context: Optional[str] = Field(None, description="Context about the existing repository layout.")
    design_references: Optional[List[str]] = Field(None, description="Optional layout or styling specifications.")
    github_repo: Optional[str] = Field(None, description="User's target GitHub repository URL.")


# Async wrapper helper to execute Research Agent in background
async def run_research_async_wrapper(run_id: str, input_data: ResearchInput):
    try:
        supabase = get_supabase_admin()
        # Update run status to running
        supabase.table("agent_runs").update({
            "status": "running"
        }).eq("id", run_id).execute()

        # Run the agent with a 5-minute timeout (300 seconds)
        result = await asyncio.wait_for(run_research(input_data, run_id, supabase=supabase), timeout=300.0)

        # Update run status to success
        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", run_id).execute()

        # Save output to agent_outputs
        supabase.table("agent_outputs").insert({
            "agent_run_id": run_id,
            "founder_id": input_data.founder_id,
            "output_type": "research_brief",
            "output": result.model_dump()
        }).execute()

    except asyncio.TimeoutError:
        logger.error(f"Research Agent run {run_id} timed out after 5 minutes.")
        try:
            supabase = get_supabase_admin()
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": "Execution timed out after 5 minutes.",
                "error_type": "timeout"
            }).eq("id", run_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to log research timeout: {db_err}")

    except Exception as e:
        logger.exception(f"Async Research Agent execution failed for run {run_id}")
        try:
            supabase = get_supabase_admin()
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": str(e),
                "error_type": "agent_failure"
            }).eq("id", run_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to log research failure: {db_err}")


# Async wrapper helper to execute Builder Agent in background
async def run_builder_async_wrapper(run_id: str, input_data: BuilderInput):
    try:
        supabase = get_supabase_admin()
        # Update run status to running
        supabase.table("agent_runs").update({
            "status": "running"
        }).eq("id", run_id).execute()

        # Run the agent with a 5-minute timeout (300 seconds)
        result = await asyncio.wait_for(run_builder(input_data, run_id, supabase=supabase), timeout=300.0)

        # Update run status to success
        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", run_id).execute()

        # Save output to agent_outputs
        supabase.table("agent_outputs").insert({
            "agent_run_id": run_id,
            "founder_id": input_data.founder_id,
            "output_type": "builder_output",
            "output": result.model_dump()
        }).execute()

    except asyncio.TimeoutError:
        logger.error(f"Builder Agent run {run_id} timed out after 5 minutes.")
        try:
            supabase = get_supabase_admin()
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": "Execution timed out after 5 minutes.",
                "error_type": "timeout"
            }).eq("id", run_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to log builder timeout: {db_err}")

    except Exception as e:
        logger.exception(f"Async Builder Agent execution failed for run {run_id}")
        try:
            supabase = get_supabase_admin()
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": str(e),
                "error_type": "agent_failure"
            }).eq("id", run_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to log builder failure: {db_err}")


@router.post(
    "/research",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the Research Agent (Async)"
)
async def trigger_research(
    payload: ResearchRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(check_premium_subscription)
):
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    run_id = str(uuid.uuid4())
    # Log the queued start to database
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").insert({
            "id": run_id,
            "founder_id": founder_id,
            "agent_id": "research-v1",
            "agent_version": "v1.0.0",
            "status": "queued",
            "input": payload.model_dump(),
            "triggered_by": "user",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "llm_model": settings.GEMINI_MODEL
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log async research run start: {e}")

    # Build input schema
    agent_input = ResearchInput(
        founder_id=founder_id,
        research_question=payload.research_question,
        scope=payload.scope,
        depth=payload.depth,
        preferred_sources=payload.preferred_sources,
        constraints=payload.constraints
    )

    # Queue task in FastAPI background tasks
    background_tasks.add_task(run_research_async_wrapper, run_id, agent_input)

    return {"run_id": run_id, "status": "queued"}


@router.post(
    "/builder",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the Builder Agent (Async)"
)
async def trigger_builder(
    payload: BuilderRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(check_premium_subscription)
):
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    run_id = str(uuid.uuid4())
    # Log the queued start to database
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").insert({
            "id": run_id,
            "founder_id": founder_id,
            "agent_id": "builder-v1",
            "agent_version": "v1.0.0",
            "status": "queued",
            "input": payload.model_dump(),
            "triggered_by": "user",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "llm_model": settings.GEMINI_MODEL
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log async builder run start: {e}")

    stack = None
    if payload.tech_stack:
        from agents.builder.schemas import TechStack
        stack = TechStack(
            framework=payload.tech_stack.framework,
            styling=payload.tech_stack.styling,
            database=payload.tech_stack.database
        )

    # Build input schema
    agent_input = BuilderInput(
        founder_id=founder_id,
        task_type=payload.task_type,
        specification=payload.specification,
        tech_stack=stack,
        existing_codebase_context=payload.existing_codebase_context,
        design_references=payload.design_references,
        github_repo=payload.github_repo
    )

    # Queue task in FastAPI background tasks
    background_tasks.add_task(run_builder_async_wrapper, run_id, agent_input)

    return {"run_id": run_id, "status": "queued"}


class WeeklyGoalRequest(BaseModel):
    week_number: int
    focus: str
    goals: List[str]


class RoadmapPhaseRequest(BaseModel):
    phase_number: int
    title: str
    theme: str
    weekly_goals: List[WeeklyGoalRequest]


class SprintPlannerRequest(BaseModel):
    """API request payload for the Sprint Planner Agent."""
    roadmap_phase: RoadmapPhaseRequest = Field(..., description="Active roadmap phase definition.")
    week_number: int = Field(..., description="The week number of the roadmap to plan for.")
    founder_capacity_this_week: int = Field(20, description="Available founder hours for this week.")
    blockers: Optional[List[str]] = Field(default=[], description="Active blockers identified.")
    completed_last_week: Optional[List[str]] = Field(default=[], description="Tasks completed in the previous sprint.")
    deferred_tasks: Optional[List[str]] = Field(default=[], description="Unresolved tasks to roll over.")


@router.post(
    "/sprint-planner",
    response_model=SprintPlannerOutput,
    status_code=status.HTTP_200_OK,
    summary="Trigger the Sprint Planner Agent"
)
async def trigger_sprint_planner(
    payload: SprintPlannerRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> SprintPlannerOutput:
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    # Convert request phase format to schemas phase format
    from agents.sprint_planner.schemas import Phase as SchemaPhase, WeeklyGoal as SchemaWeeklyGoal
    weekly_goals_list = []
    for wg in payload.roadmap_phase.weekly_goals:
        weekly_goals_list.append(SchemaWeeklyGoal(
            week_number=wg.week_number,
            focus=wg.focus,
            goals=wg.goals
        ))
        
    s_phase = SchemaPhase(
        phase_number=payload.roadmap_phase.phase_number,
        title=payload.roadmap_phase.title,
        theme=payload.roadmap_phase.theme,
        weekly_goals=weekly_goals_list
    )

    agent_input = SprintPlannerInput(
        founder_id=founder_id,
        roadmap_phase=s_phase,
        week_number=payload.week_number,
        founder_capacity_this_week=payload.founder_capacity_this_week,
        blockers=payload.blockers,
        completed_last_week=payload.completed_last_week,
        deferred_tasks=payload.deferred_tasks
    )

    try:
        result = run_sprint_planner(agent_input)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sprint Planner execution failed: {str(e)}"
        )
