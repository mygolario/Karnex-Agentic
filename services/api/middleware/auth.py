"""Supabase JWT authentication verification middleware/utilities."""

from functools import lru_cache
from typing import Any, Dict

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from shared.config import settings
from shared.logger import logger

JWKS_ALGORITHMS = ("ES256", "RS256")
LEGACY_ALGORITHM = "HS256"
JWT_AUDIENCE = "authenticated"


@lru_cache(maxsize=1)
def _get_jwk_client() -> PyJWKClient:
    return PyJWKClient(settings.supabase_jwks_url)


def _decode_hs256(token: str) -> Dict[str, Any]:
    return jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=[LEGACY_ALGORITHM],
        options={"verify_aud": True},
        audience=JWT_AUDIENCE,
    )


def _decode_jwks(token: str, algorithm: str) -> Dict[str, Any]:
    signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=[algorithm],
        options={"verify_aud": True},
        audience=JWT_AUDIENCE,
    )


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """Verify a Supabase access token (HS256 legacy or ES256/RS256 via JWKS)."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        logger.warning("Supabase JWT header invalid", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    algorithm = header.get("alg", LEGACY_ALGORITHM)

    try:
        if algorithm == LEGACY_ALGORITHM:
            return _decode_hs256(token)
        if algorithm in JWKS_ALGORITHMS:
            return _decode_jwks(token, algorithm)
        logger.warning("Unsupported JWT algorithm", extra={"alg": algorithm})
        raise jwt.InvalidTokenError(f"Unsupported algorithm: {algorithm}")
    except jwt.ExpiredSignatureError as e:
        logger.warning("Supabase JWT expired", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid Supabase JWT", extra={"error": str(e), "alg": algorithm})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
