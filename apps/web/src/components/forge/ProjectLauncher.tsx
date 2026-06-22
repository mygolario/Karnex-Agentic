'use client'

import React, { useState, useEffect } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { useForgeContext } from '@/lib/studio/forge-context'
import { Sparkles, Hammer, Clock, Code2, Link, Compass, Target, Github, Layers, Play } from 'lucide-react'

export default function ProjectLauncher() {
  const store = useForgeStore()
  const { triggerBuild, supabase } = useForgeContext()
  
  const [url, setUrl] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [platform, setPlatform] = useState('lovable')
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Fetch recent projects on mount
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
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
    void loadProjects()
  }, [supabase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    
    // Set project name from domain
    let parsedName = 'External MVP'
    try {
      const hostname = new URL(url).hostname
      parsedName = hostname.replace('www.', '').split('.')[0]
      parsedName = parsedName.charAt(0).toUpperCase() + parsedName.slice(1) + ' App'
    } catch {
      parsedName = 'Linked MVP Project'
    }
    
    store.setProjectName(parsedName)
    void triggerBuild(url.trim(), githubRepo.trim(), platform)
  }

  const handleLoadProject = async (proj: any) => {
    store.setProject(proj)
    store.setProjectName(proj.name)
    try {
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, status, input')
        .eq('agent_id', 'mvp-scanner-v1')
        .order('created_at', { ascending: false })
        .limit(1)

      if (runs && runs.length > 0) {
        const run = runs[0]
        store.setCurrentRun(run.id, run.status)
        if (run.status === 'success') {
          const { data: out } = await supabase
            .from('agent_outputs')
            .select('output')
            .eq('agent_run_id', run.id)
            .maybeSingle()
          
          if (out && out.output) {
            // Load outputs
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

  return (
    <div className="h-full overflow-y-auto forge-scroll bg-[#030303] bg-[radial-gradient(rgba(255,255,255,0.015)_1.5px,transparent_1.5px)] [background-size:24px_24px] select-none">
      <div className="max-w-4xl mx-auto px-8 py-16 space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium tracking-wide uppercase font-mono">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            Karnex Studio MVP Console
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-[-0.03em] leading-tight pt-1">
            Link Your MVP & Run Your Co-Founder Team
          </h1>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            Link your MVP built on Lovable, v0, Base44, or custom domains. Our Scanner Agent will analyze your product and inject its context across all 27 specialized execution agents.
          </p>
        </div>

        {/* Integration Setup Panel */}
        <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 focus-within:border-zinc-800">
          <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Platform Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-550 font-bold font-mono">
                Select App Builder Platform
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'lovable', name: 'Lovable.dev' },
                  { id: 'v0', name: 'v0.app' },
                  { id: 'base44', name: 'Base44' },
                  { id: 'custom', name: 'Custom Domain / URL' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`py-2.5 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                      platform === p.id
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-200 text-[11.5px] font-semibold'
                        : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800 text-[11px]'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-550 font-bold font-mono">
                <Link className="h-3.5 w-3.5 text-zinc-500" />
                Live MVP Website URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://my-awesome-app.lovable.app"
                className="w-full bg-[#07070a] text-[13px] text-zinc-200 placeholder-zinc-700 rounded-lg border border-zinc-900 focus:border-zinc-800 px-4 py-3 focus:outline-none transition-all"
              />
            </div>

            {/* GitHub Repo Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-550 font-bold font-mono">
                <Github className="h-3.5 w-3.5 text-zinc-500" />
                GitHub Repository URL (Optional, but recommended)
              </label>
              <input
                type="url"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="https://github.com/username/my-awesome-app"
                className="w-full bg-[#07070a] text-[13px] text-zinc-200 placeholder-zinc-700 rounded-lg border border-zinc-900 focus:border-zinc-800 px-4 py-3 focus:outline-none transition-all"
              />
              <p className="text-[10px] text-zinc-500">Connecting GitHub unlocks deep code parsing, routing maps, and component structure scanning.</p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2 border-t border-zinc-900">
              <button
                type="submit"
                disabled={!url.trim()}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg px-6 py-2.5 transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Link & Scan MVP
              </button>
            </div>

          </form>
        </div>

        {/* Recent Linked Projects */}
        {recentProjects.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
                Recent Scanned MVPs
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentProjects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => handleLoadProject(proj)}
                  className="text-left bg-zinc-950/45 hover:bg-zinc-900/40 border border-zinc-900/60 hover:border-zinc-800 rounded-xl p-4 flex items-center justify-between transition-all group cursor-pointer"
                >
                  <div className="space-y-1 min-w-0 pr-4">
                    <h3 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white truncate">
                      {proj.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-550 font-mono">
                      <span className="capitalize">{proj.mvp_source_platform || 'custom'}</span>
                      <span>•</span>
                      <span>Last scanned {new Date(proj.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Compass className="h-4 w-4 text-zinc-650 group-hover:text-indigo-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
