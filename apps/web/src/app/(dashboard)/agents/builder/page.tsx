'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

interface GeneratedFile {
  path: string
  content: string
  language: string
  description: string
}

interface BuilderOutput {
  files: GeneratedFile[]
  summary: string
  setup_instructions: string[]
  tests_included: boolean
  deployment_ready: boolean
  suggested_improvements: string[]
}

interface RunInfo {
  id: string
  status: string
  error_message?: string
}

export default function BuilderPage() {
  return (
    <ErrorBoundary>
      <BuilderContent />
    </ErrorBoundary>
  )
}

function BuilderContent() {
  const supabase = createSupabaseBrowserClient()

  // Form State
  const [taskType, setTaskType] = useState<'landing_page' | 'auth_setup' | 'payment_integration' | 'dashboard' | 'api_endpoint' | 'custom'>('landing_page')
  const [specification, setSpecification] = useState('Create a dark-themed conversion optimized landing page for a SaaS, including a hero section, email waitlist input, customer testimonial cards, and modern grid-lines pricing section.')
  const [framework, setFramework] = useState('nextjs')
  const [styling, setStyling] = useState('tailwind')
  const [database, setDatabase] = useState('supabase')
  const [githubRepo, setGithubRepo] = useState('https://github.com/ariokaveh85/Karnex-Waitlist')
  const [codeContext, setCodeContext] = useState('')

  // UI Flow State
  const [loading, setLoading] = useState(false)
  const [currentRun, setCurrentRun] = useState<RunInfo | null>(null)
  const [builderOutput, setBuilderOutput] = useState<BuilderOutput | null>(null)
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0)
  const [pastBuilds, setPastBuilds] = useState<{ id: string; spec: string; created_at: string }[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load Past Build Runs
  const loadHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, input, created_at')
        .eq('founder_id', session.user.id)
        .eq('agent_id', 'builder-v1')
        .eq('status', 'success')
        .order('created_at', { ascending: false })

      if (runs) {
        const formatted = runs.map((r: any) => ({
          id: r.id,
          spec: r.input?.specification || 'Code Scaffolding Build',
          created_at: r.created_at
        }))
        setPastBuilds(formatted)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }, [supabase])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Polling to update execution status & retrieve output
  useEffect(() => {
    if (!currentRun || currentRun.status === 'success' || currentRun.status === 'error') return

    const interval = setInterval(async () => {
      try {
        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message')
          .eq('id', currentRun.id)
          .single()

        if (error) throw error

        if (run) {
          setCurrentRun((prev) => prev ? { ...prev, status: run.status, error_message: run.error_message } : null)

          if (run.status === 'success') {
            clearInterval(interval)
            showToast('✓ Code files successfully compiled and pushed!')
            loadHistory()
            fetchRunOutput(currentRun.id)
          } else if (run.status === 'error') {
            clearInterval(interval)
            setLoading(false)
            showToast(run.error_message || 'Builder agent execution failed.', 'error')
          }
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [currentRun, supabase, loadHistory])

  const fetchRunOutput = async (runId: string) => {
    try {
      const { data: out, error } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()

      if (error) throw error

      if (out?.output?.files) {
        setBuilderOutput(out.output)
        setSelectedFileIdx(0)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error retrieving build output:', err)
      showToast('Failed to fetch build output details.', 'error')
      setLoading(false)
    }
  }

  const handleTriggerBuild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!specification.trim()) return

    setLoading(true)
    setBuilderOutput(null)
    setCurrentRun(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('Please sign in to trigger the agent coder.', 'error')
        setLoading(false)
        return
      }

      const token = session.access_token

      const response = await fetch(getAgentApiUrl('v1/agents/builder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          task_type: taskType,
          specification,
          tech_stack: {
            framework,
            styling,
            database
          },
          existing_codebase_context: codeContext || null,
          github_repo: githubRepo || null
        })
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      setCurrentRun({
        id: result.run_id,
        status: result.status // 'queued'
      })

      // Track event with PostHog
      try {
        const posthog = (await import('posthog-js')).default
        posthog.capture('agent_builder_triggered', {
          task_type: taskType,
          framework,
          styling,
          database,
          github_repo: githubRepo
        })
      } catch (trackErr) {
        console.warn('PostHog tracking failed:', trackErr)
      }
    } catch (err: any) {
      console.error('Trigger builder error:', err)
      showToast(err.message || 'Failed to initialize agent coder.', 'error')
      setLoading(false)
    }
  }

  const getProgressPercent = (status: string) => {
    switch (status) {
      case 'queued':
        return 10
      case 'decomposing_specifications':
        return 30
      case 'spawning_db_designer':
        return 50
      case 'spawning_ui_coder':
        return 70
      case 'running_linter_validation':
        return 85
      case 'committing_to_github':
        return 95
      case 'success':
        return 100
      default:
        return 0
    }
  }

  const getProgressLabel = (status: string) => {
    switch (status) {
      case 'queued':
        return 'Enqueuing build pipeline task...'
      case 'decomposing_specifications':
        return 'Supervisor decomposing specifications into architecture files...'
      case 'spawning_db_designer':
        return 'Database Coder sub-agent drafting SQL tables & schemas...'
      case 'spawning_ui_coder':
        return 'Tailwind Coder sub-agent scaffolding premium UI page views...'
      case 'running_linter_validation':
        return 'Self-repair linter checking brackets and validating imports...'
      case 'committing_to_github':
        return 'Exchanging credentials & committing code branch to GitHub...'
      case 'success':
        return 'Build complete!'
      case 'error':
        return 'Execution aborted.'
      default:
        return 'Constructing system...'
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-16 relative">
      <div className="absolute -top-10 left-12 w-64 h-64 bg-[#6366f1]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 rounded-xl px-5 py-3.5 text-xs font-bold text-white shadow-2xl flex items-center gap-2 border ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400'
            : 'bg-red-950/90 border-red-500/30 text-red-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="border-b border-[#1a1a1a]/40 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            Autonomous Code Builder
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Provision structured SQL tables, React page structures, API endpoints, and push production code directly to GitHub.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[#1a1a1a]/40 bg-[#060608]/80 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1] animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider uppercase">
            GitHub App Hooked
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Input Configuration Left Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
            <h2 className="text-sm font-bold text-zinc-200">Configure Build</h2>
            <form onSubmit={handleTriggerBuild} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Task Target</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as any)}
                  className="w-full rounded-xl border border-[#1a1a1a] bg-[#030303] px-3 py-2.5 text-zinc-300 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer"
                >
                  <option value="landing_page">Landing Page</option>
                  <option value="dashboard">Dashboard Panel</option>
                  <option value="api_endpoint">FastAPI / Node Endpoint</option>
                  <option value="auth_setup">Auth Scaffolding</option>
                  <option value="payment_integration">Stripe / Cryptopay Gateway</option>
                  <option value="custom">Custom Component</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Feature Specifications</label>
                <textarea
                  value={specification}
                  onChange={(e) => setSpecification(e.target.value)}
                  className="w-full min-h-[90px] rounded-xl border border-[#1a1a1a] bg-[#030303] px-4 py-2.5 text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[8px]">Framework</label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] p-2 text-zinc-400 font-mono text-[10px] cursor-pointer"
                  >
                    <option value="nextjs">NextJS</option>
                    <option value="fastapi">FastAPI</option>
                    <option value="react">Vite React</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[8px]">Styling</label>
                  <select
                    value={styling}
                    onChange={(e) => setStyling(e.target.value)}
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] p-2 text-zinc-400 font-mono text-[10px] cursor-pointer"
                  >
                    <option value="tailwind">Tailwind</option>
                    <option value="vanilla-css">Vanilla CSS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[8px]">Database</label>
                  <select
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] p-2 text-zinc-400 font-mono text-[10px] cursor-pointer"
                  >
                    <option value="supabase">Supabase</option>
                    <option value="postgresql">Postgres</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">GitHub Repository URL</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className="w-full rounded-xl border border-[#1a1a1a] bg-[#030303] px-4 py-2.5 text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Code Context / Schema info</label>
                <textarea
                  value={codeContext}
                  onChange={(e) => setCodeContext(e.target.value)}
                  placeholder="Paste existing database tables structure, endpoints declarations, or wireframe layouts..."
                  className="w-full min-h-[50px] rounded-xl border border-[#1a1a1a] bg-[#030303] px-4 py-2.5 text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 py-3 text-center text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10 disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? 'Synthesizing...' : 'Spawn Code Builder'}
              </button>
            </form>
          </div>

          {/* History panel */}
          <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
            <h2 className="text-sm font-bold text-zinc-200">Recent Build History</h2>
            {pastBuilds.length === 0 ? (
              <p className="text-[11px] text-zinc-650 font-mono">No previous runs recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {pastBuilds.slice(0, 5).map((build) => (
                  <button
                    key={build.id}
                    onClick={() => {
                      setLoading(true)
                      setBuilderOutput(null)
                      fetchRunOutput(build.id)
                    }}
                    className="w-full text-left rounded-xl bg-[#040407] hover:bg-[#0c0c12] border border-zinc-900 p-3 hover:border-zinc-800 transition-all group flex flex-col gap-1.5"
                  >
                    <span className="text-zinc-300 font-semibold text-xs leading-normal line-clamp-2 group-hover:text-indigo-400 transition-colors">
                      {build.spec}
                    </span>
                    <span className="text-[10px] text-zinc-550 font-mono">
                      {new Date(build.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Output panel - Code Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {loading && currentRun ? (
            <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 font-mono uppercase tracking-wider">Compilation progress</span>
                  <span className="font-bold text-indigo-400 font-mono">{getProgressPercent(currentRun.status)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800/50">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${getProgressPercent(currentRun.status)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <span className="text-xs text-zinc-400 font-mono">{getProgressLabel(currentRun.status)}</span>
              </div>

              <div className="border-t border-[#1a1a1a]/40 pt-4 text-[11px] text-zinc-650 font-mono space-y-2 leading-relaxed">
                <p>❯ Invoking Builder Supervisor: parsing feature specs</p>
                {getProgressPercent(currentRun.status) >= 30 && <p>❯ Initializing files tree specifications plan</p>}
                {getProgressPercent(currentRun.status) >= 50 && <p>❯ Spawning DB designer for SQL integrations</p>}
                {getProgressPercent(currentRun.status) >= 70 && <p>❯ Spawning UI coder for JSX templates compilation</p>}
                {getProgressPercent(currentRun.status) >= 85 && <p>❯ Linter self-healing active: checking for brackets match</p>}
                {getProgressPercent(currentRun.status) >= 95 && <p>❯ Committing code modifications to github branch</p>}
              </div>
            </div>
          ) : builderOutput ? (
            <div className="space-y-6 animate-fade-in">
              {/* Architecture Summary and Git Buttons */}
              <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-zinc-200">Architecture Workspace</h2>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 max-w-xl">{builderOutput.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    PR DEPLOY READY
                  </span>
                </div>
              </div>

              {/* Code viewer split workspace */}
              <div className="grid md:grid-cols-12 border border-[#1a1a1a]/40 rounded-2xl overflow-hidden bg-[#07070a]/90 min-h-[500px]">
                {/* File Tree Left Bar */}
                <div className="md:col-span-4 border-r border-[#1a1a1a]/40 bg-zinc-950/40 p-4 space-y-4">
                  <h3 className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Generated Files Tree</h3>
                  <div className="space-y-1.5">
                    {builderOutput.files.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedFileIdx(idx)}
                        className={`w-full text-left rounded-lg p-2.5 flex items-start gap-2.5 transition-all text-xs ${
                          selectedFileIdx === idx
                            ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold'
                            : 'border border-transparent text-zinc-450 hover:bg-[#0c0c12]'
                        }`}
                      >
                        <span className="font-mono text-zinc-600 mt-0.5">📂</span>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-mono text-[11px]">{file.path}</span>
                          <span className="block text-[9px] text-zinc-550 truncate mt-0.5">{file.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor Content Area */}
                <div className="md:col-span-8 flex flex-col bg-[#030303] text-zinc-300">
                  <div className="border-b border-[#1a1a1a]/40 bg-zinc-950/20 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                    <span className="text-[10px] text-zinc-500">{builderOutput.files[selectedFileIdx].path}</span>
                    <span className="text-[9px] uppercase font-bold text-zinc-500 px-1.5 py-0.5 bg-zinc-900/60 border border-zinc-800 rounded">
                      {builderOutput.files[selectedFileIdx].language}
                    </span>
                  </div>
                  
                  {/* Code Snippet Box */}
                  <div className="p-4 flex-1 overflow-x-auto overflow-y-auto max-h-[480px] font-mono text-[11px] leading-relaxed text-zinc-350 bg-black/40">
                    <pre className="whitespace-pre">
                      {builderOutput.files[selectedFileIdx].content}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Instructions and suggested improvements */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Deployment instructions */}
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Setup Instructions</h3>
                  <div className="space-y-3 font-mono text-xs">
                    {builderOutput.setup_instructions.map((inst, idx) => (
                      <div key={idx} className="bg-black/35 rounded-xl border border-zinc-900 p-3 text-zinc-300 leading-relaxed">
                        {inst}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Architectural recommendations */}
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Suggested Improvements</h3>
                  <ul className="list-disc list-inside space-y-2 text-xs text-zinc-400 leading-relaxed font-medium">
                    {builderOutput.suggested_improvements.map((imp, idx) => (
                      <li key={idx} className="marker:text-indigo-400">{imp}</li>
                    ))}
                  </ul>

                  <div className="border-t border-[#1a1a1a]/40 pt-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 uppercase text-[9px] font-bold">Tests coverage:</span>
                      <span className="text-emerald-400 font-bold font-mono">INCLUDED</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 uppercase text-[9px] font-bold">Deployment Ready:</span>
                      <span className="text-indigo-400 font-bold font-mono">YES</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#1a1a1a]/40 bg-[#07070a]/90 p-16 text-center text-zinc-650 flex flex-col items-center justify-center gap-3">
              <svg className="h-10 w-10 text-zinc-700 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <p className="text-xs font-mono max-w-sm">Define your component parameters on the left and trigger the builder network to scaffold your project code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
