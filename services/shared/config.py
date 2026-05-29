"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Karnex Agent Service configuration.

    All values can be overridden via environment variables or a .env file
    located at the project root.
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
    GEMINI_MODEL: str = "google/gemini-2.5-pro-preview-06-05"
    GEMINI_MODEL_FLASH: str = "google/gemini-2.5-flash-preview-05-20"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
