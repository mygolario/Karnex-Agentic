-- Migration: 20260620000000_forge_namespace_schema.sql
-- Establish Row-Level Security (RLS) policies for solo founder isolation.

-- 1. FORGE PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.forge_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tech_stack JSONB NOT NULL DEFAULT '{"framework": "nextjs", "styling": "tailwind", "database": "supabase"}',
    github_repo VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.forge_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_manage_own_forge_projects" 
    ON public.forge_projects 
    FOR ALL 
    USING (founder_id = auth.uid());


-- 2. FORGE SESSIONS TABLE (Tracks generation pipelines)
CREATE TABLE IF NOT EXISTS public.forge_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.forge_projects(id) ON DELETE CASCADE,
    run_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, crystallizing, blueprinting, asset_generating, coding, compiling, deploying, success, error
    current_stage INTEGER NOT NULL DEFAULT 1, -- 1 to 6
    logs JSONB[] DEFAULT '{}'::jsonb[],
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.forge_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_manage_own_forge_sessions" 
    ON public.forge_sessions 
    FOR ALL 
    USING (project_id IN (SELECT id FROM public.forge_projects WHERE founder_id = auth.uid()));


-- 3. FORGE ASSETS TABLE (Caches design tokens and copywriting)
CREATE TABLE IF NOT EXISTS public.forge_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.forge_projects(id) ON DELETE CASCADE,
    brand_tokens JSONB NOT NULL DEFAULT '{}',
    layout_blueprint JSONB NOT NULL DEFAULT '{}',
    component_styles JSONB NOT NULL DEFAULT '{}',
    content_map JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.forge_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_manage_own_forge_assets" 
    ON public.forge_assets 
    FOR ALL 
    USING (project_id IN (SELECT id FROM public.forge_projects WHERE founder_id = auth.uid()));


-- 4. FORGE DEPLOYMENTS TABLE (Maintains Vercel and GitHub records)
CREATE TABLE IF NOT EXISTS public.forge_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.forge_projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.forge_sessions(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    pr_url VARCHAR(512),
    preview_url VARCHAR(512),
    production_url VARCHAR(512),
    logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.forge_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_manage_own_forge_deployments" 
    ON public.forge_deployments 
    FOR ALL 
    USING (project_id IN (SELECT id FROM public.forge_projects WHERE founder_id = auth.uid()));


-- 5. FORGE CONVERSATIONS TABLE (Sliding window history cache)
CREATE TABLE IF NOT EXISTS public.forge_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.forge_projects(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of ChatMessages
    summary TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.forge_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_manage_own_forge_conversations" 
    ON public.forge_conversations 
    FOR ALL 
    USING (project_id IN (SELECT id FROM public.forge_projects WHERE founder_id = auth.uid()));
