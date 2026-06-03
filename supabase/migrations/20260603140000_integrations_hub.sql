-- Integrations Hub: enum extensions, recipe catalog, automation RLS

-- Extend integration_provider enum
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'vercel';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'resend';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'zapier';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'karnex_hub';

-- Recipe catalog (system seed, read-only for founders)
CREATE TABLE IF NOT EXISTS automation_recipe_catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  trigger_description TEXT NOT NULL,
  action_description TEXT NOT NULL,
  required_providers TEXT[] NOT NULL DEFAULT '{}',
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'condition')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE automation_recipe_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'automation_recipe_catalog' AND policyname = 'automation_recipe_catalog_select_authenticated'
  ) THEN
    CREATE POLICY "automation_recipe_catalog_select_authenticated" ON automation_recipe_catalog
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Seed 5 pre-built recipes
INSERT INTO automation_recipe_catalog (
  id, title, trigger_description, action_description,
  required_providers, trigger_type, trigger_config, sort_order
) VALUES
  (
    'build_and_ship',
    'Build & Ship',
    'Builder Agent completes a task',
    'Create GitHub PR + send email notification',
    ARRAY['github', 'resend'],
    'event',
    '{"event": "builder_task_complete"}'::jsonb,
    1
  ),
  (
    'morning_brief',
    'Morning Brief',
    '8am daily (founder''s timezone)',
    'Send summary of today''s sprint tasks to email',
    ARRAY['resend'],
    'schedule',
    '{"hour": 8, "minute": 0, "days": ["mon","tue","wed","thu","fri","sat","sun"]}'::jsonb,
    2
  ),
  (
    'momentum_alert',
    'Momentum Alert',
    'Momentum Score drops below 40 for 2+ days',
    'Trigger Accountability Agent + send nudge email',
    ARRAY['resend'],
    'condition',
    '{"metric": "momentum_score", "threshold": 40, "consecutive_days": 2}'::jsonb,
    3
  ),
  (
    'outreach_review',
    'Outreach Review',
    'Outreach Agent drafts a campaign',
    'Queue for review at 9am the next day',
    ARRAY['resend'],
    'event',
    '{"event": "outreach_campaign_drafted"}'::jsonb,
    4
  ),
  (
    'weekly_debrief_auto',
    'Weekly Debrief Auto',
    'Friday 5pm (founder''s timezone)',
    'Auto-run Weekly Debrief Agent + email the summary',
    ARRAY['resend'],
    'schedule',
    '{"hour": 17, "minute": 0, "days": ["fri"]}'::jsonb,
    5
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  trigger_description = EXCLUDED.trigger_description,
  action_description = EXCLUDED.action_description,
  required_providers = EXCLUDED.required_providers,
  trigger_type = EXCLUDED.trigger_type,
  trigger_config = EXCLUDED.trigger_config,
  sort_order = EXCLUDED.sort_order;

-- automation_logs: founders can read; writes via service role (no client insert policy)
