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
    <div className="h-full overflow-y-auto forge-scroll bg-[#030303] bg-[radial-gradient(rgba(255,255,255,0.015)_1.5px,transparent_1.5px)] [background-size:24px_24px]">
      <div className="max-w-4xl mx-auto px-8 py-16 space-y-16">
        
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium tracking-wide uppercase font-mono">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            Karnex Forge 2.0
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-[-0.03em] leading-tight pt-1">
            Build software at the speed of thought.
          </h1>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            Provide a high-level spec or feature description below. Our autonomous engineering loop handles the architecture, database schemas, frontend components, and live deployment.
          </p>
        </div>

        {/* Prompt Input Terminal Box */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-950 border border-zinc-900 rounded-xl p-4 shadow-2xl relative overflow-hidden transition-all duration-300 focus-within:border-zinc-800 focus-within:shadow-indigo-500/[0.02]">
            {/* Soft accent glow inside the box */}
            <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-2 px-1 text-[10px] uppercase tracking-wider text-zinc-550 font-bold font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Project Spec Prompt
            </div>
            
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Build a dashboard for tracking SaaS server metrics. Include real-time chart cards, list view with status filter, settings tab, and Supabase integration..."
              className="w-full bg-[#07070a] text-[13.5px] text-zinc-200 placeholder-zinc-700 rounded-lg border border-zinc-900 focus:border-zinc-800 p-4 resize-none focus:outline-none transition-all leading-relaxed"
            />
            
            <div className="flex justify-between items-center pt-2">
              {hasICP ? (
                <button
                  type="button"
                  onClick={handleBuildFromICP}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 text-[11px] font-medium transition-all cursor-pointer"
                >
                  <Target className="h-3.5 w-3.5" />
                  Extract from ICP
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-black text-[12px] font-semibold rounded-lg px-6 py-2 transition-all shadow-md cursor-pointer"
              >
                <Hammer className="h-3.5 w-3.5" />
                Initialize Forge
              </button>
            </div>
          </form>
        </div>

        {/* Templates Grid */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
            <Layers className="h-4 w-4 text-zinc-500" />
            <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
              Quick Start Templates
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.slice(0, 3).map((tmpl, idx) => (
              <button
                key={tmpl.id || idx}
                onClick={() => handleSelectTemplate(tmpl.prompt, tmpl.name)}
                className="text-left bg-zinc-950/40 hover:bg-zinc-950 border border-zinc-900/80 hover:border-zinc-800 rounded-xl p-5 transition-all group hover:scale-[1.01] hover:-translate-y-0.5 flex flex-col justify-between h-[180px] shadow-sm cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 font-mono">
                      {tmpl.category || 'startup'}
                    </span>
                    <Code2 className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                  </div>
                  <h3 className="text-[13.5px] font-semibold text-zinc-200 group-hover:text-white pt-1">
                    {tmpl.name}
                  </h3>
                  <p className="text-[11.5px] text-zinc-500 leading-normal line-clamp-2">
                    {tmpl.description}
                  </p>
                </div>
                
                <div className="pt-3 border-t border-zinc-900/60 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                  <span>{tmpl.tech_stack?.framework || 'NextJS'}</span>
                  <span>{tmpl.tech_stack?.database || 'Supabase'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
              <Clock className="h-4 w-4 text-zinc-500" />
              <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Recent Projects Workspace
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentProjects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => handleLoadProject(proj)}
                  className="text-left bg-zinc-950/20 hover:bg-zinc-950 border border-zinc-900/60 hover:border-zinc-800 rounded-xl p-4 flex items-center justify-between transition-all group hover:scale-[1.01] cursor-pointer"
                >
                  <div className="space-y-1 min-w-0 pr-4">
                    <h3 className="text-[13px] font-semibold text-zinc-300 group-hover:text-white truncate">
                      {proj.name}
                    </h3>
                    <p className="text-[10px] text-zinc-600 font-mono">
                      Last edited {new Date(proj.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-lg border border-zinc-900 bg-[#0c0c0e] flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 group-hover:border-zinc-800 transition-colors shrink-0">
                    <Compass className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

