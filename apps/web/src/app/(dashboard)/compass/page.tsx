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
    if (score >= 80) return 'from-emerald-400 to-green-500'
    if (score >= 50) return 'from-violet-400 to-blue-500'
    return 'from-amber-400 to-red-500'
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Accountability Compass
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Keep your momentum high and sync with your AI co-founder.
          </p>
        </div>
        
        {/* Momentum Score Widget */}
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0c0c16]/50 p-4 backdrop-blur-xl">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.03]">
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <span className="text-xl font-black text-zinc-100">{momentumScore}</span>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Momentum Score</p>
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-white/[0.05]">
              <div 
                className={`h-full bg-gradient-to-r transition-all duration-1000 ${getMomentumColor(momentumScore)}`} 
                style={{ width: `${loading ? 0 : momentumScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'checkin'
              ? 'border-violet-500 text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Daily Check-in
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'history'
              ? 'border-violet-500 text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Coaching Log ({momentumHistory.length})
        </button>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 rounded-xl md:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {activeTab === 'checkin' ? (
            <>
              {/* Check-in section */}
              <div className="space-y-6 lg:col-span-2">
                {/* Checkin form card */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/60 p-6 backdrop-blur-xl">
                  <h2 className="text-lg font-bold text-zinc-100">Synchronize Check-in</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Submit a quick description of what you did yesterday and what is blocking you.
                  </p>
                  
                  <form onSubmit={handleSubmitCheckin} className="mt-4 space-y-4">
                    <textarea
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="E.g., Finished designing the email campaign layouts. Strived to implement Resend API but getting verification delays. Planning to launch public landing page next."
                      className="min-h-[140px] w-full rounded-lg border border-white/[0.08] bg-black/40 p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !updateText.trim()}
                        className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-40"
                      >
                        {submitting ? 'Running Coach Agent...' : 'Submit Update'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Latest Checkin Result summary if exists */}
                {latestSummary && (
                  <div className="rounded-xl border border-white/[0.06] bg-[#0c0c1c]/40 p-6 backdrop-blur-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-zinc-100">Co-Founder Feedback</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold bg-white/5 ${
                        latestSummary.momentum_delta >= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {latestSummary.momentum_delta >= 0 ? '+' : ''}
                        {latestSummary.momentum_delta} Momentum
                      </span>
                    </div>

                    <p className="text-sm italic text-zinc-400">
                      &ldquo;{latestSummary.encouragement}&rdquo;
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/[0.02] p-4">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Completed Yesterday</span>
                        {latestSummary.yesterday_completed.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {latestSummary.yesterday_completed.map((task, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-zinc-600">No tasks completed</p>
                        )}
                      </div>

                      <div className="rounded-lg bg-white/[0.02] p-4">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Today&apos;s Priorities</span>
                        {latestSummary.today_priorities.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {latestSummary.today_priorities.map((task, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-zinc-600">No priorities set</p>
                        )}
                      </div>
                    </div>

                    {latestSummary.blockers_identified && latestSummary.blockers_identified.length > 0 && (
                      <div className="rounded-lg bg-red-950/10 border border-red-500/10 p-4 space-y-2">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Blockers Identified</span>
                        <ul className="space-y-2">
                          {latestSummary.blockers_identified.map((blocker, i) => (
                            <li key={i} className="text-xs text-zinc-300">
                              <span className="font-semibold text-red-400">Blocker: </span> {blocker}
                              {latestSummary.blocker_suggestions && latestSummary.blocker_suggestions[i] && (
                                <p className="mt-1 text-zinc-400 italic">
                                  💡 Suggestion: {latestSummary.blocker_suggestions[i]}
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
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/60 p-6 backdrop-blur-xl">
                  <h2 className="text-lg font-bold text-zinc-100">Sprint Board</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Active tasks in your current sprint cycle.
                  </p>
                  
                  <div className="mt-4 space-y-3">
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 text-xs"
                        >
                          <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                            task.status === 'done' 
                              ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' 
                              : task.status === 'blocked'
                              ? 'bg-red-950/30 text-red-400 border-red-500/20'
                              : task.status === 'in_progress'
                              ? 'bg-violet-950/30 text-violet-400 border-violet-500/20'
                              : 'bg-zinc-950/30 text-zinc-400 border-zinc-500/20'
                          }`}>
                            {task.status}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-zinc-200 truncate">{task.title}</h4>
                            {task.description && (
                              <p className="mt-1 text-zinc-500 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-600">No active sprint tasks</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* History view */
            <div className="space-y-6 lg:col-span-3">
              {momentumHistory.length > 0 ? (
                momentumHistory.map((item, index) => (
                  <div key={index} className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/40 p-6 backdrop-blur-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-500">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold bg-white/5 ${
                        item.momentum_delta >= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {item.momentum_delta >= 0 ? '+' : ''}{item.momentum_delta} Momentum
                      </span>
                    </div>
                    <p className="text-sm italic text-zinc-400">&ldquo;{item.encouragement}&rdquo;</p>
                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-white/[0.04]">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Completed</span>
                        <ul className="mt-1 space-y-1">
                          {item.yesterday_completed.map((t, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-emerald-500" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Target Priorities</span>
                        <ul className="mt-1 space-y-1">
                          {item.today_priorities.map((t, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-violet-400" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/60 p-12 text-center">
                  <p className="text-sm text-zinc-500">No daily check-ins recorded yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
