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

function getCategoryTheme(category: string) {
  switch (category) {
    case 'build':
      return {
        badge: 'bg-[#6366f1]/10 text-[#818cf8] border-[#6366f1]/20',
        color: '#6366f1',
        icon: (
          <svg className="w-8 h-8 animate-pulse text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        )
      }
    case 'research':
      return {
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        color: '#06b6d4',
        icon: (
          <svg className="w-8 h-8 animate-pulse text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
        )
      }
    case 'outreach':
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        color: '#10b981',
        icon: (
          <svg className="w-8 h-8 animate-pulse text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        )
      }
    default:
      return {
        badge: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
        color: '#71717a',
        icon: (
          <svg className="w-8 h-8 animate-pulse text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )
      }
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

// Simple color helper for syntax logs
function parseLogLine(log: string) {
  if (log.startsWith('❌') || log.toLowerCase().includes('error')) {
    return <span className="text-red-400 font-semibold">{log}</span>
  }
  if (log.startsWith('✓') || log.toLowerCase().includes('success') || log.toLowerCase().includes('complete')) {
    return <span className="text-emerald-400 font-semibold">{log}</span>
  }
  if (log.includes('run') || log.includes('run_id')) {
    return <span className="text-indigo-400">{log}</span>
  }
  if (log.includes('Streaming') || log.includes('Checking')) {
    return <span className="text-zinc-500 italic">{log}</span>
  }
  return <span>{log}</span>
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
  const theme = getCategoryTheme(task.category)

  const config = (task.agent_config || {}) as Record<string, unknown>
  const contextSummary = config.context_summary as string | undefined
  const estimatedSeconds = config.estimated_duration_seconds as number | undefined
  const agentId = config.agent_id as string | undefined

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => !isExecuting && onClose()}
      />

      {/* Slide-over panel container */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-[440px] bg-[#050507] border-l border-[#1c1c20] shadow-2xl flex flex-col h-full text-[#e5e5e5]">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1a1a1f] px-6 py-5">
            <div className="min-w-0">
              <span className={`border px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}>
                {task.category} Task
              </span>
              <h2 className="text-[18px] font-bold text-white mt-1 truncate tracking-tight">
                {task.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => !isExecuting && onClose()}
              disabled={isExecuting}
              className="text-[#52525c] hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0 ml-3 bg-neutral-900/40 p-1.5 rounded-lg border border-[#1a1a1f]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            
            {/* Task Details State (Before Launch) */}
            {!isExecuting && !showSuccess ? (
              <>
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#52525c]">
                    Description
                  </h4>
                  <p className="text-[14px] text-[#a1a1a1] leading-relaxed">
                    {task.description || 'Pre-configured sprint task generated by the roadmap spine.'}
                  </p>
                </div>

                {/* Visual Strategy Card */}
                <div className="space-y-4 border border-[#1d1d22]/50 bg-[#0a0a0f]/60 p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full pointer-events-none" />
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/[0.02] border border-[#1a1a1f]">
                      {theme.icon}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold uppercase tracking-wider text-white">
                        Agent Strategy
                      </h4>
                      <p className="text-[11px] text-[#52525c] font-mono">Autonomic Executer Pipeline</p>
                    </div>
                  </div>

                  <div className="h-px bg-[#18181c]" />

                  {contextSummary ? (
                    <p className="text-[13px] text-[#d4d4d8] leading-relaxed font-sans">{contextSummary}</p>
                  ) : (
                    <ul className="text-[13px] text-[#a1a1a1] space-y-2">
                      {getDefaultDescription(task.category).map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#6366f1] shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Metadata Info */}
                <div className="flex items-center justify-between text-[12px] font-mono text-[#52525c] bg-[#070709] border border-[#16161a] p-3.5 rounded-xl">
                  <span>AGENT: <span className="text-[#a1a1a1] font-semibold">{getAgentLabel(agentId || getCategoryEndpoint(task.category))}</span></span>
                  <span>EST: <span className="text-[#a1a1a1] font-semibold">{formatDuration(estimatedSeconds)}</span></span>
                </div>
              </>
            ) : showSuccess ? (
              /* Success Outputs */
              <div className="space-y-5">
                <div className="border border-emerald-500/20 bg-emerald-950/10 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur pointer-events-none" />
                  
                  <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-emerald-400 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[11px]">✓</span>
                    {task.category === 'outreach' || isPendingApproval
                      ? 'Campaign Draft Complete'
                      : 'Task Completed Successfully'}
                  </h4>
                  
                  <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
                    {task.category === 'outreach' || isPendingApproval
                      ? 'The Outreach agent has compiled the target list and drafted the personalized message chain. Review it before dispatching.'
                      : 'The requested action has been completed. Detailed schema updates and outputs are saved below.'}
                  </p>

                  <div className="flex gap-3 mt-1">
                    <a href="/vault" className="text-[12px] text-[#6366f1] hover:text-[#818cf8] font-bold transition-colors">
                      View in Vault →
                    </a>
                    {(task.category === 'outreach' || isPendingApproval) && (
                      <a href="/agents/outreach" className="text-[12px] text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                        Open Campaign Suite →
                      </a>
                    )}
                  </div>
                </div>

                {executionOutput && (
                  <div className="space-y-2">
                    <h4 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#52525c]">Output Payload</h4>
                    <div className="bg-[#070709] rounded-xl p-4 max-h-56 overflow-y-auto text-[11px] font-mono text-[#a1a1a1] border border-[#16161a] scrollbar-thin">
                      <pre className="whitespace-pre-wrap leading-normal">{JSON.stringify(executionOutput, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Executing Live Pipeline Cockpit */
              <div className="space-y-6">
                {/* Progress Dial */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-[forgePulseRing_2s_infinite]" />
                      {stepLabel || 'Running Agent Pipeline…'}
                    </span>
                    <span className="font-mono text-[#6366f1] font-bold">{executionProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#121215] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] transition-all duration-500 ease-out"
                      style={{ width: `${executionProgress}%` }}
                    />
                  </div>
                </div>

                {/* Subtask checklist progress */}
                {checklistSteps.length > 0 && (
                  <div className="border border-[#17171d]/60 bg-[#08080a] p-4.5 rounded-xl space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#52525c]">Pipeline Milestones</h4>
                    <ul className="space-y-3">
                      {checklistSteps.map((step) => (
                        <li key={step.id} className="flex items-center gap-3 text-[13px]">
                          <span
                            className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                              step.state === 'done'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 checklist-check-done'
                                : step.state === 'active'
                                  ? 'border-[#6366f1]/50 bg-[#6366f1]/10 text-[#818cf8]'
                                  : 'border-[#1f1f24] text-[#404044]'
                            }`}
                          >
                            {step.state === 'done' ? '✓' : step.state === 'active' ? '→' : '○'}
                          </span>
                          <span
                            className={`transition-colors duration-300 ${
                              step.state === 'done'
                                ? 'text-zinc-500'
                                : step.state === 'active'
                                  ? 'text-zinc-100 font-medium'
                                  : 'text-[#404044]'
                            }`}
                          >
                            {step.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Live Console Terminal */}
                <div className="space-y-2">
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#52525c]">
                    Live Output Stream
                  </h4>
                  
                  {/* CRT Scanline Console Container */}
                  <div className="relative overflow-hidden bg-black border border-[#16161a] rounded-2xl p-4.5 h-64 shadow-inner">
                    {/* Scanlines layer */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none z-10" />
                    
                    <div className="h-full overflow-y-auto font-mono text-[11px] text-zinc-400 space-y-2 scrollbar-none relative z-0">
                      {executionLogs.map((log, idx) => (
                        <div key={idx} className="leading-relaxed flex items-start gap-2">
                          <span className="text-[#3a3a40] select-none shrink-0">&gt;</span>
                          <span className="break-all">{parseLogLine(log)}</span>
                        </div>
                      ))}
                      {/* Active cursor blinking at the end */}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[#3a3a40] select-none">&gt;</span>
                        <span className="text-zinc-600 italic text-[10px]">Streaming node events</span>
                        <span className="prompt-cursor" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="space-y-3">
                    <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 leading-relaxed">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={retry}
                      className="text-[13px] font-bold text-white bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Retry Pipeline Action
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Trigger Section */}
          <div className="border-t border-[#1a1a1f] px-6 py-5 bg-[#030305]">
            {!showSuccess ? (
              <button
                onClick={() => void handleExecute()}
                disabled={isExecuting}
                className="w-full text-center text-[14px] font-bold text-white bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#1a1936] disabled:text-zinc-500 disabled:border-transparent py-4 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-xl hover:shadow-[#6366f1]/10 active:scale-[0.98]"
              >
                {isExecuting ? 'Running Agent Engine...' : 'Go — Deploy Agent'}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full text-center text-[14px] font-bold text-[#e5e5e5] bg-[#0a0a0c] border border-[#1a1a1f] hover:border-zinc-800 py-4 rounded-xl transition-all cursor-pointer"
              >
                Dismiss Console
              </button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}
