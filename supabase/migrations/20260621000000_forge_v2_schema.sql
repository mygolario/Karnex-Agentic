-- ============================================================
-- Karnex Forge V2 Schema Migration
-- Extends forge namespace tables for full rebuild
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fix forge_projects.founder_id FK (was auth.users, now founders)
--    Drop old FK, add correct one. This is safe because founders(id)
--    references auth.users(id) ON DELETE CASCADE, so the constraint
--    chain is preserved.
-- ------------------------------------------------------------
ALTER TABLE forge_projects
  DROP CONSTRAINT IF EXISTS forge_projects_founder_id_fkey;

ALTER TABLE forge_projects
  ADD CONSTRAINT forge_projects_founder_id_fkey
  FOREIGN KEY (founder_id) REFERENCES founders(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 2. Extend forge_projects with full project context
-- ------------------------------------------------------------
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'web_nextjs';
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 0;
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS project_context JSONB DEFAULT '{}';
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS icp_snapshot JSONB;
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS roadmap_phase VARCHAR(50);
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS momentum_score_at_creation INTEGER;
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS deployment_url VARCHAR(512);
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS github_repo_url VARCHAR(512);
ALTER TABLE forge_projects ADD COLUMN IF NOT EXISTS vercel_project_id VARCHAR(255);

-- ------------------------------------------------------------
-- 3. Extend forge_sessions with richer pipeline tracking
-- ------------------------------------------------------------
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'build';
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS intent_spec JSONB;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS architecture_blueprint JSONB;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS generation_context JSONB;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS files_generated INTEGER DEFAULT 0;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,4);
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS test_report JSONB;
ALTER TABLE forge_sessions ADD COLUMN IF NOT EXISTS qa_score INTEGER;

-- ------------------------------------------------------------
-- 4. Extend forge_assets with versioning
-- ------------------------------------------------------------
ALTER TABLE forge_assets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE forge_assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------
-- 5. Extend forge_deployments with status + health
-- ------------------------------------------------------------
ALTER TABLE forge_deployments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE forge_deployments ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ;
ALTER TABLE forge_deployments ADD COLUMN IF NOT EXISTS health_check_passed BOOLEAN;
ALTER TABLE forge_deployments ADD COLUMN IF NOT EXISTS deployment_config JSONB;

-- ------------------------------------------------------------
-- 6. Extend forge_conversations with compression support
-- ------------------------------------------------------------
ALTER TABLE forge_conversations ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE forge_conversations ADD COLUMN IF NOT EXISTS compressed_at TIMESTAMPTZ;
ALTER TABLE forge_conversations ADD COLUMN IF NOT EXISTS context_window_tokens INTEGER DEFAULT 0;

-- ------------------------------------------------------------
-- 7. Create forge_versions table for undo/restore
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES forge_projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES forge_sessions(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  diff_summary TEXT,
  commit_sha VARCHAR(40),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, version_number)
);

ALTER TABLE forge_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY founders_manage_own_forge_versions ON forge_versions
  FOR ALL USING (
    project_id IN (
      SELECT id FROM forge_projects WHERE founder_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON forge_versions TO authenticated;
GRANT ALL ON forge_versions TO service_role;

-- ------------------------------------------------------------
-- 8. Create forge_templates table for project templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tech_stack JSONB NOT NULL DEFAULT '{}',
  brand_tokens JSONB,
  layout_blueprint JSONB,
  file_scaffold JSONB NOT NULL DEFAULT '[]',
  preview_image_url TEXT,
  usage_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE forge_templates ENABLE ROW LEVEL SECURITY;

-- System templates are readable by all authenticated users
CREATE POLICY templates_read_system ON forge_templates
  FOR SELECT USING (is_system = TRUE);

-- Service role can manage all templates
GRANT ALL ON forge_templates TO service_role;
GRANT SELECT ON forge_templates TO authenticated;

-- ------------------------------------------------------------
-- 9. Seed 5 essential project templates
-- ------------------------------------------------------------
INSERT INTO forge_templates (name, description, category, tech_stack, file_scaffold) VALUES
(
  'SaaS Starter',
  'Full-featured SaaS application with auth, billing, dashboard, and settings. Ideal for B2B products.',
  'saas',
  '{"framework": "nextjs", "styling": "tailwind", "database": "supabase", "auth": true, "payments": "stripe"}',
  '[{"path": "app/page.tsx", "role": "frontend_page"}, {"path": "app/dashboard/page.tsx", "role": "frontend_page"}, {"path": "app/settings/page.tsx", "role": "frontend_page"}, {"path": "app/api/webhooks/stripe/route.ts", "role": "api_route"}, {"path": "lib/supabase/client.ts", "role": "utility"}, {"path": "components/ui/Button.tsx", "role": "component"}]'
),
(
  'Landing Page',
  'High-converting landing page with hero, features, pricing, testimonials, and CTA sections.',
  'landing',
  '{"framework": "nextjs", "styling": "tailwind", "database": "none", "auth": false, "payments": false}',
  '[{"path": "app/page.tsx", "role": "frontend_page"}, {"path": "components/Hero.tsx", "role": "component"}, {"path": "components/Features.tsx", "role": "component"}, {"path": "components/Pricing.tsx", "role": "component"}, {"path": "components/Testimonials.tsx", "role": "component"}, {"path": "components/Footer.tsx", "role": "component"}]'
),
(
  'Admin Dashboard',
  'Data-rich admin dashboard with charts, tables, filters, and user management.',
  'dashboard',
  '{"framework": "nextjs", "styling": "tailwind", "database": "supabase", "auth": true, "payments": false}',
  '[{"path": "app/page.tsx", "role": "frontend_page"}, {"path": "app/users/page.tsx", "role": "frontend_page"}, {"path": "app/analytics/page.tsx", "role": "frontend_page"}, {"path": "components/charts/BarChart.tsx", "role": "component"}, {"path": "components/DataTable.tsx", "role": "component"}, {"path": "lib/supabase/client.ts", "role": "utility"}]'
),
(
  'Marketplace',
  'Two-sided marketplace with listings, search, user profiles, and transaction flow.',
  'marketplace',
  '{"framework": "nextjs", "styling": "tailwind", "database": "supabase", "auth": true, "payments": "stripe"}',
  '[{"path": "app/page.tsx", "role": "frontend_page"}, {"path": "app/listings/page.tsx", "role": "frontend_page"}, {"path": "app/listings/[id]/page.tsx", "role": "frontend_page"}, {"path": "app/profile/page.tsx", "role": "frontend_page"}, {"path": "app/api/listings/route.ts", "role": "api_route"}, {"path": "components/ListingCard.tsx", "role": "component"}]'
),
(
  'Portfolio',
  'Personal portfolio with project showcase, about section, blog, and contact form.',
  'portfolio',
  '{"framework": "nextjs", "styling": "tailwind", "database": "none", "auth": false, "payments": false}',
  '[{"path": "app/page.tsx", "role": "frontend_page"}, {"path": "app/projects/page.tsx", "role": "frontend_page"}, {"path": "app/blog/page.tsx", "role": "frontend_page"}, {"path": "app/contact/page.tsx", "role": "frontend_page"}, {"path": "components/ProjectCard.tsx", "role": "component"}, {"path": "components/ContactForm.tsx", "role": "component"}]'
)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 10. Add indexes for common queries
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_forge_versions_project_id ON forge_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_forge_versions_project_version ON forge_versions(project_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_forge_sessions_project_id ON forge_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_forge_projects_founder_id ON forge_projects(founder_id);
CREATE INDEX IF NOT EXISTS idx_forge_projects_status ON forge_projects(status);
CREATE INDEX IF NOT EXISTS idx_forge_templates_category ON forge_templates(category);
