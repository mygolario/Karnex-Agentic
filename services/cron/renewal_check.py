"""Subscription renewal check cron job.

Runs daily (intended at 09:00 UTC) to identify subscriptions expiring in <= 5 days
or <= 1 day, or already expired, and create renewal alerts.
"""

import os
import sys
from datetime import datetime, timedelta, timezone

import httpx

# Ensure project root is in path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


def dispatch_renewal_email(
    email: str, subject: str, body: str, reminder_type: str
):
    """Sends a renewal reminder email using the Resend API."""
    if not settings.RESEND_API_KEY:
        logger.warning(f"[EMAIL MOCK] No Resend API key set. Email to {email}: {subject}\n{body}")
        return

    logger.info(f"Dispatching renewal email to {email} using Resend...")
    try:
        from_email = "billing@arioai.site"
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json"
        }

        html_body = body.replace("\n", "<br>")
        payload = {
            "from": f"Karnex <{from_email}>",
            "to": [email],
            "subject": subject,
            "html": f"<div style='font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'><h2 style='color: #0f172a;'>Karnex Subscription Alert</h2><p style='color: #334155; font-size: 16px; line-height: 1.5;'>{html_body}</p></div>"
        }

        response = httpx.post(url, headers=headers, json=payload, timeout=10.0)
        if response.status_code in (200, 201):
            logger.info(f"Successfully sent renewal email to {email} via Resend. Response: {response.json()}")
        else:
            logger.error(f"Failed to send email via Resend. Status code: {response.status_code}, Response: {response.text}")
    except Exception as e:
        logger.exception(f"Exception raised while sending email via Resend to {email}: {e}")



def process_subscription_reminders():
    """Checks for subscriptions that are expiring soon or have expired,

    generates payment links, saves records in renewal_reminders, and logs alerts.
    """
    logger.info("Starting daily subscription renewal check...")

    try:
        supabase = get_supabase_admin()
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        return

    now = datetime.now(timezone.utc)
    five_days_from_now = now + timedelta(days=5)
    one_day_from_now = now + timedelta(days=1)

    try:
        # Fetch all active, trialing, or expiring_soon subscriptions
        subs_res = (
            supabase.table("subscriptions")
            .select("*, founders(email)")
            .in_("status", ["trialing", "active", "expiring_soon"])
            .execute()
        )

        subscriptions = subs_res.data or []
        logger.info(f"Auditing {len(subscriptions)} active/trialing subscriptions")

        for sub in subscriptions:
            sub_id = sub["id"]
            founder_id = sub["founder_id"]
            expires_at_str = sub["expires_at"]
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))

            # Fetch founder's email safely
            founder_email = sub.get("founders", {}).get("email", f"founder_{founder_id[:8]}@karnex.dev")

            # Fetch already sent reminders for this subscription
            reminders_res = (
                supabase.table("renewal_reminders")
                .select("reminder_type")
                .eq("subscription_id", sub_id)
                .execute()
            )
            sent_reminders = {r["reminder_type"] for r in reminders_res.data} if reminders_res.data else set()

            # Case 1: Subscription has already expired
            if expires_at < now:
                logger.info(f"Subscription {sub_id} has expired (expired on {expires_at_str})")

                # Update status in subscriptions table
                supabase.table("subscriptions").update({"status": "expired"}).eq("id", sub_id).execute()

                if "expired" not in sent_reminders:
                    # Insert reminder log
                    pay_link = f"https://oxapay.com/mock-invoice/expired-{sub_id}"
                    supabase.table("renewal_reminders").insert({
                        "founder_id": founder_id,
                        "subscription_id": sub_id,
                        "reminder_type": "expired",
                        "payment_link": pay_link,
                        "payment_link_expires": (now + timedelta(days=7)).isoformat()
                    }).execute()

                    dispatch_renewal_email(
                        founder_email,
                        "Your Karnex Subscription has Expired",
                        f"Hi founder,\n\nYour Karnex subscription expired on {expires_at_str}. "
                        f"Please renew your subscription to reactivate your agents: {pay_link}",
                        "expired"
                    )

            # Case 2: Expiring in <= 1 day
            elif expires_at <= one_day_from_now:
                if "1_day" not in sent_reminders:
                    logger.info(f"Subscription {sub_id} expiring in less than 24 hours")

                    # Update status in subscriptions table
                    supabase.table("subscriptions").update({"status": "expiring_soon"}).eq("id", sub_id).execute()

                    pay_link = f"https://oxapay.com/mock-invoice/renew-{sub_id}"
                    supabase.table("renewal_reminders").insert({
                        "founder_id": founder_id,
                        "subscription_id": sub_id,
                        "reminder_type": "1_day",
                        "payment_link": pay_link,
                        "payment_link_expires": expires_at_str
                    }).execute()

                    dispatch_renewal_email(
                        founder_email,
                        "URGENT: Your Karnex Subscription Expires in 24 Hours",
                        f"Hi founder,\n\nYour Karnex subscription expires on {expires_at_str}. "
                        f"Please use this payment link to renew your subscription immediately: {pay_link}",
                        "1_day"
                    )

            # Case 3: Expiring in <= 5 days
            elif expires_at <= five_days_from_now:
                if "5_day" not in sent_reminders:
                    logger.info(f"Subscription {sub_id} expiring in less than 5 days")

                    # Update status in subscriptions table
                    supabase.table("subscriptions").update({"status": "expiring_soon"}).eq("id", sub_id).execute()

                    pay_link = f"https://oxapay.com/mock-invoice/renew-{sub_id}"
                    supabase.table("renewal_reminders").insert({
                        "founder_id": founder_id,
                        "subscription_id": sub_id,
                        "reminder_type": "5_day",
                        "payment_link": pay_link,
                        "payment_link_expires": expires_at_str
                    }).execute()

                    dispatch_renewal_email(
                        founder_email,
                        "Friendly Reminder: Your Karnex Subscription Renews Soon",
                        f"Hi founder,\n\nYour Karnex subscription will expire on {expires_at_str}. "
                        f"Ensure continuous service by renewing here: {pay_link}",
                        "5_day"
                    )

        logger.info("Daily subscription renewal check complete.")
    except Exception as e:
        logger.exception(f"Error during renewal check cron execution: {e}")


if __name__ == "__main__":
    process_subscription_reminders()
