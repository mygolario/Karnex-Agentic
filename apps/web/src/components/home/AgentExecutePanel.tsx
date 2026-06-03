'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

export interface AgentTask {
  id: string
  title: string
  description: string | null
  priority: number
  category: 'build' | 'research' | 'outreach' | 'content' | 'design' | 'finance' | 'legal' | 'other'
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'deferred'
  agent_config: Record<string, unknown> | null
  agent_output: Record<string, unknown> | null
  execute_label: string | null
  auto_executable: boolean
  sprint_id: string
  agent_run_id: string | null
}

interface AgentExecutePanelProps {
  task: AgentTask | null
  isOpen: boolean
  onClose: () => void
  founderId: string
  onTaskComplete?: (taskId: string) => void
}

const AGENT_LABELS: Record<string, string> = {
  builder: 'Builder Agent',
  outreach: 'Outreach Agent',
  research: 'Research Agent',
  'daily-standup': 'Standup Agent',
}

function getAgentLabel(agentId?: string): string {
  if (!agentId) return 'Karnex Agent'
  return AGENT_LABELS[agentId] || 'Karnex Agent'
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '~30 seconds'
  if (seconds < 60) return `~${seconds} seconds`
  return `~${Math.ceil(seconds / 60)} minutes`
}

function getCategoryEndpoint(category: string): string {
  if (category === 'build') return 'builder'
  if (category === 'outreach') return 'outreach'
  return 'research'
}

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'build': return 'bg-[#6366f1]/10 text-[#818cf8] border-[#6366f1]/20'
    case 'research': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    case 'outreach': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'content': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
  }
}

function getDefaultDescription(category: string): string[] {
  switch (category) {
    case 'build':
      return [
        'Scaffold React frontend pages',
        'Design SQL schema tables and migration scripts',
        'Set up backend API controllers',
        'Deploy preview URLs to staging',
      ]
    case 'outreach':
      return [
        'Compose a personalized outreach sequence',
        'Locate target profiles matching your ICP',
        'Save draft outreach to your Vault',
      ]
    default:
      return [
        'Search and synthesize top findings',
        'Map target market segments',
        'Save research brief to your Vault',
      ]
  }
}

export default function AgentExecutePanel({
  task,
  isOpen,
  onClose,
  founderId,
  onTaskComplete,
}: AgentExecutePanelProps) {
  const supabase = createSupabaseBrowserClient()

  const [isExecuting, setIsExecuting] = useState(false)
  const [executionRunId, setExecutionRunId] = useState<string | null>(null)
  const [executionStatus, setExecutionStatus] = useState<string>('idle')
  const [executionProgress, setExecutionProgress] = useState(0)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [executionOutput, setExecutionOutput] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset state when task changes or panel closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset so close animation can play
      const t = setTimeout(() => {
        setIsExecuting(false)
        setExecutionRunId(null)
        setExecutionStatus('idle')
        setExecutionProgress(0)
        setExecutionLogs([])
        setExecutionOutput(null)
        setError(null)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Handle execution completion
  const handleSuccess = useCallback(async (runId: string) => {
    if (!task) return
    try {
      const { data: outRes } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()

      const output = (outRes?.output as Record<string, unknown>) || { summary: 'Agent completed task successfully.' }
      setExecutionOutput(output)
      setIsExecuting(false)

      // Update task in DB
      await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          agent_output: output,
        })
        .eq('id', task.id)

      onTaskComplete?.(task.id)
    } catch (err) {
      console.error('Error handling execution success:', err)
      setExecutionOutput({ summary: 'Task completed.' })
      setIsExecuting(false)
      onTaskComplete?.(task.id)
    }
  }, [task, supabase, onTaskComplete])

  // Realtime subscription to agent_runs
  useEffect(() => {
    if (!executionRunId || executionStatus === 'success' || executionStatus === 'error') return

    const channel = supabase
      .channel(`agent-run-${executionRunId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_runs',
          filter: `id=eq.${executionRunId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newStatus = payload.new.status as string
          setExecutionStatus(newStatus)

          // Map status to progress
          if (newStatus === 'queued') setExecutionProgress(20)
          else if (newStatus === 'running') setExecutionProgress(60)
          else if (newStatus === 'success') {
            setExecutionProgress(100)
            handleSuccess(executionRunId)
          } else if (newStatus === 'error') {
            setExecutionProgress(100)
            setIsExecuting(false)
            const errMsg = (payload.new.error_message as string) || 'Agent failed to run.'
            setExecutionLogs((prev) => [...prev, `❌ Error: ${errMsg}`])
            setError(errMsg)
          }
        }
      )
      .subscribe()

    // Also poll as a fallback (Realtime may not be enabled for all tables)
    const interval = setInterval(async () => {
      const { data: run } = await supabase
        .from('agent_runs')
        .select('status, error_message')
        .eq('id', executionRunId)
        .single()

      if (run) {
        setExecutionStatus(run.status)
        if (run.status === 'queued') setExecutionProgress(20)
        else if (run.status === 'running') setExecutionProgress(60)
        else if (run.status === 'success') {
          setExecutionProgress(100)
          clearInterval(interval)
          handleSuccess(executionRunId)
        } else if (run.status === 'error') {
          setExecutionProgress(100)
          clearInterval(interval)
          setIsExecuting(false)
          setError(run.error_message || 'Agent failed.')
        }
      }
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [executionRunId, executionStatus, supabase, handleSuccess])

  // Trigger execution
  const handleExecute = async () => {
    if (!task) return
    setIsExecuting(true)
    setExecutionStatus('queued')
    setExecutionProgress(10)
    setExecutionOutput(null)
    setError(null)
    setExecutionLogs([
      'Initializing agent pipeline...',
      'Validating task configuration and quotas...',
    ])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated. Please refresh.')
        setIsExecuting(false)
        return
      }

      const config = (task.agent_config || {}) as Record<string, unknown>
      const endpoint = getCategoryEndpoint(task.category)
      let payload: Record<string, unknown> = {}

      // Use pre_populated_input if available, else build category-specific defaults
      if (config.pre_populated_input) {
        payload = config.pre_populated_input as Record<string, unknown>
      } else if (task.category === 'build') {
        payload = {
          task_type: config.task_type || 'scaffold_feature',
          specification: config.specification || task.title,
          tech_stack: config.tech_stack || { framework: 'nextjs', styling: 'tailwind', database: 'supabase' },
        }
      } else if (task.category === 'outreach') {
        payload = {
          campaign_goal: config.campaign_goal || task.title,
          target_audience: config.target_audience || 'Target ICP profiles',
          channel: config.channel || 'email',
          tone: config.tone || 'direct',
          sequence_length: config.sequence_length || 3,
        }
      } else {
        payload = {
          research_question: config.research_question || task.title,
          scope: config.scope || 'general',
          depth: config.depth || 'standard',
        }
      }

      setExecutionLogs((prev) => [...prev, `Triggering /v1/agents/${endpoint}...`])

      const response = await fetch(getAgentApiUrl(`v1/agents/${endpoint}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      setExecutionRunId(result.run_id)
      setExecutionStatus('running')
      setExecutionProgress(30)
      setExecutionLogs((prev) => [
        ...prev,
        `Agent queued. Run ID: ${result.run_id}`,
        'Executing task pipeline...',
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error triggering agent:', err)
      setIsExecuting(false)
      setError(msg)
      setExecutionLogs((prev) => [...prev, `❌ Trigger failed: ${msg}`])
    }
  }

  if (!isOpen || !task) return null

  const config = (task.agent_config || {}) as Record<string, unknown>
  const contextSummary = config.context_summary as string | undefined
  const estimatedSeconds = config.estimated_duration_seconds as number | undefined
  const agentId = config.agent_id as string | undefined

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !isExecuting && onClose()}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-[420px] bg-[#050505] border-l border-[#1a1a1a] shadow-2xl flex flex-col h-full text-[#e5e5e5]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-4">
            <div className="min-w-0">
              <span className={`border px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-[0.05em] ${getCategoryBadgeClass(task.category)}`}>
                {task.category} task
              </span>
              <h2 className="text-[18px] font-bold text-white mt-1 truncate">
                {task.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => !isExecuting && onClose()}
              disabled={isExecuting}
              className="text-[#525252] hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0 ml-3"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {!isExecuting && !executionOutput ? (
              <>
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#525252]">
                    Description
                  </h4>
                  <p className="text-[14px] text-[#a1a1a1] leading-relaxed">
                    {task.description || 'Pre-configured sprint task generated by the roadmap spine.'}
                  </p>
                </div>

                {/* What Karnex will do */}
                <div className="space-y-3 border border-[#1a1a1a] bg-[#0a0a0a] p-5 rounded-2xl">
                  <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#6366f1]">
                    What Karnex will do
                  </h4>
                  {contextSummary ? (
                    <p className="text-[14px] text-[#e5e5e5] leading-relaxed">{contextSummary}</p>
                  ) : (
                    <ul className="text-[13px] text-[#737373] list-disc list-inside space-y-2">
                      {getDefaultDescription(task.category).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Agent info */}
                <div className="flex items-center justify-between text-[13px] text-[#525252]">
                  <span>Agent: <span className="text-[#a1a1a1] font-medium">{getAgentLabel(agentId || getCategoryEndpoint(task.category))}</span></span>
                  <span>{formatDuration(estimatedSeconds)}</span>
                </div>
              </>
            ) : executionOutput ? (
              /* Success state */
              <div className="space-y-4 border border-emerald-500/20 bg-emerald-950/10 p-5 rounded-2xl">
                <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-emerald-400">
                  ✓ Task Completed
                </h4>
                <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
                  Output saved to your Vault.
                </p>
                <div className="bg-[#0a0a0a] rounded-lg p-3 max-h-40 overflow-y-auto text-[12px] font-mono text-[#737373] border border-[#1a1a1a]">
                  {JSON.stringify(executionOutput, null, 2)}
                </div>
                <a href="/vault" className="inline-flex items-center gap-1 text-[13px] text-[#6366f1] hover:text-[#818cf8] font-medium transition-colors">
                  View output →
                </a>
              </div>
            ) : (
              /* Executing state */
              <div className="space-y-5">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-ping" />
                      Running Agent Pipeline…
                    </span>
                    <span className="font-mono text-[#6366f1] font-bold">{executionProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-500"
                      style={{ width: `${executionProgress}%` }}
                    />
                  </div>
                </div>

                {/* Console */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#525252]">
                    Live Logs
                  </h4>
                  <div className="bg-black border border-[#1a1a1a] rounded-xl p-4 h-48 overflow-y-auto font-mono text-[12px] text-[#737373] space-y-1.5">
                    {executionLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        <span className="text-[#525252] select-none">&gt;</span> {log}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="border-t border-[#1a1a1a] px-6 py-4">
            {!executionOutput ? (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="w-full text-center text-[14px] font-bold text-white bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#312e81] py-3.5 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-xl"
              >
                {isExecuting ? 'Running agent pipeline…' : 'Go — let Karnex handle this'}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full text-center text-[14px] font-bold text-[#e5e5e5] bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#262626] py-3.5 rounded-xl transition-all cursor-pointer"
              >
                Close console
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
