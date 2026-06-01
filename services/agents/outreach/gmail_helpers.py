from datetime import datetime, timezone, timedelta
import httpx
import base64
import asyncio
from email.message import EmailMessage
from typing import Dict, Any, List, Optional
from logging import Logger

from shared.config import settings
from shared.encryption import TokenEncryption
from shared.logger import logger

class GmailNotConnectedError(Exception):
    """Raised when the founder has not connected their Gmail account or the integration is disabled."""
    pass

class GmailTokenExpiredError(Exception):
    """Raised when the stored Gmail OAuth token is expired and cannot be refreshed."""
    pass

class GmailAPIError(Exception):
    """Raised when Gmail API requests return non-2xx status codes (except 429)."""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Gmail API Error {status_code}: {message}")


async def get_valid_gmail_credentials(
    founder_id: str, 
    supabase_client: Any
) -> dict:
    """
    Retrieve Gmail OAuth credentials for a founder.
    
    Steps:
    1. Query integrations table WHERE founder_id = ? AND provider = 'gmail'
    2. Raise GmailNotConnectedError if no row found or status != 'active'
    3. Decrypt access_token and refresh_token using TokenEncryption
    4. Check token_expires_at:
       - If expires in < 5 minutes: trigger refresh flow
       - If expired: trigger refresh flow
       - If valid: return decrypted credentials dict
    """
    # 1. Query integrations table
    def get_integration():
        return (
            supabase_client.table("integrations")
            .select("*")
            .eq("founder_id", founder_id)
            .eq("provider", "gmail")
            .maybe_single()
            .execute()
        )
    
    res = await asyncio.to_thread(get_integration)
    if not res or not res.data:
        raise GmailNotConnectedError("Gmail is not connected for this founder.")
    
    integration = res.data
    if integration.get("status") != "active":
        raise GmailNotConnectedError("Gmail integration is not active.")
    
    # 2. Decrypt access_token and refresh_token
    encryptor = TokenEncryption(settings.ENCRYPTION_KEY)
    
    enc_access = integration.get("access_token_encrypted")
    enc_refresh = integration.get("refresh_token_encrypted")
    
    access_token = encryptor.decrypt(enc_access) if enc_access else ""
    refresh_token = encryptor.decrypt(enc_refresh) if enc_refresh else ""
    
    if not access_token:
        raise GmailNotConnectedError("Failed to decrypt access token.")
    
    expires_at_str = integration.get("token_expires_at")
    
    # Check if expired or expires in < 5 minutes
    is_expired = False
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            time_left = (expires_at - datetime.now(timezone.utc)).total_seconds()
            if time_left < 300:  # less than 5 minutes remaining
                is_expired = True
        except Exception as e:
            logger.warning(f"Error parsing token expiry: {e}")
            is_expired = True
    else:
        is_expired = True
        
    if is_expired:
        if not refresh_token:
            raise GmailTokenExpiredError("Gmail token is expired and no refresh token is available.")
            
        logger.info(f"Gmail token for founder {founder_id} is expired or expiring soon. Refreshing...")
        
        # 1. Transaction-level lock via Supabase RPC to prevent concurrent refresh loops
        try:
            def acquire_lock():
                return supabase_client.rpc("acquire_integration_lock", {"p_founder_id": founder_id}).execute()
            await asyncio.to_thread(acquire_lock)
        except Exception as e:
            logger.warning(f"Failed to acquire advisory lock for Gmail refresh: {e}")
            
        # 2. Optimistic double-check: check if another concurrent process has already updated the token
        res_check = await asyncio.to_thread(get_integration)
        if res_check and res_check.data:
            latest = res_check.data
            latest_expires_at_str = latest.get("token_expires_at")
            if latest_expires_at_str:
                latest_expires_at = datetime.fromisoformat(latest_expires_at_str.replace("Z", "+00:00"))
                if (latest_expires_at - datetime.now(timezone.utc)).total_seconds() > 300:
                    logger.info("Gmail token was refreshed by another concurrent task.")
                    new_enc_access = latest.get("access_token_encrypted")
                    access_token = encryptor.decrypt(new_enc_access)
                    metadata = latest.get("metadata") or {}
                    return {
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "founder_email": metadata.get("gmail_email", ""),
                        "expires_at": latest_expires_at
                    }
                    
        # 3. Call Google token refresh endpoint
        token_url = "https://oauth2.googleapis.com/token"
        refresh_payload = {
            "client_id": settings.GMAIL_CLIENT_ID,
            "client_secret": settings.GMAIL_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            refresh_res = await client.post(token_url, data=refresh_payload)
            
        if refresh_res.status_code == 200:
            res_data = refresh_res.json()
            new_access_token = res_data["access_token"]
            expires_in = res_data["expires_in"]
            
            enc_new_access = encryptor.encrypt(new_access_token)
            new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            
            # Save newly refreshed access token
            def update_integration():
                return (
                    supabase_client.table("integrations")
                    .update({
                        "access_token_encrypted": enc_new_access,
                        "token_expires_at": new_expires_at.isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
                    .eq("founder_id", founder_id)
                    .eq("provider", "gmail")
                    .execute()
                )
            await asyncio.to_thread(update_integration)
            
            access_token = new_access_token
            expires_at = new_expires_at
            logger.info("Gmail token refreshed successfully.")
        else:
            logger.error(f"Failed to refresh Gmail token: {refresh_res.text}")
            def mark_expired():
                return (
                    supabase_client.table("integrations")
                    .update({
                        "status": "expired",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
                    .eq("founder_id", founder_id)
                    .eq("provider", "gmail")
                    .execute()
                )
            await asyncio.to_thread(mark_expired)
            raise GmailTokenExpiredError("Gmail token is expired and refresh failed.")
    else:
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        
    metadata = integration.get("metadata") or {}
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "founder_email": metadata.get("gmail_email", ""),
        "expires_at": expires_at
    }


async def create_gmail_draft(
    access_token: str,
    to_email: str,
    subject: str,
    body: str,
    from_email: str,
) -> Optional[str]:
    """
    Create a single draft in the founder's Gmail Drafts folder.
    """
    msg = EmailMessage()
    msg.set_content(body)
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    
    raw_bytes = msg.as_bytes()
    raw_b64 = base64.urlsafe_b64encode(raw_bytes).decode("utf-8").rstrip("=")
    
    draft_url = "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    draft_payload = {
        "message": {
            "raw": raw_b64
        }
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(draft_url, headers=headers, json=draft_payload)
        
    if res.status_code == 429:
        return None
        
    if res.status_code != 200:
        raise GmailAPIError(res.status_code, res.text)
        
    res_data = res.json()
    return res_data.get("id", "")


async def personalize_template(
    template: str, 
    contact: dict
) -> str:
    """
    Substitute placeholders in email template with contact data.
    """
    if not template:
        return ""
        
    first_name = contact.get("first_name") or ""
    last_name = contact.get("last_name") or ""
    company = contact.get("company") or ""
    title = contact.get("title") or ""
    founder_name = contact.get("gmail_name") or contact.get("founder_name") or "Founder"
    
    import re
    result = template
    
    replacements = {
        r"(?i)\{\{\s*first_name\s*\}\}": first_name if first_name else "there",
        r"(?i)\{\{\s*last_name\s*\}\}": last_name,
        r"(?i)\{\{\s*company\s*\}\}": company if company else "your company",
        r"(?i)\{\{\s*title\s*\}\}": title,
        r"(?i)\[\s*Your Name\s*\]": founder_name
    }
    
    for pattern, val in replacements.items():
        result = re.sub(pattern, val, result)
        
    result = re.sub(r" +", " ", result)
    result = re.sub(r" +([.,!?])", r"\1", result)
    
    return result.strip()


async def sync_campaign_drafts(
    campaign_id: str,
    founder_id: str,
    supabase_client: Any,
    logger: Logger,
) -> dict:
    """
    Core orchestration function. Called by background task after approval.
    """
    summary = {
        "drafted": 0,
        "skipped": 0,
        "errors": []
    }
    
    # 1. Check mock mode flag
    if settings.GMAIL_MOCK_MODE:
        logger.info(f"MOCK MODE: draft sync active for campaign {campaign_id}")
        try:
            def get_pending_contacts():
                return (
                    supabase_client.table("outreach_contacts")
                    .select("*")
                    .eq("campaign_id", campaign_id)
                    .eq("status", "pending")
                    .execute()
                )
            contacts_res = await asyncio.to_thread(get_pending_contacts)
            contacts = contacts_res.data if contacts_res else []
            
            for contact in contacts:
                def update_contact_mock(c_id):
                    return (
                        supabase_client.table("outreach_contacts")
                        .update({
                            "status": "draft_created",
                            "last_sent_at": datetime.now(timezone.utc).isoformat(),
                            "current_step": 1
                        })
                        .eq("id", c_id)
                        .execute()
                    )
                await asyncio.to_thread(update_contact_mock, contact["id"])
                logger.info(f"MOCK MODE: draft simulated for {contact['id']}")
                summary["drafted"] += 1
                
            def update_camp_mock():
                return (
                    supabase_client.table("outreach_campaigns")
                    .update({
                        "sent_count": summary["drafted"],
                        "status": "active"
                    })
                    .eq("id", campaign_id)
                    .execute()
                )
            await asyncio.to_thread(update_camp_mock)
            
            return {
                "drafted": summary["drafted"],
                "skipped": 0,
                "errors": [],
                "mock": True
            }
        except Exception as e:
            logger.error(f"Error in sync_campaign_drafts (mock mode): {e}")
            return {
                "drafted": 0,
                "skipped": 0,
                "errors": [{"contact_id": "all", "error_message": str(e)}],
                "mock": True
            }
            
    # Real Gmail API Sync
    try:
        creds = await get_valid_gmail_credentials(founder_id, supabase_client)
        access_token = creds["access_token"]
        from_email = creds["founder_email"]
        
        def get_integration_metadata():
            return (
                supabase_client.table("integrations")
                .select("metadata")
                .eq("founder_id", founder_id)
                .eq("provider", "gmail")
                .maybe_single()
                .execute()
            )
        int_res = await asyncio.to_thread(get_integration_metadata)
        gmail_name = "Founder"
        if int_res and int_res.data:
            metadata = int_res.data.get("metadata") or {}
            gmail_name = metadata.get("gmail_name", "Founder")
            
        def get_campaign():
            return (
                supabase_client.table("outreach_campaigns")
                .select("name, message_templates")
                .eq("id", campaign_id)
                .maybe_single()
                .execute()
            )
        camp_res = await asyncio.to_thread(get_campaign)
        if not camp_res or not camp_res.data:
            logger.error(f"Campaign {campaign_id} not found.")
            return summary
            
        campaign = camp_res.data
        templates = campaign.get("message_templates", [])
        if not templates:
            logger.warning(f"No message templates found for campaign {campaign_id}")
            return summary
            
        step1_template = None
        for t in templates:
            if t.get("step") == 1 and t.get("variant", "A") == "A":
                step1_template = t
                break
        if not step1_template and templates:
            step1_template = templates[0]
            
        if not step1_template:
            logger.error("No valid Step 1 template found.")
            return summary
            
        subject_template = step1_template.get("subject", "")
        body_template = step1_template.get("body", "")
        
        def get_pending_contacts_real():
            return (
                supabase_client.table("outreach_contacts")
                .select("*")
                .eq("campaign_id", campaign_id)
                .eq("status", "pending")
                .execute()
            )
        contacts_res = await asyncio.to_thread(get_pending_contacts_real)
        contacts = contacts_res.data if contacts_res else []
        
        logger.info(f"Processing {len(contacts)} pending contacts for campaign {campaign_id}")
        
        for contact in contacts:
            to_email = contact.get("email")
            if not to_email:
                logger.warning(f"Skipping contact {contact.get('id')} due to missing email address.")
                summary["skipped"] += 1
                summary["errors"].append({
                    "contact_id": contact.get("id"),
                    "error_message": "Missing email address"
                })
                continue
                
            contact_data = {
                "first_name": contact.get("first_name") or "",
                "last_name": contact.get("last_name") or "",
                "company": contact.get("company") or "",
                "title": contact.get("title") or "",
                "gmail_name": gmail_name
            }
            
            subject = await personalize_template(subject_template, contact_data)
            body = await personalize_template(body_template, contact_data)
            
            try:
                draft_id = await create_gmail_draft(
                    access_token=access_token,
                    to_email=to_email,
                    subject=subject,
                    body=body,
                    from_email=from_email
                )
                
                # Check for rate limit 429
                if draft_id is None:
                    logger.warning("Gmail API returned 429 (Rate Limit). Retrying after 2 seconds...")
                    await asyncio.sleep(2.0)
                    draft_id = await create_gmail_draft(
                        access_token=access_token,
                        to_email=to_email,
                        subject=subject,
                        body=body,
                        from_email=from_email
                    )
                    
                if draft_id:
                    def update_contact_success(c_id):
                        return (
                            supabase_client.table("outreach_contacts")
                            .update({
                                "status": "draft_created",
                                "last_sent_at": datetime.now(timezone.utc).isoformat(),
                                "current_step": 1
                            })
                            .eq("id", c_id)
                            .execute()
                        )
                    await asyncio.to_thread(update_contact_success, contact["id"])
                    summary["drafted"] += 1
                else:
                    logger.warning(f"Skipping contact {contact['id']} due to persistent rate limit 429.")
                    summary["skipped"] += 1
                    summary["errors"].append({
                        "contact_id": contact["id"],
                        "error_message": "Gmail API Rate Limit (429)"
                    })
                    
            except GmailAPIError as api_err:
                logger.error(f"Gmail API error for contact {contact['id']}: {api_err.message}")
                summary["skipped"] += 1
                summary["errors"].append({
                    "contact_id": contact["id"],
                    "error_message": f"Gmail API Error: {api_err.message}"
                })
            except Exception as e:
                logger.error(f"Unexpected error processing contact {contact['id']}: {e}")
                summary["skipped"] += 1
                summary["errors"].append({
                    "contact_id": contact["id"],
                    "error_message": str(e)
                })
                
            await asyncio.sleep(0.3)
            
        if summary["drafted"] > 0:
            def update_camp_success():
                return (
                    supabase_client.table("outreach_campaigns")
                    .update({
                        "sent_count": summary["drafted"],
                        "status": "active"
                    })
                    .eq("id", campaign_id)
                    .execute()
                )
            await asyncio.to_thread(update_camp_success)
            
    except Exception as e:
        logger.exception(f"Fatal exception during draft synchronization: {e}")
        summary["errors"].append({
            "contact_id": "campaign",
            "error_message": f"Fatal sync error: {str(e)}"
        })
        
    return summary
