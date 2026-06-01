"""API endpoints for founder profiles and metrics."""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from api.dependencies import get_current_user
from shared.supabase_client import get_supabase_admin

router = APIRouter(prefix="/v1/founders", tags=["Founders"])


@router.get("/momentum", status_code=status.HTTP_200_OK)
async def get_momentum_history(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Fetches the founder's current momentum score and a history of changes.

    Reconstructs the history based on recent Daily Standup check-in outputs.
    """
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity (sub claim) is missing from the authentication token."
        )

    try:
        supabase = get_supabase_admin()

        # 1. Fetch current momentum score
        founder_res = (
            supabase.table("founders")
            .select("momentum_score")
            .eq("id", founder_id)
            .maybe_single()
            .execute()
        )
        current_score = (
            founder_res.data.get("momentum_score", 0)
            if founder_res and founder_res.data
            else 0
        )

        # 2. Fetch recent daily standup logs to show history
        history_res = (
            supabase.table("agent_outputs")
            .select("created_at, output")
            .eq("founder_id", founder_id)
            .eq("output_type", "standup_summary")
            .order("created_at", desc=True)
            .limit(30)
            .execute()
        )

        history = []
        if history_res.data:
            for item in history_res.data:
                output_val = item.get("output", {})
                standup_sum = output_val.get("standup_summary", {})
                history.append({
                    "date": item.get("created_at"),
                    "momentum_delta": standup_sum.get("momentum_delta", 0),
                    "encouragement": standup_sum.get("encouragement", ""),
                    "yesterday_completed": standup_sum.get("yesterday_completed", []),
                    "today_priorities": standup_sum.get("today_priorities", []),
                })

        return {"current_score": current_score, "history": history}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch momentum history: {str(e)}"
        )
