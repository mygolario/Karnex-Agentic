"""API endpoints for triggering and managing AI agent executions."""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from agents.analytics_insight import (
    AnalyticsInsightInput,
    AnalyticsInsightOutput,
    run_analytics_insight,
)
from agents.builder import BuilderInput, run_builder
from agents.competitive_landscape import (
    CompetitiveLandscapeInput,
    CompetitiveLandscapeOutput,
    run_competitive_landscape,
)
from agents.daily_standup.agent import run_daily_standup
from agents.daily_standup.schemas import DailyStandupInput, DailyStandupOutput
from agents.icp_definer import ICPDefinerInput, ICPDefinerOutput, run_icp_definer
from agents.idea_crystallizer import (
    IdeaCrystallizerInput,
    IdeaCrystallizerOutput,
    run_idea_crystallizer,
)
from agents.momentum_score import (
    MomentumScoreInput,
    MomentumScoreOutput,
    run_momentum_score,
)
from agents.outreach.agent import run_outreach
from agents.outreach.schemas import OutreachContact, OutreachInput
from agents.pain_transformer import (
    PainTransformerInput,
    PainTransformerOutput,
    run_pain_transformer,
)
from agents.research import ResearchInput, run_research
from agents.sprint_planner import (
    SprintPlannerInput,
    SprintPlannerOutput,
    run_sprint_planner,
)
from agents.war_room import WarRoomInput, WarRoomOutput, run_war_room
from agents.war_room.schemas import FounderCapacity
from agents.weekly_debrief import (
    WeeklyDebriefInput,
    WeeklyDebriefOutput,
    run_weekly_debrief,
)
from api.dependencies import check_premium_subscription, get_current_user
from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin
from shared.task_webhook import notify_task_complete

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

    task_id: Optional[str] = Field(None, description="Sprint task ID for completion webhook.")
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
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the Outreach Agent (Async)"
)
async def trigger_outreach(
    payload: OutreachRequest,
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
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").insert({
            "id": run_id,
            "founder_id": founder_id,
            "agent_id": "outreach-v1",
            "agent_version": "v1.0.0",
            "status": "queued",
            "input": payload.model_dump(),
            "triggered_by": "user",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "llm_model": settings.GEMINI_MODEL,
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log async outreach run start: {e}")

    agent_input = OutreachInput(
        founder_id=founder_id,
        startup_id=payload.startup_id,
        campaign_goal=payload.campaign_goal,
        target_audience=payload.target_audience,
        contacts=payload.contacts,
        channel=payload.channel,
        tone=payload.tone,
        sequence_length=payload.sequence_length,
        reference_content=payload.reference_content,
        task_id=payload.task_id,
        pre_populated=bool(payload.task_id),
    )

    background_tasks.add_task(run_outreach_async_wrapper, run_id, agent_input)
    return {"run_id": run_id, "status": "queued"}


class ResearchRequest(BaseModel):
    """API request payload for the Research Agent."""
    task_id: Optional[str] = Field(None, description="Sprint task ID for completion webhook.")
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
    """API request payload for the Builder / Karnex Forge Agent."""
    task_id: Optional[str] = Field(None, description="Sprint task ID for completion webhook.")
    task_type: str = Field(..., description="Type of build task.")
    specification: str = Field(..., description="Feature specification description.")
    tech_stack: Optional[BuilderTechStackRequest] = Field(None, description="Technical stack parameters.")
    existing_codebase_context: Optional[str] = Field(None, description="Context about the existing repository layout.")
    design_references: Optional[List[str]] = Field(None, description="Optional layout or styling specifications.")
    github_repo: Optional[str] = Field(None, description="User's target GitHub repository URL.")
    mode: Optional[str] = Field("auto", description="plan | ask | debug | build | auto")
    autonomy: Optional[str] = Field("founder", description="founder | developer")
    project_type: Optional[str] = Field("auto", description="web_nextjs | mobile_expo | api_service | infra_devops | fullstack_monorepo | auto")
    model_id: Optional[str] = Field(None, description="Forge model catalog id")
    auto_model: Optional[bool] = Field(False, description="Auto-select model per pipeline step")
    max_mode: Optional[bool] = Field(False, description="High-effort MAX mode")
    plan_approved: Optional[bool] = Field(False, description="Developer mode plan approval")
    war_room_task_id: Optional[str] = Field(None, description="War Room task link")
    preview_url: Optional[str] = Field(None, description="Live preview URL for debug mode")
    use_selected_model_all_steps: Optional[bool] = Field(False, description="Use selected model for all subagents")
    skip_github_push: Optional[bool] = Field(False, description="Developer: skip GitHub push")
    estimated_cost_usd: Optional[List[float]] = Field(None, description="Client cost estimate [low, high]")


# Async wrapper helper to execute Research Agent in background
async def run_research_async_wrapper(run_id: str, input_data: ResearchInput):
    try:
        supabase = get_supabase_admin()
        # Update run status to running
        supabase.table("agent_runs").update({
            "status": "running"
        }).eq("id", run_id).execute()

        # Run the agent with a 10-minute timeout (600 seconds)
        result = await asyncio.wait_for(run_research(input_data, run_id, supabase=supabase), timeout=600.0)

        # Update run status to success
        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", run_id).execute()

        out_dump = result.model_dump()
        await notify_task_complete(
            input_data.task_id,
            run_id,
            "success",
            agent_output=out_dump,
        )

    except asyncio.TimeoutError:
        logger.error(f"Research Agent run {run_id} timed out after 10 minutes.")
        try:
            supabase = get_supabase_admin()
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": "Execution timed out after 10 minutes.",
                "error_type": "timeout"
            }).eq("id", run_id).execute()
            await notify_task_complete(
                input_data.task_id,
                run_id,
                "error",
                error_message="Execution timed out after 10 minutes.",
            )
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
            await notify_task_complete(
                input_data.task_id,
                run_id,
                "error",
                error_message=str(e),
            )
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

        # Run the agent with a 10-minute timeout (600 seconds)
        result = await asyncio.wait_for(run_builder(input_data, run_id, supabase=supabase), timeout=600.0)

        # Update run status to success
        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", run_id).execute()

        out_dump = result.model_dump()
        await notify_task_complete(
            input_data.task_id,
            run_id,
            "success",
            agent_output=out_dump,
        )

    except asyncio.TimeoutError:
        logger.error(f"Builder Agent run {run_id} timed out after 10 minutes.")
        try:
            supabase = get_supabase_admin()
            from agents.forge.events import flush_all_forge_events
            await flush_all_forge_events(supabase, run_id)
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": "Execution timed out after 10 minutes.",
                "error_type": "timeout"
            }).eq("id", run_id).execute()
            await notify_task_complete(
                input_data.task_id,
                run_id,
                "error",
                error_message="Execution timed out after 10 minutes.",
            )
        except Exception as db_err:
            logger.error(f"Failed to log builder timeout: {db_err}")

    except Exception as e:
        logger.exception(f"Async Builder Agent execution failed for run {run_id}")
        try:
            supabase = get_supabase_admin()
            from agents.forge.events import flush_all_forge_events
            await flush_all_forge_events(supabase, run_id)
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": str(e),
                "error_type": "agent_failure"
            }).eq("id", run_id).execute()
            await notify_task_complete(
                input_data.task_id,
                run_id,
                "error",
                error_message=str(e),
            )
        except Exception as db_err:
            logger.error(f"Failed to log builder failure: {db_err}")


async def run_outreach_async_wrapper(run_id: str, input_data: OutreachInput):
    try:
        supabase = get_supabase_admin()
        supabase.table("agent_runs").update({"status": "running"}).eq("id", run_id).execute()

        result = await asyncio.wait_for(
            run_outreach(input_data, run_id=run_id, supabase=supabase),
            timeout=600.0,
        )

        supabase.table("agent_runs").update({
            "status": "success",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", run_id).execute()

        out_dump = result.model_dump()
        await notify_task_complete(
            input_data.task_id,
            run_id,
            "success",
            agent_output=out_dump,
        )

    except asyncio.TimeoutError:
        logger.error(f"Outreach Agent run {run_id} timed out.")
        try:
            supabase = get_supabase_admin()
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": "Execution timed out after 10 minutes.",
                "error_type": "timeout",
            }).eq("id", run_id).execute()
            await notify_task_complete(
                input_data.task_id,
                run_id,
                "error",
                error_message="Execution timed out after 10 minutes.",
            )
        except Exception as db_err:
            logger.error(f"Failed to log outreach timeout: {db_err}")

    except Exception as e:
        logger.exception(f"Async Outreach Agent execution failed for run {run_id}")
        try:
            supabase = get_supabase_admin()
            supabase.table("agent_runs").update({
                "status": "error",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": str(e),
                "error_type": "agent_failure",
            }).eq("id", run_id).execute()
            await notify_task_complete(
                input_data.task_id,
                run_id,
                "error",
                error_message=str(e),
            )
        except Exception as db_err:
            logger.error(f"Failed to log outreach failure: {db_err}")


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
        constraints=payload.constraints,
        task_id=payload.task_id,
        pre_populated=bool(payload.task_id),
    )

    # Queue task in FastAPI background tasks
    background_tasks.add_task(run_research_async_wrapper, run_id, agent_input)

    return {"run_id": run_id, "status": "queued"}


def _forge_llm_label_from_payload(payload: "BuilderRequest") -> str:
    from agents.forge.catalog import resolve_llm_model_label

    return resolve_llm_model_label(
        payload.model_id,
        auto_model=bool(payload.auto_model),
        max_mode=bool(payload.max_mode),
    )


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
            "llm_model": _forge_llm_label_from_payload(payload),
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
        github_repo=payload.github_repo,
        task_id=payload.task_id,
        pre_populated=bool(payload.task_id),
        mode=payload.mode or "auto",
        autonomy=payload.autonomy or "founder",
        project_type=payload.project_type or "auto",
        model_id=payload.model_id,
        auto_model=bool(payload.auto_model),
        max_mode=bool(payload.max_mode),
        plan_approved=bool(payload.plan_approved),
        war_room_task_id=payload.war_room_task_id,
        preview_url=payload.preview_url,
        use_selected_model_all_steps=bool(payload.use_selected_model_all_steps),
        skip_github_push=bool(payload.skip_github_push),
        estimated_cost_usd=payload.estimated_cost_usd,
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
    from agents.sprint_planner.schemas import (
        Phase as SchemaPhase,
        WeeklyGoal as SchemaWeeklyGoal,
    )
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


class IdeaCrystallizerRequest(BaseModel):
    selected_hypothesis: Dict[str, Any] = Field(..., description="Chosen hypothesis from pain-transformer.")
    founder_preferences: Optional[Dict[str, Any]] = None
    additional_context: Optional[str] = None


@router.post("/idea-crystallizer", response_model=IdeaCrystallizerOutput, status_code=status.HTTP_200_OK)
async def trigger_idea_crystallizer(
    payload: IdeaCrystallizerRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> IdeaCrystallizerOutput:
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(status_code=400, detail="Missing user identity.")
    try:
        return run_idea_crystallizer(IdeaCrystallizerInput(
            founder_id=founder_id,
            selected_hypothesis=payload.selected_hypothesis,
            founder_preferences=payload.founder_preferences,
            additional_context=payload.additional_context,
        ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CompetitiveLandscapeRequest(BaseModel):
    product_category: str
    key_features: List[str] = Field(default_factory=list)
    target_audience: str
    known_competitors: Optional[List[str]] = None


@router.post("/competitive-landscape", response_model=CompetitiveLandscapeOutput, status_code=status.HTTP_200_OK)
async def trigger_competitive_landscape(
    payload: CompetitiveLandscapeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> CompetitiveLandscapeOutput:
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(status_code=400, detail="Missing user identity.")
    try:
        return run_competitive_landscape(CompetitiveLandscapeInput(
            founder_id=founder_id,
            product_category=payload.product_category,
            key_features=payload.key_features,
            target_audience=payload.target_audience,
            known_competitors=payload.known_competitors,
        ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ICPDefinerRequest(BaseModel):
    product_brief: Dict[str, Any] = Field(default_factory=dict)
    competitive_landscape: Optional[Dict[str, Any]] = None
    founder_intuition: Optional[str] = None


@router.post("/icp-definer", response_model=ICPDefinerOutput, status_code=status.HTTP_200_OK)
async def trigger_icp_definer(
    payload: ICPDefinerRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ICPDefinerOutput:
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(status_code=400, detail="Missing user identity.")
    try:
        return run_icp_definer(ICPDefinerInput(
            founder_id=founder_id,
            product_brief=payload.product_brief,
            competitive_landscape=payload.competitive_landscape,
            founder_intuition=payload.founder_intuition,
        ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AnalyticsInsightRequest(BaseModel):
    data_source: str = "karnex_internal"
    time_range: str = "7d"
    focus_area: Optional[str] = "all"


@router.post("/analytics-insight", response_model=AnalyticsInsightOutput, status_code=status.HTTP_200_OK)
async def trigger_analytics_insight(
    payload: AnalyticsInsightRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> AnalyticsInsightOutput:
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(status_code=400, detail="Missing user identity.")
    try:
        return run_analytics_insight(AnalyticsInsightInput(
            founder_id=founder_id,
            data_source=payload.data_source,
            time_range=payload.time_range,
            focus_area=payload.focus_area,
        ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class WeeklyDebriefRequest(BaseModel):
    sprint_data: Dict[str, Any] = Field(default_factory=dict)
    standup_summaries: List[Dict[str, Any]] = Field(default_factory=list)
    agent_runs_this_week: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Optional[List[Dict[str, Any]]] = None


@router.post("/weekly-debrief", response_model=WeeklyDebriefOutput, status_code=status.HTTP_200_OK)
async def trigger_weekly_debrief(
    payload: WeeklyDebriefRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> WeeklyDebriefOutput:
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(status_code=400, detail="Missing user identity.")
    try:
        return run_weekly_debrief(WeeklyDebriefInput(
            founder_id=founder_id,
            sprint_data=payload.sprint_data,
            standup_summaries=payload.standup_summaries,
            agent_runs_this_week=payload.agent_runs_this_week,
            metrics=payload.metrics,
        ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/momentum-score", response_model=MomentumScoreOutput, status_code=status.HTTP_200_OK)
async def trigger_momentum_score(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> MomentumScoreOutput:
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(status_code=400, detail="Missing user identity.")
    try:
        return run_momentum_score(MomentumScoreInput(founder_id=founder_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
