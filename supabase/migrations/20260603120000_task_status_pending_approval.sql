-- Add pending_approval for outreach tasks awaiting founder review (Tier 3 STOP)
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'pending_approval';
