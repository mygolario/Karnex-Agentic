-- ROLLBACK: ALTER TABLE tasks DROP COLUMN IF EXISTS agent_config, DROP COLUMN IF EXISTS agent_output, DROP COLUMN IF EXISTS execute_label, DROP COLUMN IF EXISTS auto_executable, DROP COLUMN IF EXISTS execution_started_at, DROP COLUMN IF EXISTS execution_completed_at; ALTER TABLE founders DROP COLUMN IF EXISTS last_journey_view, DROP COLUMN IF EXISTS onboarding_step, DROP COLUMN IF EXISTS onboarding_completed_at; ALTER TABLE integrations DROP COLUMN IF EXISTS automation_rules, DROP COLUMN IF EXISTS display_name, DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS icon_url, DROP COLUMN IF EXISTS is_featured; DROP TABLE IF EXISTS automation_logs CASCADE;

-- Update tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS agent_output JSONB DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS execute_label TEXT,
  ADD COLUMN IF NOT EXISTS auto_executable BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN tasks.agent_config IS 
  'Pre-populated by sprint-planner-v1. Contains all inputs needed to run the assigned agent without founder prompting.';
COMMENT ON COLUMN tasks.execute_label IS 
  'Human-readable label for the execute button. E.g. "Let Karnex build this"';
COMMENT ON COLUMN tasks.auto_executable IS 
  'True when agent_config is complete and the task can be executed with one click.';

-- Update founders table
ALTER TABLE founders
  ADD COLUMN IF NOT EXISTS last_journey_view TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN founders.onboarding_step IS 
  '0=not started, 1=pain submitted, 2=hypothesis selected, 3=brief complete, 4=roadmap generated';

-- Update integrations table
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS automation_rules JSONB DEFAULT '[]' NOT NULL,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  status TEXT CHECK (status IN ('triggered', 'success', 'failed')) DEFAULT 'triggered',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent check for RLS policy to ensure clean runs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'automation_logs' AND policyname = 'automation_logs_select_own'
    ) THEN
        CREATE POLICY "automation_logs_select_own" ON automation_logs
          FOR SELECT USING (founder_id = auth.uid());
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_automation_logs_founder ON automation_logs(founder_id, created_at DESC);
