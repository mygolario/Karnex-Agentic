"""Tests for Supabase JWT verification (HS256 legacy + JWKS)."""

from unittest.mock import patch

import jwt
import pytest
from fastapi import HTTPException

from api.middleware import auth as auth_module


@pytest.fixture(autouse=True)
def clear_jwk_cache():
    auth_module._get_jwk_client.cache_clear()
    yield
    auth_module._get_jwk_client.cache_clear()


def test_verify_hs256_uses_legacy_secret():
    payload = {"sub": "user-1", "aud": "authenticated"}
    with patch.object(auth_module.jwt, "get_unverified_header", return_value={"alg": "HS256"}):
        with patch.object(auth_module, "_decode_hs256", return_value=payload) as mock_hs:
            with patch.object(auth_module, "_decode_jwks") as mock_jwks:
                result = auth_module.verify_supabase_jwt("fake-token")
    assert result == payload
    mock_hs.assert_called_once_with("fake-token")
    mock_jwks.assert_not_called()


def test_verify_es256_uses_jwks():
    payload = {"sub": "user-1", "aud": "authenticated"}
    with patch.object(auth_module.jwt, "get_unverified_header", return_value={"alg": "ES256"}):
        with patch.object(auth_module, "_decode_hs256") as mock_hs:
            with patch.object(auth_module, "_decode_jwks", return_value=payload) as mock_jwks:
                result = auth_module.verify_supabase_jwt("fake-token")
    assert result == payload
    mock_jwks.assert_called_once_with("fake-token", "ES256")
    mock_hs.assert_not_called()


def test_verify_unsupported_algorithm():
    with patch.object(auth_module.jwt, "get_unverified_header", return_value={"alg": "none"}):
        with pytest.raises(HTTPException) as exc:
            auth_module.verify_supabase_jwt("fake-token")
    assert exc.value.status_code == 401
    assert "Invalid authentication token" in exc.value.detail


def test_verify_expired_token():
    with patch.object(auth_module.jwt, "get_unverified_header", return_value={"alg": "HS256"}):
        with patch.object(
            auth_module,
            "_decode_hs256",
            side_effect=jwt.ExpiredSignatureError("expired"),
        ):
            with pytest.raises(HTTPException) as exc:
                auth_module.verify_supabase_jwt("fake-token")
    assert exc.value.status_code == 401
    assert exc.value.detail == "Token has expired"
