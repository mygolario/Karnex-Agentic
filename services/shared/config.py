"""Application settings loaded from environment variables."""

from pathlib import Path

import os

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
    AGENT_SERVICE_INTERNAL_KEY: str = "dev-internal-key"
    OXAPAY_MERCHANT_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3080"
    KARNEX_WEB_ORIGIN: str = "https://karnex-agentic-web.vercel.app"
    GEMINI_MODEL: str = "google/gemini-2.5-pro-preview-06-05"
    GEMINI_MODEL_FLASH: str = "google/gemini-2.5-flash-preview-05-20"

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


settings = Settings()
