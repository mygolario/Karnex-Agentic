"""API endpoints for managing outreach campaigns and contacts."""

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from agents.outreach.gmail_helpers import (
    GmailNotConnectedError,
    GmailTokenExpiredError,
    sync_campaign_drafts,
)
from api.dependencies import get_current_user
from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin

router = APIRouter(prefix="/v1/campaigns", tags=["Campaigns"])


async def _sync_drafts_background(
    campaign_id: str,
    founder_id: str,
    supabase: Any,
) -> None:
    """
    Background wrapper for sync_campaign_drafts.
    Updates agent_runs table with outcome for observability.
    Never raises — all exceptions are caught and logged.
    """
    try:
        summary = await sync_campaign_drafts(
            campaign_id=campaign_id,
            founder_id=founder_id,
            supabase_client=supabase,
            logger=logger,
        )

        # Log outcome to agent_runs for tracking if there is an associated run
        # Find latest Outreach agent run for this campaign
        run_res = (
            supabase.table("agent_runs")
            .select("id")
            .eq("founder_id", founder_id)
            .eq("agent_id", "outreach-v1")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if run_res and run_res.data:
            run_id = run_res.data[0]["id"]
            supabase.table("agent_runs").update({
                "status": "success",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "metadata": summary
            }).eq("id", run_id).execute()

        logger.info(
            f"Gmail draft sync complete for campaign {campaign_id}: drafted={summary['drafted']}, skipped={summary['skipped']}"
        )

    except GmailNotConnectedError:
        logger.warning(f"Gmail not connected for founder {founder_id}. Skipping draft sync.")
    except GmailTokenExpiredError:
        logger.warning(f"Gmail token expired for founder {founder_id}. Re-authentication required.")
    except Exception as e:
        logger.error(f"Unexpected error in background draft sync: {e}", exc_info=True)


@router.post("/{campaign_id}/approve", status_code=status.HTTP_200_OK)
async def approve_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Approves a generated draft campaign, transitions its status to 'approved',
    and triggers the background Gmail draft sync task.
    """
    founder_id = current_user.get("sub")
    if not founder_id:
      raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail="User identity (sub claim) is missing from the authentication token."
      )

    try:
        supabase = get_supabase_admin()

        # 1. Verify campaign ownership
        camp_res = (
            supabase.table("outreach_campaigns")
            .select("id")
            .eq("id", campaign_id)
            .eq("founder_id", founder_id)
            .maybe_single()
            .execute()
        )
        if not camp_res or not camp_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outreach campaign not found."
            )

        # 2. Update campaign to approved
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("outreach_campaigns").update({
            "status": "approved",
            "approved_at": now
        }).eq("id", campaign_id).execute()

        # 3. Add background task to sync drafts
        background_tasks.add_task(
            _sync_drafts_background,
            campaign_id=campaign_id,
            founder_id=founder_id,
            supabase=supabase,
        )

        return {
            "status": "approved",
            "approved_at": now,
            "gmail_sync": "queued" if not settings.GMAIL_MOCK_MODE else "mock_queued",
            "message": (
                "Campaign approved. Gmail drafts are being created in the background. "
                "Check your Gmail Drafts folder in ~30 seconds."
                if not settings.GMAIL_MOCK_MODE
                else "Campaign approved. Mock draft queue active (GMAIL_MOCK_MODE=True)."
            )
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve campaign: {str(e)}"
        )


@router.get("/{campaign_id}/contacts", status_code=status.HTTP_200_OK)
async def get_campaign_contacts(
    campaign_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Retrieves all contacts associated with a specific campaign."""
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    try:
        supabase = get_supabase_admin()

        # 1. Verify campaign ownership
        camp_res = (
            supabase.table("outreach_campaigns")
            .select("id")
            .eq("id", campaign_id)
            .eq("founder_id", founder_id)
            .maybe_single()
            .execute()
        )
        if not camp_res or not camp_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outreach campaign not found."
            )

        # 2. Fetch contacts
        contacts_res = (
            supabase.table("outreach_contacts")
            .select("*")
            .eq("campaign_id", campaign_id)
            .execute()
        )
        return contacts_res.data or []

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch campaign contacts: {str(e)}"
        )
