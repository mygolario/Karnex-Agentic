"""Karnex Forge Integrations & Connectors Manager.
Generates code structures and boilerplate settings for Tier 1, 2, and 3 integrations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IntegrationTemplate(BaseModel):
    name: str
    tier: str  # TIER_1 | TIER_2 | TIER_3
    boilerplate_code: str
    env_vars: List[str]
    setup_steps: List[str]


INTEGRATION_TEMPLATES: Dict[str, IntegrationTemplate] = {
    # Tier 1 (Auto-injected)
    "supabase": IntegrationTemplate(
        name="Supabase DB, Auth & Storage",
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
    "vercel": IntegrationTemplate(
        name="Vercel Deploy",
        tier="TIER_1",
        boilerplate_code="// Auto-managed by Vercel Integration Pipeline\nexport const deployConfig = { provider: 'vercel' }",
        env_vars=["VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_ORG_ID"],
        setup_steps=["1. Automatically configured during deployment stage."]
    ),
    "github": IntegrationTemplate(
        name="GitHub Sync",
        tier="TIER_1",
        boilerplate_code="// GitHub repository and PR synchronization workflow",
        env_vars=["GITHUB_TOKEN", "GITHUB_REPO"],
        setup_steps=["1. Connected via developer OAuth token."]
    ),

    # Tier 2 (One-click toggle / keyword auto-inject)
    "stripe": IntegrationTemplate(
        name="Stripe Payments",
        tier="TIER_2",
        boilerplate_code=(
            "import Stripe from 'stripe'\n\n"
            "export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {\n"
            "  apiVersion: '2023-10-16',\n"
            "})\n\n"
            "export const getCheckoutSession = async (priceId: string) => {\n"
            "  return await stripe.checkout.sessions.create({\n"
            "    payment_method_types: ['card'],\n"
            "    line_items: [{ price: priceId, quantity: 1 }],\n"
            "    mode: 'subscription',\n"
            "    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,\n"
            "    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,\n"
            "  })\n"
            "}"
        ),
        env_vars=["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
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
            "export const resend = new Resend(process.env.RESEND_API_KEY)\n\n"
            "export const sendEmail = async (to: string, subject: string, html: string) => {\n"
            "  return await resend.emails.send({\n"
            "    from: 'Karnex App <noreply@karnex.ai>',\n"
            "    to,\n"
            "    subject,\n"
            "    html\n"
            "  })\n"
            "}"
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
    ),
    "cal.com": IntegrationTemplate(
        name="Cal.com Booking Scheduler",
        tier="TIER_2",
        boilerplate_code=(
            "// Embedded Cal.com scheduler snippet\n"
            "export const CalEmbed = ({ calLink }: { calLink: string }) => {\n"
            "  return (\n"
            "    <iframe \n"
            "      src={`https://cal.com/${calLink}`} \n"
            "      style={{ width: '100%', height: '100%', border: 'none' }} \n"
            "    />\n"
            "  )\n"
            "}"
        ),
        env_vars=["NEXT_PUBLIC_CAL_LINK"],
        setup_steps=["1. Retrieve your username from your Cal.com profile."]
    ),

    # Tier 3 (On-request)
    "algolia": IntegrationTemplate(
        name="Algolia Instant Search",
        tier="TIER_3",
        boilerplate_code=(
            "import algoliasearch from 'algoliasearch'\n\n"
            "export const searchClient = algoliasearch(\n"
            "  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,\n"
            "  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY\n"
            ")"
        ),
        env_vars=["NEXT_PUBLIC_ALGOLIA_APP_ID", "NEXT_PUBLIC_ALGOLIA_SEARCH_KEY", "ALGOLIA_ADMIN_KEY"],
        setup_steps=["1. Configure search index indices in Algolia dashboard."]
    ),
    "mapbox": IntegrationTemplate(
        name="Mapbox Geospatial Maps",
        tier="TIER_3",
        boilerplate_code=(
            "// Mapbox map initialization module\n"
            "export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"
        ),
        env_vars=["NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"],
        setup_steps=["1. Generate public access token from Mapbox account."]
    ),
    "openrouter": IntegrationTemplate(
        name="OpenRouter API (AI agent routing)",
        tier="TIER_3",
        boilerplate_code=(
            "export const callOpenRouter = async (prompt: string) => {\n"
            "  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {\n"
            "    method: 'POST',\n"
            "    headers: {\n"
            "      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,\n"
            "      'Content-Type': 'application/json'\n"
            "    },\n"
            "    body: JSON.stringify({\n"
            "      model: 'google/gemini-2.5-flash',\n"
            "      messages: [{ role: 'user', content: prompt }]\n"
            "    })\n"
            "  })\n"
            "  return await res.json()\n"
            "}"
        ),
        env_vars=["OPENROUTER_API_KEY"],
        setup_steps=["1. Obtain API key from OpenRouter settings."]
    )
}


def get_integration_snippet(integration_name: str) -> Optional[IntegrationTemplate]:
    """Retrieve boilerplate templates and setup hints for developer setup."""
    return INTEGRATION_TEMPLATES.get(integration_name.lower())


def get_required_integrations(intent_spec: Dict[str, Any] | str) -> List[str]:
    """Scans the intent specification to decide which Tier 2/3 integrations are needed."""
    spec_str = str(intent_spec).lower()
    required = ["supabase", "vercel", "github"]  # Tier 1 defaults

    # Stripe
    if any(k in spec_str for k in ("payment", "stripe", "billing", "subscribe", "checkout", "pricing")):
        required.append("stripe")
        
    # Resend
    if any(k in spec_str for k in ("email", "mail", "newsletter", "resend", "notification")):
        required.append("resend")
        
    # Posthog
    if any(k in spec_str for k in ("analytics", "posthog", "metrics", "tracking", "dashboard stats")):
        required.append("posthog")
        
    # Cal.com
    if any(k in spec_str for k in ("calendar", "booking", "appointment", "cal.com", "schedule")):
        required.append("cal.com")
        
    # Algolia
    if any(k in spec_str for k in ("search", "algolia", "query indexing")):
        required.append("algolia")
        
    # Mapbox
    if any(k in spec_str for k in ("map", "mapbox", "coordinates", "geolocation")):
        required.append("mapbox")
        
    # OpenRouter
    if any(k in spec_str for k in ("llm", "openrouter", "openai", "ai generation", "gpt")):
        required.append("openrouter")

    return required


def inject_integration_code(integration: str, project_type: str) -> Dict[str, Any]:
    """Generate the specific code snippet and environmental config for injection into project files."""
    tmpl = get_integration_snippet(integration)
    if not tmpl:
        return {}

    # Adapt path based on project type
    path_map = {
        "supabase": "src/lib/supabase/client.ts" if project_type == "web_nextjs" else "lib/supabase.ts",
        "stripe": "src/lib/stripe.ts" if project_type == "web_nextjs" else "stripe.ts",
        "resend": "src/lib/resend.ts" if project_type == "web_nextjs" else "resend.ts",
        "posthog": "src/lib/posthog.ts" if project_type == "web_nextjs" else "posthog.ts",
        "cal.com": "src/components/CalEmbed.tsx" if project_type == "web_nextjs" else "CalEmbed.tsx",
        "algolia": "src/lib/algolia.ts" if project_type == "web_nextjs" else "algolia.ts",
        "mapbox": "src/lib/mapbox.ts" if project_type == "web_nextjs" else "mapbox.ts",
        "openrouter": "src/lib/openrouter.ts" if project_type == "web_nextjs" else "openrouter.ts"
    }

    return {
        "name": tmpl.name,
        "path": path_map.get(integration.lower(), f"lib/{integration.lower()}.ts"),
        "code": tmpl.boilerplate_code,
        "env_vars": tmpl.env_vars,
        "setup_steps": tmpl.setup_steps
    }
