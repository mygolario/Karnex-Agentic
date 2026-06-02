'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

interface Finding {
  title: string
  description: string
  supporting_evidence: string[]
  source_urls: string[]
  confidence: string
}

interface Source {
  title: string
  url: string
}

interface DataTable {
  headers: string[]
  rows: string[][]
  title?: string
}

interface ResearchBrief {
  executive_summary: string
  key_findings: Finding[]
  data_tables?: DataTable[]
  implications: string[]
  recommended_actions: string[]
  confidence: string
  sources: Source[]
  gaps: string[]
}

interface RunInfo {
  id: string
  status: string
  error_message?: string
}

export default function ResearchPage() {
  return (
    <ErrorBoundary>
      <ResearchContent />
    </ErrorBoundary>
  )
}

function ResearchContent() {
  const supabase = createSupabaseBrowserClient()

  // Form State
  const [question, setQuestion] = useState('What are the key technical challenges and competitors in building an AI co-founder OS?')
  const [scope, setScope] = useState<'market' | 'competitor' | 'technology' | 'audience' | 'general'>('general')
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard')
  const [sourcesInput, setSourcesInput] = useState('')
  const [constraints, setConstraints] = useState('')

  // UI Flow State
  const [loading, setLoading] = useState(false)
  const [currentRun, setCurrentRun] = useState<RunInfo | null>(null)
  const [researchBrief, setResearchBrief] = useState<ResearchBrief | null>(null)
  const [pastBriefs, setPastBriefs] = useState<{ id: string; question: string; created_at: string }[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load Past Research Briefs
  const loadHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, input, created_at')
        .eq('founder_id', session.user.id)
        .eq('agent_id', 'research-v1')
        .eq('status', 'success')
        .order('created_at', { ascending: false })

      if (runs) {
        const formatted = runs.map((r: any) => ({
          id: r.id,
          question: r.input?.research_question || 'Market Intelligence Brief',
          created_at: r.created_at
        }))
        setPastBriefs(formatted)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }, [supabase])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Polling to update execution status & retrieve result
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
            showToast('✓ Research synthesized successfully!')
            loadHistory()
            fetchRunOutput(currentRun.id)
          } else if (run.status === 'error') {
            clearInterval(interval)
            setLoading(false)
            showToast(run.error_message || 'Research agent failed to run.', 'error')
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

      if (out?.output?.research_brief) {
        setResearchBrief(out.output.research_brief)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error retrieving brief output:', err)
      showToast('Failed to fetch research brief details.', 'error')
      setLoading(false)
    }
  }

  const handleTriggerResearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setResearchBrief(null)
    setCurrentRun(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('Please sign in to access agent intelligence.', 'error')
        setLoading(false)
        return
      }

      const token = session.access_token
      const preferredSourcesList = sourcesInput
        ? sourcesInput.split(',').map((s) => s.trim()).filter(Boolean)
        : null

      const response = await fetch(getAgentApiUrl('v1/agents/research'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          research_question: question,
          scope,
          depth,
          preferred_sources: preferredSourcesList,
          constraints: constraints || null
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
        posthog.capture('agent_research_triggered', {
          research_question: question,
          scope,
          depth,
          preferred_sources: preferredSourcesList
        })
      } catch (trackErr) {
        console.warn('PostHog tracking failed:', trackErr)
      }
    } catch (err: any) {
      console.error('Trigger research error:', err)
      showToast(err.message || 'Failed to initialize agent execution.', 'error')
      setLoading(false)
    }
  }

  const getProgressPercent = (status: string) => {
    switch (status) {
      case 'queued':
        return 15
      case 'generating_search_queries':
        return 40
      case 'searching_web_sources':
        return 70
      case 'synthesizing_brief':
        return 90
      case 'success':
        return 100
      default:
        return 0
    }
  }

  const getProgressLabel = (status: string) => {
    switch (status) {
      case 'queued':
        return 'Queueing sub-agent spawning tasks...'
      case 'generating_search_queries':
        return 'Query Generator agent formulating optimal keywords...'
      case 'searching_web_sources':
        return 'Web Scrapers executing parallel DuckDuckGo scraping...'
      case 'synthesizing_brief':
        return 'Synthesizer agent compiling intelligence findings...'
      case 'success':
        return 'Research synthesized!'
      case 'error':
        return 'Synthesis execution failed.'
      default:
        return 'Processing...'
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 relative">
      <div className="absolute -top-10 left-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

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
            Market Intelligence Researcher
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Conduct in-depth competitor analysis, verify market sizes, scan technical options, and synthesize structured briefs.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[#1a1a1a]/40 bg-[#060608]/80 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider uppercase">
            Supervisor-Worker Topology Active
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Form panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
            <h2 className="text-sm font-bold text-zinc-200">Start New Inquiry</h2>
            <form onSubmit={handleTriggerResearch} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Research Inquiry / Question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full min-h-[90px] rounded-xl border border-[#1a1a1a] bg-[#030303] px-4 py-2.5 text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="w-full rounded-xl border border-[#1a1a1a] bg-[#030303] px-3 py-2.5 text-zinc-300 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer"
                  >
                    <option value="general">General</option>
                    <option value="market">Market size</option>
                    <option value="competitor">Competitors</option>
                    <option value="technology">Tech stack</option>
                    <option value="audience">Audience/ICP</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Depth</label>
                  <select
                    value={depth}
                    onChange={(e) => setDepth(e.target.value as any)}
                    className="w-full rounded-xl border border-[#1a1a1a] bg-[#030303] px-3 py-2.5 text-zinc-300 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer"
                  >
                    <option value="quick">Quick scan</option>
                    <option value="standard">Standard</option>
                    <option value="deep">Deep research</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Preferred domains (CSV)</label>
                <input
                  type="text"
                  placeholder="e.g. github.com, techcrunch.com"
                  value={sourcesInput}
                  onChange={(e) => setSourcesInput(e.target.value)}
                  className="w-full rounded-xl border border-[#1a1a1a] bg-[#030303] px-4 py-2.5 text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider font-mono text-[9px]">Inquiry Constraints / Rules</label>
                <textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. Only evaluate tools launched in 2025 onwards..."
                  className="w-full min-h-[50px] rounded-xl border border-[#1a1a1a] bg-[#030303] px-4 py-2.5 text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 py-3 text-center text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10 disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? 'Synthesizing...' : 'Spawn Research Sub-Agents'}
              </button>
            </form>
          </div>

          {/* History Panel */}
          <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
            <h2 className="text-sm font-bold text-zinc-200">Recent Synthesized Briefs</h2>
            {pastBriefs.length === 0 ? (
              <p className="text-[11px] text-zinc-650 font-mono">No previous runs recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {pastBriefs.slice(0, 5).map((brief) => (
                  <button
                    key={brief.id}
                    onClick={() => {
                      setLoading(true)
                      setResearchBrief(null)
                      fetchRunOutput(brief.id)
                    }}
                    className="w-full text-left rounded-xl bg-[#040407] hover:bg-[#0c0c12] border border-zinc-900 p-3 hover:border-zinc-800 transition-all group flex flex-col gap-1.5"
                  >
                    <span className="text-zinc-300 font-semibold text-xs leading-normal line-clamp-2 group-hover:text-indigo-400 transition-colors">
                      {brief.question}
                    </span>
                    <span className="text-[10px] text-zinc-550 font-mono">
                      {new Date(brief.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Output panel */}
        <div className="lg:col-span-8 space-y-6">
          {loading && currentRun ? (
            <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300 font-mono uppercase tracking-wider">Research progress</span>
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
                <p>❯ Spawning query formulations via model: gemini-2.5-flash</p>
                {getProgressPercent(currentRun.status) >= 40 && <p>❯ Spawning parallel scrapers to inspect DuckDuckGo indexes</p>}
                {getProgressPercent(currentRun.status) >= 70 && <p>❯ Synthesizing final structured brief via model: gemini-2.5-pro</p>}
              </div>
            </div>
          ) : researchBrief ? (
            <div className="space-y-6 animate-fade-in">
              {/* Summary and Stats Card */}
              <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-850/40 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-200">Synthesis Result</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Automated Intelligence Brief</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 uppercase text-[9px] font-bold">Confidence:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        researchBrief.confidence === 'high'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : researchBrief.confidence === 'medium'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {researchBrief.confidence}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Executive Summary</h3>
                  <p className="text-sm text-zinc-200 leading-relaxed font-medium bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl p-4">
                    {researchBrief.executive_summary}
                  </p>
                </div>
              </div>

              {/* Key Findings */}
              <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                <h3 className="text-sm font-bold text-zinc-200">Key Structured Findings</h3>
                <div className="space-y-4">
                  {researchBrief.key_findings.map((finding, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-850/40 bg-[#050508]/40 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-850/40 pb-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                          Finding {idx + 1}: {finding.title}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border font-mono uppercase ${
                          finding.confidence === 'high' ? 'border-emerald-500/20 text-emerald-400' : 'border-amber-500/20 text-amber-400'
                        }`}>
                          {finding.confidence} confidence
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{finding.description}</p>
                      
                      {finding.supporting_evidence.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Supporting Evidence</span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-zinc-400">
                            {finding.supporting_evidence.map((ev, i) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Tables */}
              {researchBrief.data_tables && researchBrief.data_tables.length > 0 && (
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-200">Structured Data Tables</h3>
                  <div className="space-y-6">
                    {researchBrief.data_tables.map((table, tIdx) => (
                      <div key={tIdx} className="space-y-2 border border-zinc-850/40 rounded-xl overflow-hidden bg-black/25">
                        {table.title && (
                          <div className="px-4 py-2.5 border-b border-zinc-850/40 bg-zinc-950/50">
                            <span className="text-xs font-bold text-zinc-300 font-mono uppercase">{table.title}</span>
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-850/40 text-zinc-550 font-mono text-[9px] uppercase font-bold bg-[#040407]/80">
                                {table.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="px-4 py-2">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-850/30">
                              {table.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/[0.01]">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-4 py-2.5 text-zinc-300 font-medium">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Implications and Actions */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Strategic Implications</h3>
                  <ul className="list-decimal list-inside space-y-2 text-xs text-zinc-300 leading-relaxed">
                    {researchBrief.implications.map((imp, idx) => (
                      <li key={idx} className="marker:text-indigo-400 marker:font-mono">{imp}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Recommended Actions</h3>
                  <ul className="list-decimal list-inside space-y-2 text-xs text-zinc-300 leading-relaxed">
                    {researchBrief.recommended_actions.map((act, idx) => (
                      <li key={idx} className="marker:text-emerald-400 marker:font-mono">{act}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Gaps and sources */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Unresolved Research Gaps</h3>
                  <ul className="list-disc list-inside space-y-2 text-xs text-zinc-400 leading-relaxed">
                    {researchBrief.gaps.map((gap, idx) => (
                      <li key={idx} className="marker:text-red-500">{gap}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">Sources Reference</h3>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {researchBrief.sources.map((src, idx) => (
                      <div key={idx} className="text-xs flex flex-col gap-0.5">
                        <span className="text-zinc-300 font-semibold">{src.title}</span>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline font-mono text-[10px] break-all"
                        >
                          {src.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#1a1a1a]/40 bg-[#07070a]/90 p-16 text-center text-zinc-650 flex flex-col items-center justify-center gap-3">
              <svg className="h-10 w-10 text-zinc-700 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <p className="text-xs font-mono max-w-sm">Type your inquiry on the left and trigger the sub-agent network to construct your research brief.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
