-- Migration: Add redesign schema changes for Karnex 2.0 (The One Spine Philosophy)

-- 1. Alter tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_output JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS execute_label TEXT,
  ADD COLUMN IF NOT EXISTS auto_executable BOOLEAN DEFAULT FALSE;

-- 2. Alter founders table
ALTER TABLE founders
  ADD COLUMN IF NOT EXISTS last_journey_view TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- 3. Alter integrations table
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS automation_rules JSONB DEFAULT '[]';
