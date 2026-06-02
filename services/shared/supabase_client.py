"""Service-role Supabase client for server-side operations (bypasses RLS)."""

from supabase import create_client, Client
from shared.config import settings


_supabase_admin_instance = None

def get_supabase_admin() -> Client:
    """Returns a Supabase client using the service role key.

    This client bypasses Row Level Security and should only be used
    in trusted server-side code (webhook handlers, agent execution).
    """
    global _supabase_admin_instance
    if _supabase_admin_instance is None:
        _supabase_admin_instance = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin_instance
