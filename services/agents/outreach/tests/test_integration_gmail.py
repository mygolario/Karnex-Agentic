from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from agents.outreach.gmail_helpers import (
    create_gmail_draft,
    get_valid_gmail_credentials,
    sync_campaign_drafts,
)
from api.main import app
from shared.config import settings
from shared.encryption import TokenEncryption

# Ensure encryption settings are set for test suite
settings.ENCRYPTION_KEY = "abcdefghijklmnopqrstuvwxyz123456"

# DB Mocks
class MockResponse:
    def __init__(self, data):
        self.data = data

class MockTable:
    def __init__(self, data=None):
        self.data = data
        self._eq_calls = []
        self._update_payload = None

    def select(self, fields):
        return self

    def eq(self, field, value):
        self._eq_calls.append((field, value))
        return self

    def order(self, field, desc=False):
        return self

    def limit(self, val):
        return self

    def maybe_single(self):
        return self

    def update(self, payload):
        self._update_payload = payload
        return self

    def execute(self):
        return MockResponse(self.data)

class MockSupabaseClient:
    def __init__(self, data_map=None):
        self.data_map = data_map or {}
        self.rpc_calls = []

    def table(self, table_name):
        # Allow dynamic access / changes
        return MockTable(self.data_map.get(table_name))

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        return MockTable(None)


# 1. test_01_encryption_round_trip
def test_01_encryption_round_trip():
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)

    access = "access_token_xyz_123"
    refresh = "refresh_token_abc_456"

    enc_access, enc_refresh = encryptor.encrypt_token_pair(access, refresh)
    dec_access, dec_refresh = encryptor.decrypt_token_pair(enc_access, enc_refresh)

    assert dec_access == access
    assert dec_refresh == refresh


# 2. test_02_credentials_retrieved_when_fresh
@pytest.mark.asyncio
async def test_02_credentials_retrieved_when_fresh():
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)
    enc_access = encryptor.encrypt("fresh_access_token")
    enc_refresh = encryptor.encrypt("fresh_refresh_token")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    mock_data = {
        "status": "active",
        "access_token_encrypted": enc_access,
        "refresh_token_encrypted": enc_refresh,
        "token_expires_at": expires_at.isoformat(),
        "metadata": {"gmail_email": "fresh@gmail.com", "gmail_name": "Fresh Name"}
    }
    client = MockSupabaseClient({"integrations": mock_data})

    creds = await get_valid_gmail_credentials("founder_1", client)
    assert creds["access_token"] == "fresh_access_token"
    assert creds["refresh_token"] == "fresh_refresh_token"
    assert creds["founder_email"] == "fresh@gmail.com"


# 3. test_03_credentials_refresh_when_expired
@pytest.mark.asyncio
async def test_03_credentials_refresh_when_expired():
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)
    enc_access = encryptor.encrypt("expired_access_token")
    enc_refresh = encryptor.encrypt("refresh_token_456")
    expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)

    mock_data = {
        "id": "int_id_123",
        "status": "active",
        "access_token_encrypted": enc_access,
        "refresh_token_encrypted": enc_refresh,
        "token_expires_at": expires_at.isoformat(),
        "metadata": {"gmail_email": "fresh@gmail.com", "gmail_name": "Fresh Name"}
    }
    client = MockSupabaseClient({"integrations": mock_data})

    # Mock Google Token Refresh Endpoint response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "access_token": "newly_refreshed_access_token_789",
        "expires_in": 3600
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        creds = await get_valid_gmail_credentials("founder_1", client)

        assert creds["access_token"] == "newly_refreshed_access_token_789"
        mock_post.assert_called_once()


# 4. test_04_draft_created_successfully
@pytest.mark.asyncio
async def test_04_draft_created_successfully():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "draft_id_xyz"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        draft_id = await create_gmail_draft(
            "access_token_xyz",
            "recipient@example.com",
            "Subject line",
            "Body content",
            "sender@example.com"
        )
        assert draft_id == "draft_id_xyz"

        # Verify Headers
        headers_passed = mock_post.call_args[1]["headers"]
        assert headers_passed["Authorization"] == "Bearer access_token_xyz"


# 5. test_05_rate_limit_handled
@pytest.mark.asyncio
async def test_05_rate_limit_handled():
    # Mock credentials retrieval to return fresh tokens directly
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)
    enc_access = encryptor.encrypt("access_123")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    mock_integration = {
        "status": "active",
        "access_token_encrypted": enc_access,
        "token_expires_at": expires_at.isoformat(),
        "metadata": {"gmail_email": "test@gmail.com", "gmail_name": "Test Name"}
    }

    mock_campaign = {
        "name": "Test Campaign",
        "message_templates": [{"step": 1, "variant": "A", "subject": "Hello", "body": "Body"}]
    }

    mock_contacts = [
        {"id": "contact_1", "email": "aris@example.com", "first_name": "Aris", "last_name": "Kiani", "company": "Karnex Tech", "status": "pending"}
    ]

    client = MockSupabaseClient({
        "integrations": mock_integration,
        "outreach_campaigns": mock_campaign,
        "outreach_contacts": mock_contacts
    })

    logger = MagicMock()

    # Mock GMAIL_MOCK_MODE to False so it runs real path
    settings.GMAIL_MOCK_MODE = False

    # Mock Gmail API calls: first returns 429, second returns 200 (retry success)
    mock_response_1 = MagicMock()
    mock_response_1.status_code = 429

    mock_response_2 = MagicMock()
    mock_response_2.status_code = 200
    mock_response_2.json.return_value = {"id": "draft_success_id"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:

        mock_post.side_effect = [mock_response_1, mock_response_2]

        summary = await sync_campaign_drafts("campaign_1", "founder_1", client, logger)
        assert summary["drafted"] == 1
        assert summary["skipped"] == 0
        mock_sleep.assert_any_call(2.0) # check retry sleep backoff called


# 6. test_06_contact_skipped_on_persistent_error
@pytest.mark.asyncio
async def test_06_contact_skipped_on_persistent_error():
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)
    enc_access = encryptor.encrypt("access_123")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    mock_integration = {
        "status": "active",
        "access_token_encrypted": enc_access,
        "token_expires_at": expires_at.isoformat(),
        "metadata": {"gmail_email": "test@gmail.com", "gmail_name": "Test Name"}
    }

    mock_campaign = {
        "name": "Test Campaign",
        "message_templates": [{"step": 1, "variant": "A", "subject": "Hello", "body": "Body"}]
    }

    mock_contacts = [
        {"id": "contact_1", "email": "aris@example.com", "first_name": "Aris", "status": "pending"},
        {"id": "contact_2", "email": "sarah@example.com", "first_name": "Sarah", "status": "pending"}
    ]

    client = MockSupabaseClient({
        "integrations": mock_integration,
        "outreach_campaigns": mock_campaign,
        "outreach_contacts": mock_contacts
    })

    logger = MagicMock()
    settings.GMAIL_MOCK_MODE = False

    # Mock Gmail API calls to persistently return 429
    mock_response = MagicMock()
    mock_response.status_code = 429

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("asyncio.sleep", new_callable=AsyncMock):

        mock_post.return_value = mock_response

        summary = await sync_campaign_drafts("campaign_1", "founder_1", client, logger)
        assert summary["drafted"] == 0
        assert summary["skipped"] == 2
        assert len(summary["errors"]) == 2


# 7. test_07_mock_mode_skips_gmail_api
@pytest.mark.asyncio
async def test_07_mock_mode_skips_gmail_api():
    settings.GMAIL_MOCK_MODE = True

    mock_contacts = [
        {"id": "contact_1", "email": "aris@example.com", "first_name": "Aris", "status": "pending"}
    ]

    client = MockSupabaseClient({
        "outreach_contacts": mock_contacts
    })

    logger = MagicMock()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        summary = await sync_campaign_drafts("campaign_1", "founder_1", client, logger)
        assert summary["drafted"] == 1
        assert summary["mock"] is True
        mock_post.assert_not_called()


# 8. test_08_full_approve_flow
def test_08_full_approve_flow():
    # Setup test client with dependencies mocked
    # Bypass authenticated user dependency in TestClient
    from api.dependencies import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {"sub": "test_founder_123"}

    # Mock campaign approve queries
    mock_campaign = {
        "id": "campaign_123",
        "founder_id": "test_founder_123",
        "status": "draft"
    }

    mock_client = MockSupabaseClient({
        "outreach_campaigns": mock_campaign
    })

    with patch("api.routes.campaigns.get_supabase_admin") as mock_admin, \
         patch("api.routes.campaigns.sync_campaign_drafts", new_callable=AsyncMock) as mock_sync:

        mock_admin.return_value = mock_client
        mock_sync.return_value = {"drafted": 2, "skipped": 0, "errors": []}

        settings.GMAIL_MOCK_MODE = True

        client = TestClient(app)
        response = client.post("/v1/campaigns/campaign_123/approve")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        assert data["gmail_sync"] == "mock_queued"

        # Clean overrides
        app.dependency_overrides.clear()
