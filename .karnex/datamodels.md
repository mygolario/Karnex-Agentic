# Karnex — Data Models

> **Complete Supabase/PostgreSQL schema specification.** Every table, column, constraint, relationship, RLS policy, and key query.

---

## Enum Types

```sql
-- Agent execution status
CREATE TYPE agent_status AS ENUM ('queued', 'running', 'success', 'partial', 'error', 'cancelled', 'timeout');

-- Subscription plans (OxaPay v1 pricing)
CREATE TYPE subscription_plan AS ENUM ('starter', 'builder', 'founder', 'studio');

-- Subscription statuses
CREATE TYPE subscription_status AS ENUM ('trialing', 'pending_payment', 'active', 'expiring_soon', 'expired', 'cancelled');

-- Stablecoin currencies (v1 stablecoin-only policy)
CREATE TYPE stablecoin_currency AS ENUM ('USDT', 'USDC');

-- Payment record statuses
CREATE TYPE payment_status AS ENUM ('pending', 'confirming', 'confirmed', 'expired', 'failed');

-- Renewal reminders email types
CREATE TYPE reminder_type AS ENUM ('5_day', '1_day', 'expired');

-- Task status
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked', 'deferred');

-- Sprint status
CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');

-- Outreach contact status
CREATE TYPE contact_status AS ENUM ('pending', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed');

-- Campaign status
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_approval', 'approved', 'sending', 'active', 'paused', 'completed');

-- Integration provider
# [v2 - deferred] Stripe - not in v1
CREATE TYPE integration_provider AS ENUM ('github', 'gmail', 'linkedin', 'stripe [v2 - deferred]', 'notion', 'airtable', 'posthog', 'calcom');

-- Integration status
CREATE TYPE integration_status AS ENUM ('active', 'expired', 'revoked', 'error');

-- Milestone status
CREATE TYPE milestone_status AS ENUM ('not_started', 'in_progress', 'at_risk', 'completed', 'missed');

-- Idea status
CREATE TYPE idea_status AS ENUM ('hypothesis', 'exploring', 'validated', 'rejected', 'selected');

-- Roadmap phase
CREATE TYPE roadmap_phase AS ENUM ('phase_1', 'phase_2', 'phase_3');

-- Decision reversibility
CREATE TYPE decision_reversibility AS ENUM ('easily_reversible', 'hard_to_reverse', 'irreversible');

-- Confidence level
CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');
```

---

## Table: `founders`

Extends Supabase `auth.users` with founder-specific profile data.

```sql
CREATE TABLE founders (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile
  full_name TEXT NOT NULL,
  display_name TEXT,                          -- How the founder wants to be addressed
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/New_York',    -- IANA timezone for scheduling
  
  -- Founder context
  technical_level TEXT CHECK (technical_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  weekly_hours_available INTEGER CHECK (weekly_hours_available BETWEEN 1 AND 80) DEFAULT 20,
  primary_goal TEXT,                          -- Free text: "Build my first SaaS" etc.
  
  -- Karnex state
  onboarding_completed BOOLEAN DEFAULT FALSE,
  current_startup_id UUID,                    -- FK added after startups table exists
  momentum_score INTEGER CHECK (momentum_score BETWEEN 0 AND 100) DEFAULT 50,
  last_standup_at TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,              -- Consecutive days with activity
  
  -- Preferences
  communication_tone TEXT CHECK (communication_tone IN ('formal', 'casual', 'direct')) DEFAULT 'direct',
  preferred_agent_speed TEXT CHECK (preferred_agent_speed IN ('fast', 'thorough')) DEFAULT 'thorough',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_founders_current_startup ON founders(current_startup_id);

-- Auto-update updated_at
CREATE TRIGGER set_founders_updated_at
  BEFORE UPDATE ON founders
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `startups`

A founder's product/project. MVP supports one active startup per founder.

```sql
CREATE TABLE startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Product info
  name TEXT NOT NULL,                          -- Product name (from Idea Crystallizer)
  tagline TEXT,                                -- One-liner
  description TEXT,                            -- Elevator pitch (2-3 sentences)
  industry TEXT,                               -- e.g., "SaaS", "Fintech", "EdTech"
  target_audience TEXT,                        -- Brief ICP summary
  
  -- Status
  stage TEXT CHECK (stage IN ('ideation', 'validation', 'building', 'launching', 'growing')) DEFAULT 'ideation',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- External links
  website_url TEXT,
  github_repo_url TEXT,
  landing_page_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_startups_founder ON startups(founder_id);
CREATE INDEX idx_startups_founder_active ON startups(founder_id) WHERE is_active = TRUE;

-- Add FK to founders after startups table exists
ALTER TABLE founders ADD CONSTRAINT fk_founders_current_startup
  FOREIGN KEY (current_startup_id) REFERENCES startups(id) ON DELETE SET NULL;

CREATE TRIGGER set_startups_updated_at
  BEFORE UPDATE ON startups
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `ideas`

Product hypotheses generated by Dream Engine agents.

```sql
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Idea content
  title TEXT NOT NULL,                         -- Short title for the idea
  pain_description TEXT NOT NULL,              -- Original pain input from founder
  problem_statement TEXT,                      -- Structured problem statement
  proposed_solution TEXT,                      -- How this idea solves the problem
  
  -- Scoring (from Pain-to-Product Transformer)
  pain_intensity_score INTEGER CHECK (pain_intensity_score BETWEEN 0 AND 100),
  market_size_score INTEGER CHECK (market_size_score BETWEEN 0 AND 100),
  buildability_score INTEGER CHECK (buildability_score BETWEEN 0 AND 100),
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  
  -- Product brief (from Idea Crystallizer, stored as JSON)
  product_brief JSONB,                        -- Full product brief document
  icp_document JSONB,                         -- ICP from ICP Definer
  competitive_landscape JSONB,                -- Competitor analysis
  
  -- Status
  status idea_status DEFAULT 'hypothesis',
  selected_at TIMESTAMPTZ,                    -- When founder selected this idea
  rejected_reason TEXT,                       -- Why it was rejected (if applicable)
  
  -- Source agent
  generated_by TEXT DEFAULT 'pain-transformer-v1',  -- Agent that created this
  agent_run_id UUID,                          -- The specific agent run
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_ideas_startup ON ideas(startup_id, created_at DESC);
CREATE INDEX idx_ideas_founder ON ideas(founder_id);
CREATE INDEX idx_ideas_status ON ideas(startup_id, status);

CREATE TRIGGER set_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `roadmaps`

90-day roadmaps generated by the War Room agent.

```sql
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Roadmap content
  title TEXT NOT NULL DEFAULT '90-Day Roadmap',
  version INTEGER DEFAULT 1,                   -- Roadmap version (re-generated = new version)
  is_active BOOLEAN DEFAULT TRUE,              -- Only one active roadmap per startup
  
  -- Plan structure (stored as structured JSON)
  phases JSONB NOT NULL,                       -- Array of 3 phases with milestones, goals, gates
  current_phase roadmap_phase DEFAULT 'phase_1',
  
  -- Founder inputs used to generate
  founder_capacity_hours INTEGER,              -- Hours/week available
  technical_level TEXT,
  budget_monthly INTEGER,                      -- Monthly budget in USD
  
  -- Source
  generated_by TEXT DEFAULT 'war-room-v1',
  agent_run_id UUID,
  
  -- Timestamps
  start_date DATE,                             -- When the 90-day clock starts
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_roadmaps_startup ON roadmaps(startup_id);
CREATE INDEX idx_roadmaps_startup_active ON roadmaps(startup_id) WHERE is_active = TRUE;

CREATE TRIGGER set_roadmaps_updated_at
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `sprints`

Weekly sprints generated by the Sprint Planner agent.

```sql
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Sprint info
  sprint_number INTEGER NOT NULL,              -- 1, 2, 3, ... 12
  title TEXT NOT NULL,                         -- "Week 3: Build Landing Page"
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Sprint content
  goals JSONB NOT NULL DEFAULT '[]',           -- ["Deploy landing page", "Set up analytics"]
  focus_area TEXT,                             -- "Building" | "Research" | "Outreach"
  capacity_hours INTEGER,                      -- Available hours this week
  
  -- Status
  status sprint_status DEFAULT 'planned',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  
  -- Retrospective (filled during Weekly Debrief)
  retro_notes TEXT,
  lessons_learned JSONB DEFAULT '[]',
  
  -- Source
  generated_by TEXT DEFAULT 'sprint-planner-v1',
  agent_run_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_sprints_roadmap ON sprints(roadmap_id, sprint_number);
CREATE INDEX idx_sprints_founder ON sprints(founder_id, week_start DESC);
CREATE INDEX idx_sprints_status ON sprints(founder_id, status);

CREATE TRIGGER set_sprints_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `tasks`

Individual tasks within sprints.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Task info
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,  -- 1=highest
  estimated_hours NUMERIC(4,1),                -- Estimated effort
  actual_hours NUMERIC(4,1),                   -- Actual effort (logged by founder)
  
  -- Categorization
  category TEXT CHECK (category IN ('build', 'research', 'outreach', 'content', 'design', 'finance', 'legal', 'other')) DEFAULT 'other',
  delegated_to_agent TEXT,                     -- Agent ID if this task is agent-executed
  agent_run_id UUID,                           -- Associated agent run (if delegated)
  
  -- Status
  status task_status DEFAULT 'todo',
  completed_at TIMESTAMPTZ,
  blocked_reason TEXT,                         -- Why this task is blocked
  
  -- Definition of done
  definition_of_done TEXT,                     -- Clear acceptance criteria
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id, priority);
CREATE INDEX idx_tasks_founder_status ON tasks(founder_id, status);
CREATE INDEX idx_tasks_sprint_status ON tasks(sprint_id, status);

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `agent_runs`

Execution log for every agent run. Core observability table.

```sql
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Agent info
  agent_id TEXT NOT NULL,                      -- "pain-transformer-v1"
  agent_version TEXT NOT NULL DEFAULT 'v1',
  
  -- Execution
  status agent_status DEFAULT 'queued',
  input JSONB NOT NULL DEFAULT '{}',           -- Agent input payload
  
  -- Trigger context
  triggered_by TEXT NOT NULL DEFAULT 'user',   -- "user" | "agent:{agent-id}" | "schedule" | "webhook"
  parent_run_id UUID REFERENCES agent_runs(id),-- If triggered by another agent
  chain_id UUID,                               -- Groups runs in a multi-agent chain
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Resource usage
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  llm_model TEXT,                              -- "gemini-2.0-flash", "gemini-2.5-pro"
  tools_called TEXT[] DEFAULT '{}',            -- List of tools invoked
  integrations_called TEXT[] DEFAULT '{}',     -- External services called
  
  -- Error handling
  error_message TEXT,
  error_type TEXT,                             -- "transient", "input_error", "agent_failure", etc.
  retry_count INTEGER DEFAULT 0,
  
  -- Billing
  credits_consumed INTEGER DEFAULT 1,          -- Agent task credits used
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_agent_runs_founder_status ON agent_runs(founder_id, status);
CREATE INDEX idx_agent_runs_founder_created ON agent_runs(founder_id, created_at DESC);
CREATE INDEX idx_agent_runs_agent_id ON agent_runs(agent_id, created_at DESC);
CREATE INDEX idx_agent_runs_chain ON agent_runs(chain_id) WHERE chain_id IS NOT NULL;
CREATE INDEX idx_agent_runs_status ON agent_runs(status) WHERE status IN ('queued', 'running');

CREATE TRIGGER set_agent_runs_updated_at
  BEFORE UPDATE ON agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `agent_outputs`

Stored outputs from agent runs. Separated from `agent_runs` to keep the runs table lean.

```sql
CREATE TABLE agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID NOT NULL UNIQUE REFERENCES agent_runs(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Output
  output_type TEXT NOT NULL,                   -- "product_hypothesis", "sprint_plan", "code_artifact", etc.
  output JSONB NOT NULL,                       -- Structured agent output
  
  -- Quality
  confidence confidence_level DEFAULT 'medium',
  confidence_rationale TEXT,
  
  -- Handoff
  suggested_next_agent TEXT,                   -- Agent ID for recommended next step
  handoff_context JSONB,                       -- Context to pass to next agent
  
  -- Memory updates
  memory_updates JSONB DEFAULT '[]',           -- What was written to Karnex Memory
  
  -- Flags (from 3-tier escalation)
  has_flags BOOLEAN DEFAULT FALSE,
  flags JSONB DEFAULT '[]',                    -- [{type: "flag", message: "..."}]
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_agent_outputs_founder ON agent_outputs(founder_id, created_at DESC);
CREATE INDEX idx_agent_outputs_type ON agent_outputs(founder_id, output_type);
```

---

## Table: `integrations`

Third-party service connections per founder.

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Integration info
  provider integration_provider NOT NULL,
  status integration_status DEFAULT 'active',
  
  -- Tokens (encrypted via Supabase Vault or pgcrypto)
  access_token_encrypted TEXT,                 -- Encrypted access token
  refresh_token_encrypted TEXT,                -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  
  -- Permissions
  scopes TEXT[] DEFAULT '{}',                  -- OAuth scopes granted
  
  -- Provider-specific metadata
  metadata JSONB DEFAULT '{}',                 -- e.g., {"github_username": "...", "repo_name": "..."}
  
  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(founder_id, provider)
);

-- Indexes
CREATE INDEX idx_integrations_founder ON integrations(founder_id);
CREATE INDEX idx_integrations_provider ON integrations(founder_id, provider);

CREATE TRIGGER set_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `subscriptions`

Self-managed subscription states. The source of truth for a founder's tier and usage bounds.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL UNIQUE REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Plan configuration
  plan subscription_plan DEFAULT 'starter' NOT NULL,
  status subscription_status DEFAULT 'trialing' NOT NULL,
  
  -- Cycle dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  renewed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Credit Metering
  tasks_used_this_cycle INTEGER DEFAULT 0 NOT NULL,
  tasks_limit INTEGER DEFAULT 100 NOT NULL, -- set by plan (e.g. 100, 500, 0=unlimited)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_subscriptions_founder ON subscriptions(founder_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `payments`

Tracks payments made via OxaPay. Used to audit transactions, sync states, and compile revenue dashboards.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- OxaPay references
  oxapay_track_id TEXT UNIQUE NOT NULL,       -- OxaPay's transaction/tracking ID
  oxapay_order_id TEXT NOT NULL,              -- Our reference ID sent to OxaPay
  
  -- Financial details
  amount_usd NUMERIC(10,2) NOT NULL,
  currency stablecoin_currency NOT NULL,      -- USDT or USDC
  amount_crypto NUMERIC(18,8) NOT NULL,       -- Actual crypto amount paid
  
  -- Status and plan scope
  status payment_status DEFAULT 'pending' NOT NULL,
  plan subscription_plan NOT NULL,
  
  -- Period coverage
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Webhook audits
  webhook_received_at TIMESTAMPTZ,
  raw_webhook_payload JSONB,                  -- Entire OxaPay callback payload for debugging
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_payments_founder ON payments(founder_id);
CREATE INDEX idx_payments_track ON payments(oxapay_track_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `renewal_reminders`

Audits automated Resend renewal notifications sent to founders to prevent gaps in billing.

```sql
CREATE TABLE renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Reminder context
  reminder_type reminder_type NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Link metadata
  payment_link TEXT NOT NULL,                 -- The OxaPay hosted payment invoice URL sent
  payment_link_expires TIMESTAMPTZ NOT NULL,
  
  -- Engagement tracking
  opened BOOLEAN DEFAULT FALSE NOT NULL,
  converted BOOLEAN DEFAULT FALSE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_reminders_founder ON renewal_reminders(founder_id);
CREATE INDEX idx_reminders_subscription ON renewal_reminders(subscription_id);
```

---

## Table: `founder_memory`

Karnex Memory — persistent context engine for all agents.

```sql
CREATE TABLE founder_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Memory key
  namespace TEXT NOT NULL,                     -- Agent or system namespace
  key TEXT NOT NULL,                           -- Descriptive key
  
  -- Memory value
  value JSONB NOT NULL,                        -- Structured data
  tags TEXT[] DEFAULT '{}',                    -- Searchable tags
  
  -- Lifecycle
  ttl TIMESTAMPTZ,                             -- Optional auto-expiry timestamp
  access_count INTEGER DEFAULT 0,              -- How many times this entry was read
  last_accessed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(founder_id, namespace, key)
);

-- Indexes
CREATE INDEX idx_memory_founder_ns_key ON founder_memory(founder_id, namespace, key);
CREATE INDEX idx_memory_founder_tags ON founder_memory USING GIN(tags);
CREATE INDEX idx_memory_ttl ON founder_memory(ttl) WHERE ttl IS NOT NULL;

CREATE TRIGGER set_memory_updated_at
  BEFORE UPDATE ON founder_memory
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `decisions`

Decision Journal entries.

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Decision content
  title TEXT NOT NULL,                         -- Brief decision title
  description TEXT NOT NULL,                   -- What was decided
  rationale TEXT,                              -- Why this choice was made
  alternatives_considered JSONB DEFAULT '[]',  -- [{option: "...", pros: [...], cons: [...]}]
  
  -- Classification
  category TEXT CHECK (category IN ('product', 'technical', 'market', 'financial', 'team', 'strategy', 'pivot')),
  reversibility decision_reversibility DEFAULT 'easily_reversible',
  confidence confidence_level DEFAULT 'medium',
  
  -- Outcome tracking
  expected_outcome TEXT,                       -- What we predicted would happen
  actual_outcome TEXT,                         -- What actually happened (filled later)
  outcome_reviewed_at TIMESTAMPTZ,
  outcome_matched BOOLEAN,                     -- Did actual match expected?
  
  -- Context
  related_agent_run_id UUID REFERENCES agent_runs(id),
  related_milestone_id UUID,                   -- FK added after milestones table
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  review_by TIMESTAMPTZ,                       -- When to review outcome
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_decisions_startup ON decisions(startup_id, decided_at DESC);
CREATE INDEX idx_decisions_founder ON decisions(founder_id, decided_at DESC);
CREATE INDEX idx_decisions_review ON decisions(review_by) WHERE actual_outcome IS NULL;

CREATE TRIGGER set_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `milestones`

Milestone definitions and tracking.

```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Milestone info
  title TEXT NOT NULL,                         -- "Product brief complete"
  description TEXT,
  phase roadmap_phase NOT NULL,                -- Which phase this belongs to
  
  -- Target
  target_date DATE,
  target_metric TEXT,                          -- "10 customer interviews completed"
  target_value NUMERIC,                        -- 10
  current_value NUMERIC DEFAULT 0,             -- 7
  
  -- Status
  status milestone_status DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_milestones_roadmap ON milestones(roadmap_id, phase);
CREATE INDEX idx_milestones_founder ON milestones(founder_id, status);

-- Add FK from decisions to milestones
ALTER TABLE decisions ADD CONSTRAINT fk_decisions_milestone
  FOREIGN KEY (related_milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;

CREATE TRIGGER set_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `outreach_campaigns`

Email/LinkedIn outreach campaigns.

```sql
CREATE TABLE outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Campaign info
  name TEXT NOT NULL,                          -- "Beta Launch Outreach"
  goal TEXT NOT NULL,                          -- "Get 20 beta signups from SaaS founders"
  channel TEXT CHECK (channel IN ('email', 'linkedin', 'both')) DEFAULT 'email',
  
  -- Campaign content
  message_templates JSONB NOT NULL DEFAULT '[]',
  status campaign_status DEFAULT 'draft',
  approved_at TIMESTAMPTZ,                     -- When founder approved sending
  
  -- Metrics
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  
  -- Source
  generated_by TEXT DEFAULT 'outreach-v1',
  agent_run_id UUID REFERENCES agent_runs(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_campaigns_startup ON outreach_campaigns(startup_id, created_at DESC);
CREATE INDEX idx_campaigns_founder ON outreach_campaigns(founder_id);
CREATE INDEX idx_campaigns_status ON outreach_campaigns(founder_id, status);

CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON outreach_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Table: `outreach_contacts`

Individual contacts within outreach campaigns.

```sql
CREATE TABLE outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Contact info
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  title TEXT,                                  -- Job title
  linkedin_url TEXT,
  
  -- Personalization
  personalization_data JSONB DEFAULT '{}',     -- {"pain_point": "...", "mutual_connection": "..."}
  
  -- Status
  status contact_status DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,              -- Which message step they're on
  
  -- Engagement tracking
  last_sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_sentiment TEXT CHECK (reply_sentiment IN ('positive', 'neutral', 'negative', 'unsubscribe')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_contacts_campaign ON outreach_contacts(campaign_id, status);
CREATE INDEX idx_contacts_founder ON outreach_contacts(founder_id);
CREATE INDEX idx_contacts_email ON outreach_contacts(email);

CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON outreach_contacts
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

---

## Text-Based ERD

```
┌──────────────┐
│  auth.users  │ (Supabase managed)
│──────────────│
│ id (PK)      │
│ email        │
│ ...          │
└──────┬───────┘
       │ 1:1
       ▼
┌──────────────────┐     1:1     ┌──────────────────┐
│    founders      │────────────▶│  subscriptions   │
│──────────────────│             │──────────────────│
│ id (PK/FK)       │             │ id (PK)          │
│ full_name        │             │ plan             │
│ momentum_score   │             │ status           │
│ current_startup_id│            │ tasks_used       │
│ streak_days      │             │ tasks_limit      │
└──────┬───┬───┬───┘             └────────┬─────────┘
       │   │   │                              │
       │   │   └────────────────┐             │ 1:N
       │   │ 1:N                │ 1:N         ▼
       │   ├──────────────┐     │        ┌──────────────────┐
       │   │              │     │        │    payments      │
       ▼   ▼              ▼     ▼        │──────────────────│
 ┌───────────┐      ┌─────────────┐      │ id (PK)          │
 │ startups  │      │ agent_runs  │      │ oxapay_track_id  │
 │───────────│      │─────────────│      │ status           │
 │ id (PK)   │      │ id (PK)     │      │ amount_usd       │
 │ name      │      │ agent_id    │      │ currency         │
 └─────┬─────┘      │ status      │      └──────────────────┘
       │            └─────┬───────┘
       │ 1:N              │ 1:1
       ├────────┐         ▼
       ▼        ▼   ┌──────────────────┐
 ┌──────────┐ ┌─────┴────────────┐     │  agent_outputs   │
 │  ideas   │ │    roadmaps      │     │──────────────────│
 │──────────│ │──────────────────│     │ output           │
 │ title    │ │ current_phase    │     └──────────────────┘
 │ status   │ └─────┬────────────┘
 └──────────┘       │ 1:N
                    ├─────────────────┐
                    ▼                 ▼
             ┌──────────────┐  ┌──────────────┐
             │   sprints    │  │  milestones  │
             │──────────────│  │──────────────│
             │ status       │  │ status       │
             └──────┬───────┘  └──────────────┘
                    │ 1:N
                    ▼
             ┌──────────────┐
             │    tasks     │
             │──────────────│
             │ status       │
             └──────────────┘

    startups 1:N
        │
        ├──────────────────────┐
        ▼                      ▼
 ┌────────────────────┐  ┌──────────────┐
 │outreach_campaigns  │  │  decisions   │
 │────────────────────│  │──────────────│
 │ status             │  │ decided_at   │
 └──────┬─────────────┘  └──────────────┘
        │ 1:N
        ▼
 ┌────────────────────┐
 │ outreach_contacts  │
 │────────────────────│
 │ status             │
 └────────────────────┘

    founders 1:N
        │
        ├──────────────────────┐
        ▼                      ▼
 ┌────────────────────┐  ┌──────────────────┐
 │   integrations     │  │renewal_reminders │
 │────────────────────│  │──────────────────│
 │ provider           │  │ reminder_type    │
 │ status             │  │ sent_at          │
 └────────────────────┘  └──────────────────┘
```

---

## RLS Policy Patterns

### Standard Pattern (applied to ALL founder-scoped tables)

```sql
-- Enable RLS on every table
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

-- Template: Apply to each table (substitute table name and optional FK path)
-- Direct founder_id tables:
CREATE POLICY "{table}_select_own" ON {table}
  FOR SELECT USING (founder_id = auth.uid());
  
-- Special case: founders table (id = auth.uid(), not founder_id)
CREATE POLICY "founders_select_self" ON founders
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "founders_update_self" ON founders
  FOR UPDATE USING (id = auth.uid());

-- Webhook constraints (subscriptions, payments, renewal_reminders)
-- No founder can write to these tables directly — only the webhook service role can write.
-- The service role key automatically bypasses Row Level Security in Supabase.
-- Authenticated users are restricted to SELECT policies only.
CREATE POLICY "subscriptions_read_own" ON subscriptions
  FOR SELECT TO authenticated USING (founder_id = auth.uid());

CREATE POLICY "payments_read_own" ON payments
  FOR SELECT TO authenticated USING (founder_id = auth.uid());

CREATE POLICY "renewal_reminders_read_own" ON renewal_reminders
  FOR SELECT TO authenticated USING (founder_id = auth.uid());
```

---

## Key Queries (Optimized)

### 1. Dashboard: Get current sprint with tasks
```sql
SELECT s.*, 
  json_agg(t.* ORDER BY t.priority) AS tasks
FROM sprints s
LEFT JOIN tasks t ON t.sprint_id = s.id
WHERE s.founder_id = $1 AND s.status = 'active'
GROUP BY s.id;
```

### 2. Credit check before agent execution
```sql
-- Checks if founder has an active subscription and tasks remaining
SELECT tasks_limit - tasks_used_this_cycle AS credits_remaining, plan, status
FROM subscriptions
WHERE founder_id = $1;
```

### 3. Deduct agent credit (atomic RPC)
```sql
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
```

### 4. Fetch unpaid or expiring subscription details for reminder service
```sql
-- Finds subscriptions expiring in the next 5 days that haven't been sent a reminder
SELECT s.founder_id, s.id as subscription_id, s.plan, s.expires_at, f.full_name, auth.users.email
FROM subscriptions s
JOIN founders f ON f.id = s.founder_id
JOIN auth.users ON auth.users.id = s.founder_id
LEFT JOIN renewal_reminders r ON r.subscription_id = s.id AND r.reminder_type = '5_day'
WHERE s.status = 'active' 
  AND s.expires_at BETWEEN NOW() AND NOW() + INTERVAL '5 days'
  AND r.id IS NULL;
```

---

## Supabase Realtime Subscription Patterns

### Subscriptions to Enable

| Table | Events | Filter | Purpose |
|---|---|---|---|
| `agent_runs` | UPDATE | `founder_id=eq.{uid}` | Real-time agent execution status updates on Agent Hub |
| `tasks` | INSERT, UPDATE, DELETE | `founder_id=eq.{uid}` | Sprint task updates on Dashboard |
| `subscriptions` | UPDATE | `founder_id=eq.{uid}` | Credit balance updates after agent execution |

---

*Last updated: 2026-05-28 | Version: 1.1.0*
*Subscribed schemas updated to remove Stripe [v2 - deferred] columns and include payments and renewal_reminders tables. Stripe [v2 - deferred] references marked [v2 - deferred].*
