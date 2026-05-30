"""Supabase JWT authentication verification middleware/utilities."""

import jwt
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from shared.config import settings
from shared.logger import logger


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """Decodes and verifies a Supabase JWT token using the shared secret.

    Args:
        token: The raw JWT token string.

    Returns:
        Dict[str, Any]: The decoded JWT payload.

    Raises:
        HTTPException: If the token is invalid or expired.
    """
    try:
        # Supabase JWTs are signed with HS256 using the JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": True},
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError as e:
        logger.warning("Supabase JWT expired", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid Supabase JWT", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
