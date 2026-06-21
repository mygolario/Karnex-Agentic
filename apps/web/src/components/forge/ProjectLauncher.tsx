'use client'

import React, { useState, useEffect } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { useForgeContext } from '@/lib/studio/forge-context'
import { Sparkles, Hammer, Clock, Code2, Layers, Compass, Target } from 'lucide-react'

// Default fallback templates
const DEFAULT_TEMPLATES = [
  {
    name: 'SaaS Starter',
    description: 'Full-featured SaaS application with auth, billing, dashboard, and settings. Ideal for B2B products.',
    category: 'saas',
    tech_stack: { framework: 'nextjs', styling: 'tailwind', database: 'supabase' },
    prompt: 'Create a dark-themed SaaS landing page with a bold hero section, feature cards grid, testimonial section, pricing comparison table, and an email waitlist form. Use modern typography and subtle gradients.'
  },
  {
    name: 'Landing Page',
    description: 'High-converting landing page with hero, features, pricing, testimonials, and CTA sections.',
    category: 'landing',
    tech_stack: { framework: 'nextjs', styling: 'tailwind', database: 'none' },
    prompt: 'Build a landing page for a creative agency. Include a navigation bar, a high-impact hero section with smooth animations, portfolio grid showcasing project cards, service lists, pricing options, and a contact form with active inputs. Dark mode styled.'
  },
  {
    name: 'Admin Dashboard',
    description: 'Data-rich admin dashboard with charts, tables, filters, and user management.',
    category: 'dashboard',
    tech_stack: { framework: 'nextjs', styling: 'tailwind', database: 'supabase' },
    prompt: 'Build an admin dashboard with a collapsible sidebar, top stats cards showing revenue/users/conversions, a line chart for weekly trends, a data table with sortable columns, and a recent activity feed. Dark theme.'
  }
]

export default function ProjectLauncher() {
  const store = useForgeStore()
  const { triggerBuild, refreshKarnexContext, supabase } = useForgeContext()
  
  const [draft, setDraft] = useState('')
  const [templates, setTemplates] = useState<any[]>(DEFAULT_TEMPLATES)
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const icp = useForgeStore((s) => s.projectName) // fallback

  // Fetch templates and projects on mount
  useEffect(() => {
    async function loadLauncherData() {
      setLoadingProjects(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Load templates
          const { data: dbTemplates } = await supabase
            .from('forge_templates')
            .select('*')
            .order('usage_count', { ascending: false })
          
          if (dbTemplates && dbTemplates.length > 0) {
            setTemplates(dbTemplates.map(t => ({
              ...t,
              // Map prompt heuristic fallback if not present
              prompt: t.name === 'SaaS Starter' ? DEFAULT_TEMPLATES[0].prompt :
                      t.name === 'Landing Page' ? DEFAULT_TEMPLATES[1].prompt :
                      t.name === 'Admin Dashboard' ? DEFAULT_TEMPLATES[2].prompt :
                      `Build a ${t.name} using ${t.tech_stack?.framework || 'Next.js'}. ${t.description}`
            })))
          }

          // Load recent projects
          const { data: dbProjects } = await supabase
            .from('forge_projects')
            .select('*')
            .eq('founder_id', session.user.id)
            .order('updated_at', { ascending: false })
            .limit(5)
          
          if (dbProjects) {
            setRecentProjects(dbProjects)
          }
        }
      } catch (err) {
        console.error('Failed to load launcher data:', err)
      } finally {
        setLoadingProjects(false)
      }
    }
    void loadLauncherData()
  }, [supabase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    void triggerBuild(draft.trim())
    setDraft('')
  }

  const handleSelectTemplate = (prompt: string, name: string) => {
    store.setProjectName(name)
    store.setDraft(prompt)
    void triggerBuild(prompt)
  }

  const handleLoadProject = async (proj: any) => {
    store.setProject(proj)
    store.setProjectName(proj.name)
    // Find latest run for this project
    try {
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, status, input')
        .eq('agent_id', 'builder-v1')
        .order('created_at', { ascending: false })
        .limit(1)

      if (runs && runs.length > 0) {
        const run = runs[0]
        store.setCurrentRun(run.id, run.status)
        if (run.status === 'success') {
          // Load outputs
          const { data: out } = await supabase
            .from('agent_outputs')
            .select('output')
            .eq('agent_run_id', run.id)
            .maybeSingle()
          
          if (out && out.output) {
            store.setBuilderOutput(out.output as any)
            store.setSelectedFileIdx(0)
          }
        } else {
          store.setLoading(true)
        }
      }
    } catch (err) {
      console.error('Error loading project run:', err)
    }
  }

  // Load ICP data if available to display a prominent button
  const { karnexContext } = useForgeContext()
  const hasICP = !!karnexContext.icp

  const handleBuildFromICP = () => {
    if (!karnexContext.icp) return
    const prompt = `Build a web application for: ${karnexContext.icp.targetAudience}. ` +
      `Key pain points: ${karnexContext.icp.painPoints.join(', ')}. ` +
      `Value proposition: ${karnexContext.icp.positioning}. ` +
      `Design layout must be modern dashboard/SaaS with responsive navigation.`
    store.setProjectName(`${karnexContext.icp.targetAudience.slice(0, 20)} Platform`)
    store.setDraft(prompt)
    void triggerBuild(prompt)
  }

  return (
    <div className="h-full overflow-y-auto forge-scroll forge-grid-bg">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-[26px] font-bold text-white tracking-[-0.02em] leading-tight">
            Launch Your Next Venture
          </h1>
          <p className="text-[13px] text-zinc-550 max-w-md mx-auto">
            Describe your software vision in natural language. The Karnex pipeline will orchestrate, scaffold, design, and deploy it.
          </p>
        </div>

        {/* Prompt Input Area */}
        <form onSubmit={handleSubmit} className="space-y-3 bg-[#0a0a0f]/60 backdrop-blur-md rounded-xl p-4 border border-zinc-900 shadow-xl max-w-2xl mx-auto">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Build an AI meeting summarizer with dashboard analytics, weekly status grids, Stripe billing gateway, and Supabase database..."
            className="w-full bg-[#050508]/80 text-[13px] text-zinc-200 placeholder-zinc-700 rounded-lg border border-zinc-900 focus:border-indigo-500/35 p-3.5 resize-none focus:outline-none transition-colors"
          />
          <div className="flex justify-between items-center">
            {hasICP ? (
              <button
                type="button"
                onClick={handleBuildFromICP}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 text-[11px] font-medium transition-all"
              >
                <Target className="h-3.5 w-3.5" />
                Build from my ICP
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-30 disabled:hover:bg-[#6366f1] text-white text-[12px] font-semibold rounded-lg px-5 py-2 transition-all shadow-lg shadow-indigo-600/10"
            >
              <Hammer className="h-3.5 w-3.5" />
              Build Application
            </button>
          </div>
        </form>

        {/* Templates Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2">
            <Layers className="h-4 w-4 text-zinc-550" />
            <h2 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Or start from a structured template
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {templates.slice(0, 3).map((tmpl, idx) => (
              <button
                key={tmpl.id || idx}
                onClick={() => handleSelectTemplate(tmpl.prompt, tmpl.name)}
                className="text-left bg-[#0a0a0f]/40 hover:bg-[#0f0f16]/40 border border-zinc-900/60 hover:border-zinc-800 rounded-lg p-4 transition-all group hover:scale-[1.01] flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                      {tmpl.category || 'startup'}
                    </span>
                    <Code2 className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-550 transition-colors" />
                  </div>
                  <h3 className="text-[13px] font-semibold text-zinc-200 mt-2 group-hover:text-white">{tmpl.name}</h3>
                  <p className="text-[11px] text-zinc-600 leading-normal line-clamp-2 mt-1">{tmpl.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-900/40 flex items-center justify-between text-[9px] text-zinc-550 font-mono">
                  <span>{tmpl.tech_stack?.framework || 'NextJS'}</span>
                  <span>{tmpl.tech_stack?.database || 'Supabase'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2">
              <Clock className="h-4 w-4 text-zinc-550" />
              <h2 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                Recent Projects
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentProjects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => handleLoadProject(proj)}
                  className="text-left bg-[#0a0a0f]/20 hover:bg-[#0f0f16]/30 border border-zinc-900/40 hover:border-zinc-800 rounded-lg p-3.5 flex items-center justify-between transition-all group"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-[12.5px] font-medium text-zinc-300 group-hover:text-zinc-200 truncate pr-4">
                      {proj.name}
                    </h3>
                    <p className="text-[10px] text-zinc-650 font-mono">
                      Last edited {new Date(proj.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Compass className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
