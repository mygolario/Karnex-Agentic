import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta
from shared.config import settings
from shared.encryption import TokenEncryption
from agents.outreach.gmail_helpers import (
    get_valid_gmail_credentials,
    create_gmail_draft,
    personalize_template,
    sync_campaign_drafts,
    GmailNotConnectedError,
    GmailTokenExpiredError,
    GmailAPIError
)

# Set encryption key settings for the test
settings.ENCRYPTION_KEY = "abcdefghijklmnopqrstuvwxyz123456"

class MockResponse:
    def __init__(self, data):
        self.data = data

class MockTable:
    def __init__(self, data=None):
        self.data = data
        self._eq_calls = []

    def select(self, fields):
        return self

    def eq(self, field, value):
        self._eq_calls.append((field, value))
        return self

    def maybe_single(self):
        return self

    def update(self, payload):
        self.update_payload = payload
        return self

    def execute(self):
        return MockResponse(self.data)

class MockSupabaseClient:
    def __init__(self, data_map=None):
        self.data_map = data_map or {}
        self.rpc_calls = []

    def table(self, table_name):
        return MockTable(self.data_map.get(table_name))

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        return MockTable(None)


@pytest.mark.asyncio
async def test_get_valid_gmail_credentials_fresh():
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)
    enc_access = encryptor.encrypt("fresh_access_token_123")
    enc_refresh = encryptor.encrypt("fresh_refresh_token_456")
    
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    mock_data = {
        "status": "active",
        "access_token_encrypted": enc_access,
        "refresh_token_encrypted": enc_refresh,
        "token_expires_at": expires_at.isoformat(),
        "metadata": {"gmail_email": "test@gmail.com", "gmail_name": "Test Founder"}
    }
    
    client = MockSupabaseClient({"integrations": mock_data})
    
    creds = await get_valid_gmail_credentials("founder_1", client)
    assert creds["access_token"] == "fresh_access_token_123"
    assert creds["refresh_token"] == "fresh_refresh_token_456"
    assert creds["founder_email"] == "test@gmail.com"


@pytest.mark.asyncio
async def test_get_valid_gmail_credentials_expired_refresh():
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)
    enc_access = encryptor.encrypt("expired_access_token_123")
    enc_refresh = encryptor.encrypt("refresh_token_456")
    
    expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    mock_data = {
        "id": "integration_id_1",
        "status": "active",
        "access_token_encrypted": enc_access,
        "refresh_token_encrypted": enc_refresh,
        "token_expires_at": expires_at.isoformat(),
        "metadata": {"gmail_email": "test@gmail.com", "gmail_name": "Test Founder"}
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
        assert mock_post.call_args[0][0] == "https://oauth2.googleapis.com/token"


@pytest.mark.asyncio
async def test_get_valid_gmail_credentials_not_connected():
    client = MockSupabaseClient({"integrations": None})
    with pytest.raises(GmailNotConnectedError):
        await get_valid_gmail_credentials("founder_1", client)


@pytest.mark.asyncio
async def test_create_gmail_draft_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "draft_id_abc123"}
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        draft_id = await create_gmail_draft(
            "access_token_xyz",
            "recipient@example.com",
            "Hello Subject",
            "This is email body.",
            "sender@example.com"
        )
        assert draft_id == "draft_id_abc123"


@pytest.mark.asyncio
async def test_create_gmail_draft_error():
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Unauthorized access token"
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(GmailAPIError):
            await create_gmail_draft(
                "invalid_token",
                "recipient@example.com",
                "Hello Subject",
                "This is email body.",
                "sender@example.com"
            )


@pytest.mark.asyncio
async def test_create_gmail_draft_rate_limit():
    mock_response = MagicMock()
    mock_response.status_code = 429
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        draft_id = await create_gmail_draft(
            "access_token_xyz",
            "recipient@example.com",
            "Hello Subject",
            "This is email body.",
            "sender@example.com"
        )
        assert draft_id is None


@pytest.mark.asyncio
async def test_personalize_template_success():
    template = "Hi {{first_name}} {{last_name}}, how is {{company}}? I am [Your Name]."
    contact = {
        "first_name": "Aris",
        "last_name": "Kiani",
        "company": "Karnex Tech",
        "gmail_name": "Ario"
    }
    
    result = await personalize_template(template, contact)
    assert result == "Hi Aris Kiani, how is Karnex Tech? I am Ario."


@pytest.mark.asyncio
async def test_personalize_template_defaults():
    template = "Hi {{first_name}}, how is {{company}}? Regards [Your Name]."
    contact = {}
    result = await personalize_template(template, contact)
    assert result == "Hi there, how is your company? Regards Founder."


@pytest.mark.asyncio
async def test_sync_campaign_drafts_mock_mode():
    settings.GMAIL_MOCK_MODE = True
    client = MockSupabaseClient({
        "outreach_contacts": [
            {"id": "contact_1", "email": "aris@example.com", "first_name": "Aris", "last_name": "Kiani", "company": "Karnex Tech"}
        ]
    })
    
    logger = MagicMock()
    
    summary = await sync_campaign_drafts("campaign_1", "founder_1", client, logger)
    assert summary["drafted"] == 1
    assert summary["mock"] is True
    assert len(summary["errors"]) == 0


@pytest.mark.asyncio
async def test_personalize_template_nested_and_prefixes():
    template = "Hi {{contact.first_name}} {{contact.last_name}}, how is {{company.name}}? Regards [Your Name]."
    contact = {
        "first_name": "Sarah",
        "last_name": "Connor",
        "company": "Cyberdyne",
        "gmail_name": "John"
    }
    result = await personalize_template(template, contact)
    assert result == "Hi Sarah Connor, how is Cyberdyne? Regards John."

