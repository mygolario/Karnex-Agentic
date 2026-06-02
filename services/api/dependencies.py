"""FastAPI dependencies for route protection and authentication."""

from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from api.middleware.auth import verify_supabase_jwt
from shared.config import settings

# HTTP Bearer scheme for Supabase JWTs
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """Dependency that authenticates the user using their Supabase JWT.

    Returns:
        Dict[str, Any]: The decoded JWT payload representing the current user.

    Raises:
        HTTPException: If authentication fails.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify and decode the JWT
    payload = verify_supabase_jwt(credentials.credentials)
    return payload


async def verify_internal_api_key(
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
) -> str:
    """Dependency that validates internal API keys for microservice communication.

    Returns:
        str: The validated internal API key.

    Raises:
        HTTPException: If validation fails.
    """
    if not x_internal_key or x_internal_key != settings.AGENT_SERVICE_INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing internal API key",
        )
    return x_internal_key


async def check_premium_subscription(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Validates that the current user has an active OxaPay premium subscription."""
    founder_id = current_user.get("sub")
    if not founder_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User identity is missing from the authentication token."
        )

    # In local development mode without database seeding, we can allow bypass or log warnings
    if settings.ENVIRONMENT == "development" and not settings.SUPABASE_SERVICE_ROLE_KEY:
        return current_user

    try:
        import asyncio
        from shared.supabase_client import get_supabase_admin
        from shared.logger import logger

        supabase = get_supabase_admin()
        
        # Check active subscriptions
        res = await asyncio.to_thread(
            lambda: supabase.table("subscriptions")
            .select("id, status")
            .eq("founder_id", founder_id)
            .in_("status", ["trialing", "active", "expiring_soon"])
            .execute()
        )
        
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Active premium subscription required to execute this agent. Please visit the Billing page."
            )
    except HTTPException:
        raise
    except Exception as e:
        from shared.logger import logger
        logger.error(f"Error checking subscription for founder {founder_id}: {e}")
        # Fail safe in development, but block in production
        if settings.ENVIRONMENT == "production":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Subscription check failed. Please try again."
            )
            
    return current_user

