'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

interface Task {
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
}

interface Founder {
  id: string
  full_name: string
  display_name: string | null
  momentum_score: number
  streak_days: number
  last_standup_at: string | null
  onboarding_step: number
}

interface Subscription {
  plan: string
  tasks_used_this_cycle: number
  tasks_limit: number
}

const checkIsStandupSubmitted = (lastStandupAt: string | null) => {
  if (!lastStandupAt) return false
  const lastStandup = new Date(lastStandupAt)
  const today = new Date()
  return (
    lastStandup.getDate() === today.getDate() &&
    lastStandup.getMonth() === today.getMonth() &&
    lastStandup.getFullYear() === today.getFullYear()
  )
}

interface DashboardHQProps {
  initialFounder: Founder
  initialSubscription: Subscription | null
  initialTasks: Task[]
  initialRoadmapProgress: {
    phaseTitle: string
    percentComplete: number
    daysRemaining: number
  }
}

export default function DashboardHQ({
  initialFounder,
  initialSubscription,
  initialTasks,
  initialRoadmapProgress
}: DashboardHQProps) {
  const supabase = createSupabaseBrowserClient()

  // State
  const [founder, setFounder] = useState<Founder>(initialFounder)
  const [subscription, setSubscription] = useState<Subscription | null>(initialSubscription)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [roadmapProgress] = useState(initialRoadmapProgress)

  // Standup State
  const [standupInput, setStandupInput] = useState('')
  const [isStandupSubmitted, setIsStandupSubmitted] = useState(() => checkIsStandupSubmitted(initialFounder.last_standup_at))
  const [submittingStandup, setSubmittingStandup] = useState(false)
  const [coachingMessage, setCoachingMessage] = useState<string | null>(() => 
    checkIsStandupSubmitted(initialFounder.last_standup_at)
      ? `Great job doing your standup today! Sarah. Let's tackle today's priorities.`
      : null
  )

  // Execution Slide-over State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionRunId, setExecutionRunId] = useState<string | null>(null)
  const [executionStatus, setExecutionStatus] = useState<string>('idle')
  const [executionProgress, setExecutionProgress] = useState(0)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [executionOutput, setExecutionOutput] = useState<Record<string, unknown> | null>(null)

  const handleExecutionSuccess = useCallback(async (runId: string) => {
    try {
      // 1. Fetch output
      const { data: outRes } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()

      const output = outRes?.output || { summary: 'Agent completed task successfully.' }
      setExecutionOutput(output as Record<string, unknown>)
      setIsExecuting(false)

      if (selectedTask) {
        // 2. Update task status in local state & DB
        const updatedTask = {
          ...selectedTask,
          status: 'done' as const,
          agent_output: output as Record<string, unknown>
        }

        const { error: taskErr } = await supabase
          .from('tasks')
          .update({
            status: 'done',
            completed_at: new Date().toISOString(),
            agent_output: output
          })
          .eq('id', selectedTask.id)

        if (taskErr) throw taskErr

        // 3. Save into founder memory (Vault)
        await supabase.from('founder_memory').insert({
          founder_id: founder.id,
          memory_type: 'agent_output',
          content: {
            task_title: selectedTask.title,
            agent_run_id: runId,
            output: output
          }
        })

        // Refresh tasks
        setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updatedTask : t)))
        
        // Update momentum score
        const newScore = Math.min(100, founder.momentum_score + 5)
        setFounder((f) => ({ ...f, momentum_score: newScore }))
        await supabase
          .from('founders')
          .update({ momentum_score: newScore })
          .eq('id', founder.id)

        // Increment tasks used
        if (subscription) {
          setSubscription((s) => s ? { ...s, tasks_used_this_cycle: s.tasks_used_this_cycle + 1 } : null)
        }
      }
    } catch (err) {
      console.error('Error handling execution success:', err)
    }
  }, [selectedTask, founder, subscription, supabase])

  // Polling for agent run status
  useEffect(() => {
    if (!executionRunId || executionStatus === 'success' || executionStatus === 'error') return

    const interval = setInterval(async () => {
      try {
        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message, logs')
          .eq('id', executionRunId)
          .single()

        if (error) throw error

        if (run) {
          setExecutionStatus(run.status)
          
          // Map status to progress bar percent
          let pct = 10
          if (run.status === 'queued') pct = 20
          else if (run.status === 'running') pct = 60
          else if (run.status === 'success') pct = 100
          else if (run.status === 'error') pct = 100
          setExecutionProgress(pct)

          if (run.logs && Array.isArray(run.logs)) {
            setExecutionLogs(
              run.logs.map((l: unknown) =>
                typeof l === 'string'
                  ? l
                  : l && typeof l === 'object' && 'message' in l && typeof (l as { message: unknown }).message === 'string'
                  ? (l as { message: string }).message
                  : 'Processing...'
              )
            )
          }

          if (run.status === 'success') {
            clearInterval(interval)
            handleExecutionSuccess(executionRunId)
          } else if (run.status === 'error') {
            clearInterval(interval)
            setIsExecuting(false)
            setExecutionLogs((prev) => [...prev, `❌ Error: ${run.error_message || 'Agent failed to run.'}`])
          }
        }
      } catch (err) {
        console.error('Error polling agent run:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [executionRunId, executionStatus, supabase, handleExecutionSuccess])



  // Submit Standup
  const handleStandupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!standupInput.trim()) return

    setSubmittingStandup(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const yesterdayTaskTitles = tasks.filter(t => t.status === 'done').map(t => t.title)
      const todayTaskTitles = tasks.filter(t => t.status !== 'done').map(t => t.title)

      const response = await fetch(getAgentApiUrl('v1/agents/daily-standup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          founder_update: standupInput,
          yesterday_tasks: yesterdayTaskTitles.length > 0 ? yesterdayTaskTitles : ['Planning out tasks'],
          today_sprint_tasks: todayTaskTitles.slice(0, 3)
        })
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      
      // Update DB
      const todayISO = new Date().toISOString()
      const newScore = Math.min(100, founder.momentum_score + 8)
      const newStreak = founder.streak_days + 1
      
      await supabase
        .from('founders')
        .update({
          last_standup_at: todayISO,
          momentum_score: newScore,
          streak_days: newStreak
        })
        .eq('id', founder.id)

      setFounder((f) => ({
        ...f,
        last_standup_at: todayISO,
        momentum_score: newScore,
        streak_days: newStreak
      }))

      setCoachingMessage(result.synthesized_feedback || 'Standup completed! Keep up the momentum.')
      setIsStandupSubmitted(true)
    } catch (err) {
      console.error('Error submitting standup:', err)
      alert('Failed to submit standup. Proceeding locally.')
      setIsStandupSubmitted(true)
      setCoachingMessage("Good morning, Sarah. Day 47 of 90. Mia responded to your outreach. Open reply?")
    } finally {
      setSubmittingStandup(false)
    }
  }

  // Trigger Let Karnex Agent Run
  const handleTriggerLetKarnex = async () => {
    if (!selectedTask) return

    setIsExecuting(true)
    setExecutionStatus('queued')
    setExecutionProgress(10)
    setExecutionOutput(null)
    setExecutionLogs(['Initializing connection to agent service...', 'Validating quotas and quotas limits...'])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const category = selectedTask.category
      let endpoint = 'research'
      let payload: Record<string, unknown> = {}

      // Get configuration from task config or assign defaults
      const config = selectedTask.agent_config || {}
      
      if (category === 'build') {
        endpoint = 'builder'
        payload = {
          task_type: config.task_type || 'scaffold_feature',
          specification: config.specification || selectedTask.title,
          tech_stack: config.tech_stack || {
            framework: 'nextjs',
            styling: 'tailwind',
            database: 'supabase'
          },
          existing_codebase_context: config.existing_codebase_context || 'Standard Next.js repository layout.',
          design_references: config.design_references || [],
          github_repo: config.github_repo || ''
        }
      } else if (category === 'outreach') {
        endpoint = 'outreach'
        payload = {
          startup_id: config.startup_id || 'active',
          campaign_goal: config.campaign_goal || selectedTask.title,
          target_audience: config.target_audience || 'Freelance designers looking for client tools',
          contacts: config.contacts || [
            { name: 'Mia Brand Designer', email: 'mia@designerportland.com', company: 'Mia Designs' }
          ],
          channel: config.channel || 'email',
          tone: config.tone || 'direct',
          sequence_length: config.sequence_length || 3
        }
      } else {
        // default to research
        endpoint = 'research'
        payload = {
          research_question: config.research_question || selectedTask.title,
          scope: config.scope || 'general',
          depth: config.depth || 'standard',
          preferred_sources: config.preferred_sources || [],
          constraints: config.constraints || null
        }
      }

      setExecutionLogs((prev) => [...prev, `Triggering /v1/agents/${endpoint} execution...`])

      const response = await fetch(getAgentApiUrl(`v1/agents/${endpoint}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      setExecutionRunId(result.run_id)
      setExecutionStatus('running')
      setExecutionLogs((prev) => [...prev, `Agent task queued successfully! Run ID: ${result.run_id}`])

      // Explicitly trigger status update
      await supabase.from('agent_runs').update({
        status: 'running'
      }).eq('id', result.run_id)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown network error'
      console.error('Error triggering agent:', err)
      setExecutionStatus('error')
      setIsExecuting(false)
      setExecutionLogs((prev) => [...prev, `❌ Trigger failed: ${errorMsg}`])
    }
  }

  // Format category badge
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'build': return 'bg-[#6366f1]/10 text-[#818cf8] border-[#6366f1]/20'
      case 'research': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'outreach': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'content': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal relative">
      
      {/* Header — dailyHQ progress spine */}
      <div className="border-b border-[#1a1a1a] pb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[clamp(24px,3vw,32px)] leading-[1.15] tracking-[-0.025em] text-white">
            Good morning, {founder.display_name || founder.full_name || 'Sarah'}
          </h1>
          <p className="mt-1 text-[14px] text-[#737373]">
            Day {90 - roadmapProgress.daysRemaining} of 90.
          </p>
        </div>
        <div className="flex-1 md:max-w-xs space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#a1a1a1] font-medium truncate">{roadmapProgress.phaseTitle}</span>
            <span className="text-[#6366f1] font-semibold font-mono">{roadmapProgress.percentComplete}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-700" 
              style={{ width: `${roadmapProgress.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Standup & Daily tasks */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* STANDUP WIDGET */}
          {!isStandupSubmitted ? (
            <div className="border border-[#1a1a1a] bg-[#050505] p-6 rounded-2xl space-y-4 shadow-sm border-l-2 border-l-[#6366f1]">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#6366f1]">
                  Today&apos;s Morning Standup
                </h3>
                <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
              <form onSubmit={handleStandupSubmit} className="space-y-3.5">
                <p className="text-[14px] text-[#a1a1a1]">
                  What did you ship yesterday? What will you focus on today?
                </p>
                <textarea
                  value={standupInput}
                  onChange={(e) => setStandupInput(e.target.value)}
                  placeholder="e.g., Conducted 3 more user interviews and refined pricing specs. Ready to map competitors today."
                  className="w-full h-24 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-[14px] text-[#e5e5e5] placeholder-[#525252] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition-colors"
                  required
                />
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setIsStandupSubmitted(true)}
                    className="text-[13px] text-[#525252] hover:text-[#737373] transition-colors"
                  >
                    Skip today
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStandup}
                    className="text-[13px] font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#312e81] px-5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    {submittingStandup ? 'Submitting...' : 'Finish Standup'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            coachingMessage && (
              <div className="border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl flex items-start gap-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/10 text-[#6366f1]">
                  💬
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">Karnex says</p>
                  <p className="text-[14px] text-[#e5e5e5] leading-relaxed">
                    {coachingMessage}
                  </p>
                </div>
              </div>
            )
          )}

          {/* TASKS LIST */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold tracking-[0.06em] uppercase text-[#525252]">
                Your 3 Tasks for Today
              </h2>
              <span className="text-[12px] text-[#525252]">Sprint Priorities</span>
            </div>
            
            <div className="space-y-3">
              {tasks.slice(0, 3).map((task) => (
                <div 
                  key={task.id}
                  className={`border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl flex items-center justify-between gap-4 transition-all hover:border-[#262626] ${
                    task.status === 'done' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`border px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-[0.05em] ${getCategoryBadgeClass(task.category)}`}>
                        {task.category}
                      </span>
                      {task.status === 'done' && (
                        <span className="text-emerald-400 text-[12px] font-semibold flex items-center gap-1">
                          ✓ Done
                        </span>
                      )}
                    </div>
                    <h4 className={`text-[15px] font-semibold text-white truncate ${task.status === 'done' ? 'line-through' : ''}`}>
                      {task.title}
                    </h4>
                    <p className="text-[13px] text-[#737373] line-clamp-1">
                      {task.description || 'Pre-configured co-founder task.'}
                    </p>
                  </div>
                  
                  {task.status !== 'done' && (
                    <button
                      onClick={() => {
                        setSelectedTask(task)
                        setIsSlideOverOpen(true)
                      }}
                      className="shrink-0 text-[13px] font-semibold text-white bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#262626] hover:bg-[#111] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      {task.execute_label || 'Let Karnex'}
                    </button>
                  )}
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="border border-[#1a1a1a] border-dashed p-10 text-center rounded-2xl text-[#525252]">
                  <p className="text-[14px]">All tasks for today are completed! Check back tomorrow.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Momentum Metrics sidebar */}
        <div className="space-y-6">
          
          {/* Momentum Scorecard */}
          <div className="border border-[#1a1a1a] bg-[#050505] p-6 rounded-2xl space-y-4">
            <h3 className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">Momentum Stats</h3>
            
            {/* Momentum widget */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-[14px] text-[#a1a1a1]">Score</span>
                <span className="font-display font-bold text-[36px] tracking-[-0.03em] text-white font-mono">{founder.momentum_score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-700" 
                  style={{ width: `${founder.momentum_score}%` }}
                />
              </div>
            </div>

            <hr className="border-[#1a1a1a]" />

            {/* Streak */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[#a1a1a1]">Active Streak</span>
              <span className="font-semibold text-white text-[15px] font-mono">{founder.streak_days} days</span>
            </div>

            <hr className="border-[#1a1a1a]" />

            {/* Credits / Task meter */}
            {subscription && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#a1a1a1]">Tasks Used</span>
                  <span className="font-semibold text-white font-mono">{subscription.tasks_used_this_cycle} / {subscription.tasks_limit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700" 
                    style={{ width: `${(subscription.tasks_used_this_cycle / subscription.tasks_limit) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tips / Coach insight sidebar */}
          <div className="border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl space-y-3">
            <h4 className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#6366f1]">Startup Moat</h4>
            <p className="text-[13px] text-[#737373] leading-relaxed">
              Karnex runs background validation loops to analyze competitor pricing plans. Check integrations to ensure automated workflows are active.
            </p>
          </div>

        </div>

      </div>

      {/* LET KARNEX EXECUTION SLIDE-OVER PANEL */}
      {isSlideOverOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => !isExecuting && setIsSlideOverOpen(false)} />

          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md transform bg-[#050505] border-l border-[#1a1a1a] p-6 shadow-2xl transition-all flex flex-col h-full text-[#e5e5e5]">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4 mb-6">
                <div>
                  <span className={`border px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-[0.05em] ${getCategoryBadgeClass(selectedTask.category)}`}>
                    {selectedTask.category} Task
                  </span>
                  <h2 className="text-[18px] font-bold text-white mt-1 truncate" id="slide-over-title">
                    {selectedTask.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !isExecuting && setIsSlideOverOpen(false)}
                  disabled={isExecuting}
                  className="text-[#525252] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#525252]">Description</h4>
                  <p className="text-[14px] text-[#a1a1a1] leading-relaxed">
                    {selectedTask.description || 'This is a pre-configured sprint task generated by the roadmap spine.'}
                  </p>
                </div>

                {!isExecuting && !executionOutput ? (
                  <div className="space-y-4 border border-[#1a1a1a] bg-[#0a0a0a] p-5 rounded-2xl">
                    <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#6366f1]">Agent Strategy</h4>
                    <p className="text-[14px] text-[#e5e5e5]">
                      Based on the task requirements, the co-founder agent will perform:
                    </p>
                    <ul className="text-[13px] text-[#737373] list-disc list-inside space-y-2">
                      {selectedTask.category === 'build' ? (
                        <>
                          <li>Scaffold React frontend pages</li>
                          <li>Design SQL schema tables and migration scripts</li>
                          <li>Set up backend API controllers</li>
                          <li>Deploy preview URLs to staging environments</li>
                        </>
                      ) : selectedTask.category === 'outreach' ? (
                        <>
                          <li>Compose a highly personalized 3-step outreach sequence</li>
                          <li>Locate 10 target profiles matching your ICP profile</li>
                          <li>Save draft outreach metrics directly inside Vault</li>
                        </>
                      ) : (
                        <>
                          <li>Search Google and synthesize top competitor wedges</li>
                          <li>Map target market segments and budget values</li>
                          <li>Save brief document directly inside Vault</li>
                        </>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Progress indicator */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-white flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-ping" />
                          Running Agent Pipeline...
                        </span>
                        <span className="font-mono text-[#6366f1] font-bold">{executionProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-300"
                          style={{ width: `${executionProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Console Logs */}
                    <div className="space-y-2">
                      <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#525252]">Active Logs</h4>
                      <div className="bg-black border border-[#1a1a1a] rounded-xl p-4 h-48 overflow-y-auto font-mono text-[12px] text-[#737373] space-y-1.5 scrollbar-thin">
                        {executionLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed">
                            <span className="text-[#525252] select-none">&gt;</span> {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Output results */}
                {executionOutput && (
                  <div className="space-y-4 border border-[#1a1a1a] bg-emerald-950/10 border-emerald-500/20 p-5 rounded-2xl">
                    <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-emerald-400">✓ Task Output Saved</h4>
                    <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
                      Output payload is attached and stored in the **Vault**.
                    </p>
                    <div className="bg-[#0a0a0a] rounded-lg p-3 max-h-40 overflow-y-auto text-[12px] font-mono text-[#737373] scrollbar-thin border border-[#1a1a1a]">
                      {JSON.stringify(executionOutput, null, 2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Trigger footer */}
              <div className="border-t border-[#1a1a1a] pt-4 mt-6">
                {!executionOutput ? (
                  <button
                    onClick={handleTriggerLetKarnex}
                    disabled={isExecuting}
                    className="w-full text-center text-[14px] font-bold text-white bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#312e81] py-3.5 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-xl"
                  >
                    {isExecuting ? 'Running co-founder pipeline...' : 'Go — let Karnex handle this'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsSlideOverOpen(false)
                      setExecutionOutput(null)
                    }}
                    className="w-full text-center text-[14px] font-bold text-[#e5e5e5] bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#262626] py-3.5 rounded-xl transition-all cursor-pointer"
                  >
                    Close console
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
