"""Application settings loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import model_validator
from pydantic_settings import BaseSettings

# Repo root: services/shared/config.py → shared → services → karnex root
_REPO_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _REPO_ROOT / ".env"

if _ENV_FILE.is_file():
    load_dotenv(_ENV_FILE, override=False)


class Settings(BaseSettings):
    """Karnex Agent Service configuration.

    Values load from the environment and from ``.env`` at the monorepo root
    (same file as Next.js when using scripts/setup-env.ps1).
    """

    GOOGLE_GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    SUPABASE_URL: str = "http://localhost:54080"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = (
        "super-secret-jwt-token-with-at-least-32-characters-long"
    )
    SUPABASE_JWKS_URL: str = ""
    AGENT_SERVICE_INTERNAL_KEY: str = "dev-internal-key"
    OXAPAY_MERCHANT_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3080"
    KARNEX_WEB_ORIGIN: str = "https://arioai.site"
    # ── Model Tiers ───────────────────────────────────────────────────────────
    # Tier 1 – Complex reasoning (War Room roadmap)
    GEMINI_MODEL_31_PRO: str = "google/gemini-3.1-pro-preview"
    # Tier 1b – Proven Pro (Outreach, Research synthesis, Builder architecture)
    GEMINI_MODEL: str = "google/gemini-2.5-pro"
    # Tier 2 – Structured JSON, high reliability (Pain Transformer, Crystallizer, ICP Definer)
    GEMINI_MODEL_FLASH: str = "google/gemini-2.5-flash"
    # Tier 2b – Newer Flash-Lite, approaches Flash quality (Competitive Landscape, Weekly Debrief)
    GEMINI_MODEL_31_FLASH_LITE: str = "google/gemini-3.1-flash-lite"
    # Tier 3 – Cheapest, simple summaries (Daily Standup, Analytics, Sprint Planner)
    GEMINI_MODEL_FLASH_LITE: str = "google/gemini-2.5-flash-lite"

    # ── Per-Agent max_tokens caps ─────────────────────────────────────────────
    # Global fallback (keep high for safety in unknown agents)
    OPENROUTER_MAX_TOKENS: int = 32768
    # Tier 1 – War Room 90-day roadmap (large but bounded)
    OPENROUTER_MAX_TOKENS_WAR_ROOM: int = 12000
    # Tier 2 – Structured JSON agents (pain-transformer, crystallizer, icp-definer)
    OPENROUTER_MAX_TOKENS_FLASH: int = 6000
    # Research synthesis step (open-ended multi-source reasoning)
    OPENROUTER_MAX_TOKENS_RESEARCH: int = 10000
    # Builder architecture/code generation steps
    OPENROUTER_MAX_TOKENS_BUILDER: int = 16000
    # Outreach email sequences
    OPENROUTER_MAX_TOKENS_OUTREACH: int = 4000
    # Competitive landscape analysis
    OPENROUTER_MAX_TOKENS_COMPETITIVE: int = 8000
    # Simple summary agents (standup, analytics, debrief, sprint planner)
    OPENROUTER_MAX_TOKENS_SIMPLE: int = 4000

    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    ENCRYPTION_KEY: str = ""
    GMAIL_MOCK_MODE: bool = False
    RESEND_API_KEY: str = ""

    KARNEX_INTERNAL_WEBHOOK_SECRET: str = ""
    KARNEX_APP_URL: str = "http://localhost:3000"
    NEXT_PUBLIC_APP_URL: str = ""

    class Config:
        env_file = str(_ENV_FILE) if _ENV_FILE.is_file() else ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @model_validator(mode="after")
    def sync_supabase_from_public_env(self) -> "Settings":
        """Use NEXT_PUBLIC_SUPABASE_URL when SUPABASE_URL is unset or still default."""
        if self.SUPABASE_URL in ("", "http://localhost:54080"):
            public_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
            if public_url:
                self.SUPABASE_URL = public_url
        if not self.SUPABASE_SERVICE_ROLE_KEY.strip():
            service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
            if service_key:
                self.SUPABASE_SERVICE_ROLE_KEY = service_key
        return self

    @property
    def supabase_jwks_url(self) -> str:
        """JWKS endpoint for ES256/RS256 Supabase Auth tokens."""
        if self.SUPABASE_JWKS_URL.strip():
            return self.SUPABASE_JWKS_URL.strip()
        base = self.SUPABASE_URL.rstrip("/")
        return f"{base}/auth/v1/.well-known/jwks.json"


settings = Settings()
