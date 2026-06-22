-- Migration: 20260622000000_linked_mvp_studio.sql
-- Support pivoting Karnex Forge to Linked MVP Studio

-- Add columns to forge_projects
ALTER TABLE public.forge_projects ADD COLUMN IF NOT EXISTS mvp_source_platform VARCHAR(50);
ALTER TABLE public.forge_projects ADD COLUMN IF NOT EXISTS scanner_status VARCHAR(50) DEFAULT 'idle'; -- 'idle', 'queued', 'crawling', 'analyzing', 'completed', 'failed'
ALTER TABLE public.forge_projects ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP WITH TIME ZONE;

-- Add columns to startups (main founder project workspace)
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS mvp_source_platform VARCHAR(50);
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS scanner_status VARCHAR(50) DEFAULT 'idle';
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP WITH TIME ZONE;
