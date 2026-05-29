"""Service-role Supabase client for server-side operations (bypasses RLS)."""

from supabase import create_client, Client
from services.shared.config import settings


def get_supabase_admin() -> Client:
    """Returns a Supabase client using the service role key.

    This client bypasses Row Level Security and should only be used
    in trusted server-side code (webhook handlers, agent execution).
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
