-- ROLLBACK: DROP SCHEMA public CASCADE; CREATE SCHEMA public;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Enum Types
CREATE TYPE agent_status AS ENUM ('queued', 'running', 'success', 'partial', 'error', 'cancelled', 'timeout');
CREATE TYPE subscription_plan AS ENUM ('starter', 'builder', 'founder', 'studio');
CREATE TYPE subscription_status AS ENUM ('trialing', 'pending_payment', 'active', 'expiring_soon', 'expired', 'cancelled');
CREATE TYPE stablecoin_currency AS ENUM ('USDT', 'USDC');
CREATE TYPE payment_status AS ENUM ('pending', 'confirming', 'confirmed', 'expired', 'failed');
CREATE TYPE reminder_type AS ENUM ('5_day', '1_day', 'expired');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked', 'deferred');
CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
CREATE TYPE contact_status AS ENUM ('pending', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed');
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_approval', 'approved', 'sending', 'active', 'paused', 'completed');
CREATE TYPE integration_provider AS ENUM ('github', 'gmail', 'linkedin', 'stripe [v2 - deferred]', 'notion', 'airtable', 'posthog', 'calcom');
CREATE TYPE integration_status AS ENUM ('active', 'expired', 'revoked', 'error');
CREATE TYPE milestone_status AS ENUM ('not_started', 'in_progress', 'at_risk', 'completed', 'missed');
CREATE TYPE idea_status AS ENUM ('hypothesis', 'exploring', 'validated', 'rejected', 'selected');
CREATE TYPE roadmap_phase AS ENUM ('phase_1', 'phase_2', 'phase_3');
CREATE TYPE decision_reversibility AS ENUM ('easily_reversible', 'hard_to_reverse', 'irreversible');
CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');

-- Table: founders
CREATE TABLE founders (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  technical_level TEXT CHECK (technical_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  weekly_hours_available INTEGER CHECK (weekly_hours_available BETWEEN 1 AND 80) DEFAULT 20,
  primary_goal TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  current_startup_id UUID, -- FK constraint added later to avoid circular dependency
  momentum_score INTEGER CHECK (momentum_score BETWEEN 0 AND 100) DEFAULT 50,
  last_standup_at TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  communication_tone TEXT CHECK (communication_tone IN ('formal', 'casual', 'direct')) DEFAULT 'direct',
  preferred_agent_speed TEXT CHECK (preferred_agent_speed IN ('fast', 'thorough')) DEFAULT 'thorough',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: startups
CREATE TABLE startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  industry TEXT,
  target_audience TEXT,
  stage TEXT CHECK (stage IN ('ideation', 'validation', 'building', 'launching', 'growing')) DEFAULT 'ideation',
  is_active BOOLEAN DEFAULT TRUE,
  website_url TEXT,
  github_repo_url TEXT,
  landing_page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add current_startup_id FK to founders now that startups exists
ALTER TABLE founders ADD CONSTRAINT fk_founders_current_startup
  FOREIGN KEY (current_startup_id) REFERENCES startups(id) ON DELETE SET NULL;

-- Table: ideas
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pain_description TEXT NOT NULL,
  problem_statement TEXT,
  proposed_solution TEXT,
  pain_intensity_score INTEGER CHECK (pain_intensity_score BETWEEN 0 AND 100),
  market_size_score INTEGER CHECK (market_size_score BETWEEN 0 AND 100),
  buildability_score INTEGER CHECK (buildability_score BETWEEN 0 AND 100),
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  product_brief JSONB,
  icp_document JSONB,
  competitive_landscape JSONB,
  status idea_status DEFAULT 'hypothesis',
  selected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  generated_by TEXT DEFAULT 'pain-transformer-v1',
  agent_run_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: roadmaps
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '90-Day Roadmap',
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  phases JSONB NOT NULL,
  current_phase roadmap_phase DEFAULT 'phase_1',
  founder_capacity_hours INTEGER,
  technical_level TEXT,
  budget_monthly INTEGER,
  generated_by TEXT DEFAULT 'war-room-v1',
  agent_run_id UUID,
  start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: sprints
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  sprint_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  focus_area TEXT,
  capacity_hours INTEGER,
  status sprint_status DEFAULT 'planned',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  retro_notes TEXT,
  lessons_learned JSONB DEFAULT '[]',
  generated_by TEXT DEFAULT 'sprint-planner-v1',
  agent_run_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
  estimated_hours NUMERIC(4,1),
  actual_hours NUMERIC(4,1),
  category TEXT CHECK (category IN ('build', 'research', 'outreach', 'content', 'design', 'finance', 'legal', 'other')) DEFAULT 'other',
  delegated_to_agent TEXT,
  agent_run_id UUID,
  status task_status DEFAULT 'todo',
  completed_at TIMESTAMPTZ,
  blocked_reason TEXT,
  definition_of_done TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: agent_runs
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT 'v1',
  status agent_status DEFAULT 'queued',
  input JSONB NOT NULL DEFAULT '{}',
  triggered_by TEXT NOT NULL DEFAULT 'user',
  parent_run_id UUID REFERENCES agent_runs(id),
  chain_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  llm_model TEXT,
  tools_called TEXT[] DEFAULT '{}',
  integrations_called TEXT[] DEFAULT '{}',
  error_message TEXT,
  error_type TEXT,
  retry_count INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: agent_outputs
CREATE TABLE agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID NOT NULL UNIQUE REFERENCES agent_runs(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL,
  output JSONB NOT NULL,
  confidence confidence_level DEFAULT 'medium',
  confidence_rationale TEXT,
  suggested_next_agent TEXT,
  handoff_context JSONB,
  memory_updates JSONB DEFAULT '[]',
  has_flags BOOLEAN DEFAULT FALSE,
  flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  status integration_status DEFAULT 'active',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(founder_id, provider)
);

-- Table: subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL UNIQUE REFERENCES founders(id) ON DELETE CASCADE,
  plan subscription_plan DEFAULT 'starter' NOT NULL,
  status subscription_status DEFAULT 'trialing' NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  renewed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  tasks_used_this_cycle INTEGER DEFAULT 0 NOT NULL,
  tasks_limit INTEGER DEFAULT 100 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  oxapay_track_id TEXT UNIQUE NOT NULL,
  oxapay_order_id TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  currency stablecoin_currency NOT NULL,
  amount_crypto NUMERIC(18,8), -- Optional at creation, populated on confirm
  status payment_status DEFAULT 'pending' NOT NULL,
  plan subscription_plan NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  raw_webhook_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: renewal_reminders
CREATE TABLE renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  reminder_type reminder_type NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  payment_link TEXT NOT NULL,
  payment_link_expires TIMESTAMPTZ NOT NULL,
  opened BOOLEAN DEFAULT FALSE NOT NULL,
  converted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: founder_memory
CREATE TABLE founder_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  ttl TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(founder_id, namespace, key)
);

-- Table: decisions
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  alternatives_considered JSONB DEFAULT '[]',
  category TEXT CHECK (category IN ('product', 'technical', 'market', 'financial', 'team', 'strategy', 'pivot')),
  reversibility decision_reversibility DEFAULT 'easily_reversible',
  confidence confidence_level DEFAULT 'medium',
  expected_outcome TEXT,
  actual_outcome TEXT,
  outcome_reviewed_at TIMESTAMPTZ,
  outcome_matched BOOLEAN,
  related_agent_run_id UUID REFERENCES agent_runs(id),
  related_milestone_id UUID, -- FK constraint added later
  tags TEXT[] DEFAULT '{}',
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  review_by TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  phase roadmap_phase NOT NULL,
  target_date DATE,
  target_metric TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  status milestone_status DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add decisions FK to milestones now that table exists
ALTER TABLE decisions ADD CONSTRAINT fk_decisions_milestone
  FOREIGN KEY (related_milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;

-- Table: outreach_campaigns
CREATE TABLE outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  channel TEXT CHECK (channel IN ('email', 'linkedin', 'both')) DEFAULT 'email',
  message_templates JSONB NOT NULL DEFAULT '[]',
  status campaign_status DEFAULT 'draft',
  approved_at TIMESTAMPTZ,
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  generated_by TEXT DEFAULT 'outreach-v1',
  agent_run_id UUID REFERENCES agent_runs(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: outreach_contacts
CREATE TABLE outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  title TEXT,
  linkedin_url TEXT,
  personalization_data JSONB DEFAULT '{}',
  status contact_status DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'neutral', 'negative', 'unsubscribe')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Triggers for moddatetime updated_at auto-updates
CREATE TRIGGER set_founders_updated_at BEFORE UPDATE ON founders FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_startups_updated_at BEFORE UPDATE ON startups FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_ideas_updated_at BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_roadmaps_updated_at BEFORE UPDATE ON roadmaps FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_agent_runs_updated_at BEFORE UPDATE ON agent_runs FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_memory_updated_at BEFORE UPDATE ON founder_memory FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON outreach_campaigns FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON outreach_contacts FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Database Indexes
CREATE INDEX idx_founders_current_startup ON founders(current_startup_id);
CREATE INDEX idx_startups_founder ON startups(founder_id);
CREATE INDEX idx_startups_founder_active ON startups(founder_id) WHERE is_active = TRUE;
CREATE INDEX idx_ideas_startup ON ideas(startup_id, created_at DESC);
CREATE INDEX idx_ideas_founder ON ideas(founder_id);
CREATE INDEX idx_ideas_status ON ideas(startup_id, status);
CREATE INDEX idx_roadmaps_startup ON roadmaps(startup_id);
CREATE INDEX idx_roadmaps_startup_active ON roadmaps(startup_id) WHERE is_active = TRUE;
CREATE INDEX idx_sprints_roadmap ON sprints(roadmap_id, sprint_number);
CREATE INDEX idx_sprints_founder ON sprints(founder_id, week_start DESC);
CREATE INDEX idx_sprints_status ON sprints(founder_id, status);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id, priority);
CREATE INDEX idx_tasks_founder_status ON tasks(founder_id, status);
CREATE INDEX idx_tasks_sprint_status ON tasks(sprint_id, status);
CREATE INDEX idx_agent_runs_founder_status ON agent_runs(founder_id, status);
CREATE INDEX idx_agent_runs_founder_created ON agent_runs(founder_id, created_at DESC);
CREATE INDEX idx_agent_runs_agent_id ON agent_runs(agent_id, created_at DESC);
CREATE INDEX idx_agent_runs_chain ON agent_runs(chain_id) WHERE chain_id IS NOT NULL;
CREATE INDEX idx_agent_runs_status ON agent_runs(status) WHERE status IN ('queued', 'running');
CREATE INDEX idx_agent_outputs_founder ON agent_outputs(founder_id, created_at DESC);
CREATE INDEX idx_agent_outputs_type ON agent_outputs(founder_id, output_type);
CREATE INDEX idx_integrations_founder ON integrations(founder_id);
CREATE INDEX idx_integrations_provider ON integrations(founder_id, provider);
CREATE INDEX idx_subscriptions_founder ON subscriptions(founder_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_founder ON payments(founder_id);
CREATE INDEX idx_payments_track ON payments(oxapay_track_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_reminders_founder ON renewal_reminders(founder_id);
CREATE INDEX idx_reminders_subscription ON renewal_reminders(subscription_id);
CREATE INDEX idx_memory_founder_ns_key ON founder_memory(founder_id, namespace, key);
CREATE INDEX idx_memory_founder_tags ON founder_memory USING GIN(tags);
CREATE INDEX idx_memory_ttl ON founder_memory(ttl) WHERE ttl IS NOT NULL;
CREATE INDEX idx_decisions_startup ON decisions(startup_id, decided_at DESC);
CREATE INDEX idx_decisions_founder ON decisions(founder_id, decided_at DESC);
CREATE INDEX idx_decisions_review ON decisions(review_by) WHERE actual_outcome IS NULL;
CREATE INDEX idx_milestones_roadmap ON milestones(roadmap_id, phase);
CREATE INDEX idx_milestones_founder ON milestones(founder_id, status);
CREATE INDEX idx_campaigns_startup ON outreach_campaigns(startup_id, created_at DESC);
CREATE INDEX idx_campaigns_founder ON outreach_campaigns(founder_id);
CREATE INDEX idx_campaigns_status ON outreach_campaigns(founder_id, status);
CREATE INDEX idx_contacts_campaign ON outreach_contacts(campaign_id, status);
CREATE INDEX idx_contacts_founder ON outreach_contacts(founder_id);
CREATE INDEX idx_contacts_email ON outreach_contacts(email);

-- Row Level Security (RLS) Enablement
ALTER TABLE founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Direct founder-scoped read/write tables:
CREATE POLICY "founders_select_self" ON founders FOR SELECT USING (id = auth.uid());
CREATE POLICY "founders_update_self" ON founders FOR UPDATE USING (id = auth.uid());

CREATE POLICY "startups_all_own" ON startups FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "ideas_all_own" ON ideas FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "roadmaps_all_own" ON roadmaps FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "sprints_all_own" ON sprints FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "tasks_all_own" ON tasks FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "agent_runs_all_own" ON agent_runs FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "agent_outputs_all_own" ON agent_outputs FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "integrations_all_own" ON integrations FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "founder_memory_all_own" ON founder_memory FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "decisions_all_own" ON decisions FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "milestones_all_own" ON milestones FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "campaigns_all_own" ON outreach_campaigns FOR ALL USING (founder_id = auth.uid());
CREATE POLICY "contacts_all_own" ON outreach_contacts FOR ALL USING (founder_id = auth.uid());

-- Billing tables (Select-only, write is system/service-role restricted)
CREATE POLICY "subscriptions_read_own" ON subscriptions FOR SELECT TO authenticated USING (founder_id = auth.uid());
CREATE POLICY "payments_read_own" ON payments FOR SELECT TO authenticated USING (founder_id = auth.uid());
CREATE POLICY "renewal_reminders_read_own" ON renewal_reminders FOR SELECT TO authenticated USING (founder_id = auth.uid());

-- Custom database functions
CREATE OR REPLACE FUNCTION deduct_agent_credit(p_founder_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tasks_used INTEGER;
  v_tasks_limit INTEGER;
  v_status subscription_status;
  remaining INTEGER;
BEGIN
  -- Acquire explicit transaction lock on the subscription row to prevent race conditions
  SELECT tasks_used_this_cycle, tasks_limit, status
  INTO v_tasks_used, v_tasks_limit, v_status
  FROM subscriptions
  WHERE founder_id = p_founder_id
  FOR UPDATE;
  
  IF v_status IS NULL OR v_status != 'active' THEN
    RAISE EXCEPTION 'No active subscription found';
  END IF;
  
  IF v_tasks_used >= v_tasks_limit THEN
    RAISE EXCEPTION 'No tasks remaining in the current cycle';
  END IF;
  
  -- Update the locked row
  UPDATE subscriptions
  SET tasks_used_this_cycle = tasks_used_this_cycle + 1,
      updated_at = NOW()
  WHERE founder_id = p_founder_id
  RETURNING (tasks_limit - tasks_used_this_cycle) INTO remaining;
  
  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
