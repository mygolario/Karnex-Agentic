"""Karnex Forge Integrations & Connectors Manager.
Generates code structures and boilerplate settings for Tier 1 and Tier 2 integrations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IntegrationTemplate(BaseModel):
    name: str
    tier: str # TIER_1 | TIER_2 | TIER_3
    boilerplate_code: str
    env_vars: List[str]
    setup_steps: List[str]


INTEGRATION_TEMPLATES: Dict[str, IntegrationTemplate] = {
    "supabase": IntegrationTemplate(
        name="Supabase DB & Auth",
        tier="TIER_1",
        boilerplate_code=(
            "import { createClient } from '@supabase/supabase-js'\n\n"
            "const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL\n"
            "const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n"
            "export const supabase = createClient(supabaseUrl, supabaseAnonKey)"
        ),
        env_vars=["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        setup_steps=[
            "1. Initialize a new project in the Supabase Dashboard.",
            "2. Copy the API keys into your local .env file."
        ]
    ),
    "stripe": IntegrationTemplate(
        name="Stripe Payments",
        tier="TIER_2",
        boilerplate_code=(
            "import Stripe from 'stripe'\n\n"
            "export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {\n"
            "  apiVersion: '2023-10-16',\n"
            "})"
        ),
        env_vars=["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
        setup_steps=[
            "1. Access Stripe Dashboard -> Developers -> API Keys.",
            "2. Generate Stripe Secret Key and add to environment variables."
        ]
    ),
    "resend": IntegrationTemplate(
        name="Resend Email Service",
        tier="TIER_2",
        boilerplate_code=(
            "import { Resend } from 'resend'\n\n"
            "export const resend = new Resend(process.env.RESEND_API_KEY)"
        ),
        env_vars=["RESEND_API_KEY"],
        setup_steps=[
            "1. Sign up at resend.com.",
            "2. Generate an API key and verify your domain."
        ]
    ),
    "posthog": IntegrationTemplate(
        name="PostHog Product Analytics",
        tier="TIER_2",
        boilerplate_code=(
            "import posthog from 'posthog-js'\n\n"
            "if (typeof window !== 'undefined') {\n"
            "  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {\n"
            "    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',\n"
            "  })\n"
            "}"
        ),
        env_vars=["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
        setup_steps=[
            "1. Sign up at posthog.com.",
            "2. Add the provider context to layout.tsx."
        ]
    )
}


def get_integration_snippet(integration_name: str) -> Optional[IntegrationTemplate]:
    """Retrieve boilerplate templates and setup hints for developer setup."""
    return INTEGRATION_TEMPLATES.get(integration_name.lower())
