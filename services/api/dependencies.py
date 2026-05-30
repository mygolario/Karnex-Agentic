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
