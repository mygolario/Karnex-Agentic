'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

interface StandupSummary {
  yesterday_completed: string[]
  today_priorities: string[]
  blockers_identified: string[]
  momentum_delta: number
  encouragement: string
  blocker_suggestions?: string[]
}

interface MomentumHistoryItem {
  date: string
  momentum_delta: number
  encouragement: string
  yesterday_completed: string[]
  today_priorities: string[]
}

interface Task {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'deferred'
  description?: string
}

export default function CompassPage() {
  return (
    <ErrorBoundary>
      <CompassContent />
    </ErrorBoundary>
  )
}

function CompassContent() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updateText, setUpdateText] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [momentumScore, setMomentumScore] = useState<number>(50)
  const [momentumHistory, setMomentumHistory] = useState<MomentumHistoryItem[]>([])
  const [latestSummary, setLatestSummary] = useState<StandupSummary | null>(null)
  const [activeTab, setActiveTab] = useState<'checkin' | 'history'>('checkin')

  const supabase = createSupabaseBrowserClient()

  // Fetch initial data: active tasks, momentum score, momentum history
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      // 1. Fetch momentum history
      const momRes = await fetch(getAgentApiUrl('v1/founders/momentum'), {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (momRes.ok) {
        const momData = await momRes.json()
        setMomentumScore(momData.current_score)
        setMomentumHistory(momData.history || [])
        
        // Use the first history item as the latest summary if present
        if (momData.history && momData.history.length > 0) {
          const latest = momData.history[0]
          setLatestSummary({
            yesterday_completed: latest.yesterday_completed,
            today_priorities: latest.today_priorities,
            blockers_identified: [],
            momentum_delta: latest.momentum_delta,
            encouragement: latest.encouragement,
            blocker_suggestions: []
          })
        }
      }

      // 2. Fetch tasks for active sprint from Supabase directly via Client
      const { data: sprintData } = await supabase
        .from('sprints')
        .select('id')
        .eq('founder_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (sprintData) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, title, status, description')
          .eq('sprint_id', sprintData.id)

        if (taskData) {
          setTasks(taskData as Task[])
        }
      }
    } catch (err) {
      console.error('Error fetching compass data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  const handleSubmitCheckin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updateText.trim()) return

    try {
      setSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      // Call Daily Standup Agent Trigger
      const response = await fetch(getAgentApiUrl('v1/agents/daily-standup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          founder_update: updateText,
          yesterday_tasks: tasks.filter(t => t.status === 'in_progress').map(t => t.title),
          today_sprint_tasks: tasks.filter(t => t.status !== 'done').map(t => t.title)
        })
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      setLatestSummary(result.standup_summary)
      setUpdateText('')
      
      // Re-fetch updated tasks and momentum score
      await fetchData()
      setActiveTab('checkin')
    } catch (err) {
      console.error('Error submitting standup check-in:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to complete standup check-in: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const getMomentumColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-teal-400'
    if (score >= 50) return 'from-indigo-500 to-violet-400'
    return 'from-amber-500 to-rose-400'
  }

  // SVG parameters for circular momentum meter
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (momentumScore / 100) * circumference

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12 relative">
      <div className="absolute -top-10 left-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1a1a1a]/40 pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            Accountability Compass
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Synchronize daily standups with your AI co-founder to clear blockers and track velocity.
          </p>
        </div>
        
        {/* Momentum Score Widget */}
        <div className="flex items-center gap-4 rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-4 shrink-0 hover:border-indigo-500/20 transition-all">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#050508] border border-zinc-850/60 shrink-0">
            {loading ? (
              <Skeleton className="h-8 w-8 rounded bg-[#18181c]" />
            ) : (
              <span className="text-base font-black text-white font-mono">{momentumScore}</span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Momentum Score</p>
            <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-zinc-900">
              <div 
                className={`h-full bg-gradient-to-r transition-all duration-1000 ${getMomentumColor(momentumScore)}`} 
                style={{ width: `${loading ? 0 : momentumScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex border-b border-[#1a1a1a]/40">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`px-4 py-3 text-xs font-bold font-mono uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'checkin'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Daily Sync
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-xs font-bold font-mono uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Coaching Archives ({momentumHistory.length})
        </button>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl bg-[#18181c] md:col-span-2" />
          <Skeleton className="h-64 rounded-2xl bg-[#18181c]" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {activeTab === 'checkin' ? (
            <>
              {/* Check-in section */}
              <div className="space-y-6 lg:col-span-2">
                
                {/* Checkin form card */}
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-200">Submit Daily Check-in</h2>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      Describe yesterday&apos;s achievements, today&apos;s goals, and any engineering bottlenecks.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmitCheckin} className="space-y-4">
                    <textarea
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="E.g., Finished designing the email campaign layouts. Strived to implement Resend API but getting verification delays. Planning to launch public landing page next."
                      className="min-h-[140px] w-full rounded-xl border border-[#1a1a1a] bg-[#030303] p-4 text-sm text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none leading-relaxed"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !updateText.trim()}
                        className="rounded-xl bg-indigo-500 hover:bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/10 cursor-pointer disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {submitting ? 'Running Coach Agent...' : 'Submit Update'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Latest Checkin Result summary if exists */}
                {latestSummary && (
                  <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.01] p-6 space-y-5 animate-reveal">
                    <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
                        </span>
                        <h3 className="text-[10px] font-bold text-violet-400 tracking-wider uppercase font-mono">Co-Founder Feedback</h3>
                      </div>
                      
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border font-mono ${
                        latestSummary.momentum_delta >= 0 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {latestSummary.momentum_delta >= 0 ? '+' : ''}
                        {latestSummary.momentum_delta} Momentum
                      </span>
                    </div>

                    <p className="text-sm italic text-zinc-300 leading-relaxed pl-3 border-l border-zinc-700">
                      &ldquo;{latestSummary.encouragement}&rdquo;
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-black/40 border border-[#1a1a1a]/60 p-4">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Completed Yesterday</span>
                        {latestSummary.yesterday_completed.length > 0 ? (
                          <ul className="mt-2.5 space-y-2">
                            {latestSummary.yesterday_completed.map((task, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <span className="leading-relaxed">{task}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2.5 text-xs text-zinc-600 font-mono italic">No tasks logged</p>
                        )}
                      </div>

                      <div className="rounded-xl bg-black/40 border border-[#1a1a1a]/60 p-4">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Today&apos;s Priorities</span>
                        {latestSummary.today_priorities.length > 0 ? (
                          <ul className="mt-2.5 space-y-2">
                            {latestSummary.today_priorities.map((task, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                <span className="leading-relaxed">{task}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2.5 text-xs text-zinc-600 font-mono italic">No priorities set</p>
                        )}
                      </div>
                    </div>

                    {latestSummary.blockers_identified && latestSummary.blockers_identified.length > 0 && (
                      <div className="rounded-xl bg-red-950/10 border border-red-500/10 p-5 space-y-3">
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider font-mono block">Identified Blockers</span>
                        <ul className="space-y-3">
                          {latestSummary.blockers_identified.map((blocker, i) => (
                            <li key={i} className="text-xs text-zinc-300 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-red-500 shrink-0" />
                                <span className="font-semibold text-red-400">Blocker: </span> <span>{blocker}</span>
                              </div>
                              {latestSummary.blocker_suggestions && latestSummary.blocker_suggestions[i] && (
                                <p className="text-[11px] text-zinc-400 bg-black/30 border border-zinc-800/40 p-2.5 rounded italic leading-relaxed mt-1">
                                  💡 Co-founder suggestion: {latestSummary.blocker_suggestions[i]}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Task Sidebar list */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-200">Active Sprint Board</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Active sprint goals and task status in this cycle.
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="flex items-start gap-3 rounded-xl border border-[#1a1a1a]/50 bg-black/30 p-3.5 hover:border-zinc-800 transition-all text-xs"
                        >
                          <span className={`mt-0.5 rounded px-2 py-0.5 text-[8px] font-bold border font-mono uppercase tracking-wider shrink-0 ${
                            task.status === 'done' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                              : task.status === 'blocked'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/15'
                              : task.status === 'in_progress'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15'
                              : 'bg-zinc-900 text-zinc-450 border-zinc-800/60'
                          }`}>
                            {task.status}
                          </span>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="font-semibold text-zinc-200 truncate leading-tight">{task.title}</h4>
                            {task.description && (
                              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{task.description}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-650 font-mono italic text-center py-4">No active sprint tasks found.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* History view */
            <div className="space-y-6 lg:col-span-3">
              {momentumHistory.length > 0 ? (
                <div className="relative border-l border-zinc-850 ml-4 pl-6 space-y-8 py-2">
                  {momentumHistory.map((item, index) => (
                    <div key={index} className="relative group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[30px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-zinc-800 bg-[#050508] text-zinc-650">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                      </span>

                      <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 space-y-4 hover:border-zinc-800 transition-all">
                        <div className="flex items-center justify-between border-b border-zinc-850/40 pb-3">
                          <span className="text-xs font-bold text-zinc-400 font-mono">
                            {new Date(item.date).toLocaleDateString(undefined, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border font-mono ${
                            item.momentum_delta >= 0 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {item.momentum_delta >= 0 ? '+' : ''}{item.momentum_delta} Momentum
                          </span>
                        </div>
                        
                        <p className="text-sm italic text-zinc-300 leading-relaxed">&ldquo;{item.encouragement}&rdquo;</p>
                        
                        <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-zinc-850/40">
                          <div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">Completed</span>
                            <ul className="mt-2 space-y-1.5">
                              {item.yesterday_completed.map((t, i) => (
                                <li key={i} className="text-xs text-zinc-450 flex items-start gap-1.5">
                                  <span className="h-1 w-1 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">Target Priorities</span>
                            <ul className="mt-2 space-y-1.5">
                              {item.today_priorities.map((t, i) => (
                                <li key={i} className="text-xs text-zinc-450 flex items-start gap-1.5">
                                  <span className="h-1 w-1 rounded-full bg-indigo-400 mt-2 shrink-0" />
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-12 text-center text-zinc-600">
                  <p className="text-sm font-mono">No daily check-ins recorded yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

