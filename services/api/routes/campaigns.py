"""API endpoints for managing outreach campaigns and contacts."""

from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from services.api.dependencies import get_current_user
from services.shared.supabase_client import get_supabase_admin

router = APIRouter(prefix="/v1/campaigns", tags=["Campaigns"])


@router.post("/{campaign_id}/approve", status_code=status.HTTP_200_OK)
async def approve_campaign(
    campaign_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Approves a generated draft campaign and transitions its status to 'approved'."""
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

        return {"status": "approved", "approved_at": now}

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
