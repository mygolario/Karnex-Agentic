-- ROLLBACK:
-- DROP FUNCTION IF EXISTS acquire_integration_lock(UUID);

CREATE OR REPLACE FUNCTION acquire_integration_lock(p_founder_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  -- Request a transaction-level advisory lock using a derived integer hash of the founder_id UUID
  PERFORM pg_advisory_xact_lock(hashtext(p_founder_id::text));
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
