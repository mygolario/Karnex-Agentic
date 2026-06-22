'use client'

import React, { useState } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import {
  Globe, Github, Database, Palette, Key, CheckCircle, Info,
  ExternalLink, Mail, Search, MessageSquare, ArrowRight, Settings, Layout
} from 'lucide-react'

export default function MvpDashboard() {
  const store = useForgeStore()
  const project = store.project
  const builderOutput = store.builderOutput // Contains our scanner output: sitemap, features, tech_stack, copy_bank, summary

  const [selectedPage, setSelectedPage] = useState<any>(null)

  if (!builderOutput) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
        No scanned MVP data loaded.
      </div>
    )
  }

  // Cast output fields
  const sitemap = (builderOutput as any).sitemap || []
  const features = (builderOutput as any).features || []
  const techStack = (builderOutput as any).tech_stack || {}
  const copyBank = (builderOutput as any).copy_bank || {}
  const summary = (builderOutput as any).summary || 'Scanned MVP Summary'

  // Default to selecting first page if none selected
  const activePage = selectedPage || sitemap[0] || null

  return (
    <div className="h-full flex flex-col bg-[#050507]">
      {/* Top Meta Header */}
      <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-950/45 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold text-white tracking-wide">
              {project?.name || 'Linked MVP Console'}
            </h2>
            <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono font-medium capitalize">
              {project?.mvp_source_platform || 'custom'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-zinc-650" />
              <a href={project?.deployment_url} target="_blank" rel="noreferrer" className="hover:underline hover:text-zinc-400">
                {project?.deployment_url}
              </a>
            </span>
            {project?.github_repo_url && (
              <span className="flex items-center gap-1">
                <Github className="h-3.5 w-3.5 text-zinc-650" />
                <a href={project?.github_repo_url} target="_blank" rel="noreferrer" className="hover:underline hover:text-zinc-400">
                  {project?.github_repo_url.replace('https://github.com/', '')}
                </a>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-1 flex min-h-0 divide-x divide-zinc-900/60 overflow-hidden">
        
        {/* Left Column (flex-1): Sitemap Node Tree, Tech Stack, Copy Bank */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 forge-scroll">
          
          {/* Summary Banner */}
          <div className="bg-indigo-950/10 border border-indigo-500/15 rounded-xl p-4 flex gap-3.5">
            <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-semibold text-zinc-200">MVP Analysis Summary</h4>
              <p className="text-zinc-400 leading-relaxed font-sans">{summary}</p>
            </div>
          </div>

          {/* Interactive Sitemap Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-900/50 pb-2">
              <Layout className="h-4 w-4 text-zinc-550" />
              <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Visual Sitemap & Pages
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sitemap.map((page: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPage(page)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-28 group ${
                    activePage?.path === page.path
                      ? 'bg-indigo-500/5 border-indigo-500/40 shadow-lg shadow-indigo-600/[0.02]'
                      : 'bg-zinc-950/30 border-zinc-900/80 hover:border-zinc-800'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                      {page.path}
                    </span>
                    <h4 className="text-[12.5px] font-bold text-zinc-200 group-hover:text-white truncate pt-2">
                      {page.title}
                    </h4>
                  </div>
                  <div className="text-[9px] text-zinc-550 font-mono flex justify-between items-center w-full">
                    <span>{page.features?.length || 0} features</span>
                    <ArrowRight className="h-3 w-3 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tech Stack Matrix */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-900/50 pb-2">
              <Database className="h-4 w-4 text-zinc-550" />
              <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Tech Stack & Integrations
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-zinc-950/20 border border-zinc-900 p-3.5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">Framework</span>
                <p className="text-zinc-200 font-medium">{techStack.framework || 'React / Next.js'}</p>
              </div>
              <div className="bg-zinc-950/20 border border-zinc-900 p-3.5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">Styling</span>
                <p className="text-zinc-200 font-medium">{techStack.styling || 'Tailwind CSS'}</p>
              </div>
              <div className="bg-zinc-950/20 border border-zinc-900 p-3.5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">Database</span>
                <p className="text-zinc-200 font-medium">{techStack.database || 'Supabase / PostgreSQL'}</p>
              </div>
              <div className="bg-zinc-950/20 border border-zinc-900 p-3.5 rounded-xl space-y-1">
                <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">Auth/Security</span>
                <p className="text-zinc-200 font-medium">{techStack.auth || 'Supabase Auth'}</p>
              </div>
            </div>
          </div>

          {/* Feature inventory */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-900/50 pb-2">
              <CheckCircle className="h-4 w-4 text-zinc-550" />
              <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Feature Inventory
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {features.map((feat: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2.5 bg-zinc-950/20 border border-zinc-900/40 p-3 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-zinc-300 font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (360px): Selected Page Inspection & Agent Actions */}
        <div className="w-[360px] shrink-0 bg-zinc-950/25 overflow-y-auto p-6 space-y-6 forge-scroll flex flex-col justify-between">
          
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <span className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider font-bold block">
                Selected Page Details
              </span>
              <h3 className="text-base font-extrabold text-white">
                {activePage?.title || 'No Page Selected'}
              </h3>
              <code className="text-[10px] bg-zinc-900 border border-zinc-800 text-indigo-400 px-2 py-0.5 rounded inline-block font-mono">
                {activePage?.path || '/'}
              </code>
            </div>

            {/* Page features */}
            {activePage?.features?.length > 0 && (
              <div className="space-y-2">
                <span className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider font-bold block">
                  Page Features ({activePage.features.length})
                </span>
                <div className="space-y-1.5 bg-[#0b0b0e] rounded-xl p-3 border border-zinc-900/80">
                  {activePage.features.map((f: string, i: number) => (
                    <div key={i} className="text-[11px] text-zinc-300 flex items-start gap-2.5 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Copy Snippets */}
            {activePage?.copy_snippets && Object.keys(activePage.copy_snippets).length > 0 && (
              <div className="space-y-2.5">
                <span className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider font-bold block">
                  Copy Snippets
                </span>
                <div className="space-y-3 bg-[#0b0b0e] rounded-xl p-4 border border-zinc-900/80">
                  {Object.entries(activePage.copy_snippets).map(([k, val]: any, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide block">{k}</span>
                      <p className="text-[11.5px] text-zinc-300 font-medium font-sans leading-relaxed select-text italic">
                        &ldquo;{val}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Workbench Agent Links */}
          <div className="border-t border-zinc-900/60 pt-6 space-y-3">
            <span className="text-zinc-550 font-mono text-[9px] uppercase tracking-wider font-bold block">
              Co-Founder Execution Workbench
            </span>

            <div className="space-y-2">
              <a
                href={`/agents/outreach?reference_scope=${activePage?.path || '/'}`}
                className="w-full flex items-center justify-between bg-indigo-600 hover:bg-indigo-500 text-white text-[11.5px] font-semibold rounded-lg py-2.5 px-4 transition-all shadow-md"
              >
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 fill-current shrink-0" />
                  Trigger Outreach Campaign
                </span>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>

              <a
                href={`/agents/research?reference_scope=${activePage?.path || '/'}`}
                className="w-full flex items-center justify-between bg-[#0e0e12] hover:bg-zinc-900 border border-zinc-900 text-zinc-200 text-[11.5px] font-semibold rounded-lg py-2.5 px-4 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                  Run Competitor Research
                </span>
                <ExternalLink className="h-3.5 w-3.5 opacity-50" />
              </a>

              <a
                href={`/home?action=standup&reference_scope=${activePage?.path || '/'}`}
                className="w-full flex items-center justify-between bg-[#0e0e12] hover:bg-zinc-900 border border-zinc-900 text-zinc-200 text-[11.5px] font-semibold rounded-lg py-2.5 px-4 transition-all"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-zinc-400 shrink-0" />
                  Daily Standup Log Update
                </span>
                <ExternalLink className="h-3.5 w-3.5 opacity-50" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
