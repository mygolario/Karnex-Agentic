-- ROLLBACK:
--   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
--   REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;
--   REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, service_role;
--   REVOKE USAGE ON SCHEMA public FROM anon, authenticated, service_role;
--
-- Purpose:
-- Supabase RLS is the *row* access control layer, but Postgres GRANTs are still required.
-- If the `public` schema is dropped/recreated (or grants reset), API roles may lose table
-- privileges, causing 403/42501 "permission denied for table ..." even for `service_role`.

DO $$
BEGIN
  -- Ensure schema is usable by Supabase API roles
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role';

  -- Start from a clean slate for these API roles (idempotent)
  EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated';

  -- `service_role` is server-only and must be able to operate system provisioning + webhooks.
  -- It bypasses RLS but still needs schema/object privileges.
  EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role';
  EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role';
  EXECUTE 'GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role';

  -- `authenticated` is for logged-in users; keep least-privilege for billing tables.
  -- We grant CRUD on founder-scoped tables (RLS enforces tenant isolation).
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated';
  EXECUTE 'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated';

  -- Lock down billing / system-write tables: authenticated can read only.
  EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscriptions FROM authenticated';
  EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public.payments FROM authenticated';
  EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public.renewal_reminders FROM authenticated';

  -- Do not grant table access to `anon` by default.
  -- (RLS alone is not a substitute; avoid widening attack surface.)

  -- Default privileges: ensure future tables/functions also get correct grants.
  -- Note: applies to objects created *after* this runs, by the migration owner role.
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role';

  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO authenticated';
END $$;

