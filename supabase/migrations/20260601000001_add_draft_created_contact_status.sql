-- ROLLBACK: 
-- ALTER TYPE contact_status DROP VALUE IF EXISTS 'draft_created';

-- Add draft_created status to represent: 
-- "Gmail draft successfully created in founder's Drafts folder,
--  awaiting founder to manually send from Gmail"
-- This preserves the agentrules.md guarantee: 
-- "NEVER send any external communication without explicit founder confirmation"

ALTER TYPE contact_status ADD VALUE IF NOT EXISTS 'draft_created' 
  AFTER 'pending';

COMMENT ON TYPE contact_status IS 
  'pending=not processed, draft_created=Gmail draft exists awaiting founder send, sent=founder confirmed send, opened=tracking pixel fired, replied=reply received, bounced=delivery failed, unsubscribed=opt-out';
