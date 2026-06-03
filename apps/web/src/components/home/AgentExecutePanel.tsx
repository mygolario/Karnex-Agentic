'use client'

import React, { useEffect } from 'react'
import { useAgent } from '@/hooks/use-agent'

export interface AgentTask {
  id: string
  title: string
  description: string | null
  priority: number
  category: 'build' | 'research' | 'outreach' | 'content' | 'design' | 'finance' | 'legal' | 'other'
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'deferred' | 'pending_approval'
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
  founderId: _founderId,
  onTaskComplete,
}: AgentExecutePanelProps) {
  const {
    progress: executionProgress,
    logs: executionLogs,
    output: executionOutput,
    error,
    isExecuting,
    execute: handleExecute,
    retry,
    reset,
    stepLabel,
    checklistSteps,
  } = useAgent({
    task,
    enabled: isOpen,
    onTaskComplete,
  })

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => reset(), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen, reset])

  if (!isOpen || !task) return null

  const isPendingApproval = task.status === 'pending_approval'
  const showSuccess = Boolean(executionOutput) || isPendingApproval

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
            {!isExecuting && !showSuccess ? (
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
            ) : showSuccess ? (
              <div className="space-y-4 border border-emerald-500/20 bg-emerald-950/10 p-5 rounded-2xl">
                <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-emerald-400">
                  {task.category === 'outreach' || isPendingApproval
                    ? 'Campaign draft ready'
                    : '✓ Task Completed'}
                </h4>
                <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
                  {task.category === 'outreach' || isPendingApproval
                    ? 'Review your outreach draft before anything is sent. Output saved to Vault.'
                    : 'Output saved to your Vault.'}
                </p>
                {executionOutput && (
                  <div className="bg-[#0a0a0a] rounded-lg p-3 max-h-40 overflow-y-auto text-[12px] font-mono text-[#737373] border border-[#1a1a1a]">
                    {JSON.stringify(executionOutput, null, 2)}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <a href="/vault" className="inline-flex items-center gap-1 text-[13px] text-[#6366f1] hover:text-[#818cf8] font-medium transition-colors">
                    View output →
                  </a>
                  {(task.category === 'outreach' || isPendingApproval) && (
                    <a href="/agents/outreach" className="inline-flex items-center gap-1 text-[13px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                      Review campaign →
                    </a>
                  )}
                </div>
              </div>
            ) : (
              /* Executing state */
              <div className="space-y-5">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-ping" />
                      {stepLabel || 'Running Agent Pipeline…'}
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

                {checklistSteps.length > 0 && (
                  <ul className="space-y-2">
                    {checklistSteps.map((step) => (
                      <li key={step.id} className="flex items-center gap-3 text-[13px]">
                        <span
                          className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            step.state === 'done'
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                              : step.state === 'active'
                                ? 'border-[#6366f1]/50 bg-[#6366f1]/10 text-[#818cf8]'
                                : 'border-[#262626] text-zinc-600'
                          }`}
                        >
                          {step.state === 'done' ? '✓' : step.state === 'active' ? '→' : '○'}
                        </span>
                        <span
                          className={
                            step.state === 'done'
                              ? 'text-zinc-400'
                              : step.state === 'active'
                                ? 'text-zinc-100'
                                : 'text-zinc-600'
                          }
                        >
                          {step.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

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
                  <div className="space-y-2">
                    <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={retry}
                      className="text-[13px] font-semibold text-[#6366f1] hover:text-[#818cf8] cursor-pointer"
                    >
                      Try again →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="border-t border-[#1a1a1a] px-6 py-4">
            {!showSuccess ? (
              <button
                onClick={() => void handleExecute()}
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
