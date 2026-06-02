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

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      {/* Page Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-[#1a1a1a] pb-8">
        <div>
          <h1 className="font-display font-bold text-[clamp(28px,3.5vw,36px)] leading-[1.15] tracking-[-0.025em] text-white">
            Accountability Compass
          </h1>
          <p className="mt-2 text-[15px] text-[#737373]">
            Synchronize daily standups with your AI co-founder to clear blockers and track velocity.
          </p>
        </div>
        
        {/* Momentum Score Widget */}
        <div className="flex items-center gap-4 rounded-xl border border-[#1a1a1a] bg-[#050505] p-3 px-4 shrink-0 transition-colors hover:border-[#262626]">
          <div className="flex items-baseline gap-1.5">
            {loading ? (
              <Skeleton className="h-8 w-12 rounded bg-[#1a1a1a]" />
            ) : (
              <>
                <span className="font-display text-2xl font-bold text-white">{momentumScore}</span>
                <span className="text-xs text-[#525252]">/ 100</span>
              </>
            )}
          </div>
          <div className="border-l border-[#1a1a1a] h-6 pl-4">
            <p className="text-[11px] font-medium text-[#525252] uppercase tracking-[0.06em]">Momentum</p>
            <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-[#1a1a1a]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-1000" 
                style={{ width: `${loading ? 0 : momentumScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex border-b border-[#1a1a1a] gap-6">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`pb-4 text-[13px] font-medium tracking-[0.04em] transition-all border-b-2 cursor-pointer ${
            activeTab === 'checkin'
              ? 'border-[#6366f1] text-[#e5e5e5]'
              : 'border-transparent text-[#525252] hover:text-[#a1a1a1]'
          }`}
        >
          Daily Sync
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 text-[13px] font-medium tracking-[0.04em] transition-all border-b-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#6366f1] text-[#e5e5e5]'
              : 'border-transparent text-[#525252] hover:text-[#a1a1a1]'
          }`}
        >
          Coaching Archives ({momentumHistory.length})
        </button>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl bg-[#1a1a1a] md:col-span-2" />
          <Skeleton className="h-64 rounded-2xl bg-[#1a1a1a]" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {activeTab === 'checkin' ? (
            <>
              {/* Check-in section */}
              <div className="space-y-6 lg:col-span-2">
                
                {/* Checkin form card */}
                <div className="dash-card p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#e5e5e5]">Submit Daily Check-in</h2>
                    <p className="mt-1 text-xs text-[#a1a1a1] leading-relaxed">
                      Describe yesterday&apos;s achievements, today&apos;s goals, and any engineering bottlenecks.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmitCheckin} className="space-y-4">
                    <textarea
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="E.g., Finished designing the email campaign layouts. Strived to implement Resend API but getting verification delays. Planning to launch public landing page next."
                      className="dash-input min-h-[140px]"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !updateText.trim()}
                        className="dash-btn dash-btn-primary"
                      >
                        {submitting ? 'Running Coach Agent...' : 'Submit Update'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Latest Checkin Result summary if exists */}
                {latestSummary && (
                  <div className="dash-card p-6 space-y-5 border-indigo-500/20 bg-indigo-500/[0.01] animate-reveal">
                    <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
                        <h3 className="text-[11px] font-medium text-[#6366f1] tracking-[0.06em] uppercase">Co-Founder Feedback</h3>
                      </div>
                      
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                        latestSummary.momentum_delta >= 0 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {latestSummary.momentum_delta >= 0 ? '+' : ''}
                        {latestSummary.momentum_delta} Momentum
                      </span>
                    </div>

                    <p className="text-[14px] italic text-[#e5e5e5] leading-relaxed pl-4 border-l border-[#6366f1]/40">
                      &ldquo;{latestSummary.encouragement}&rdquo;
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-xl">
                        <span className="text-[11px] font-medium text-[#525252] uppercase tracking-[0.06em] block mb-2.5">Completed Yesterday</span>
                        {latestSummary.yesterday_completed.length > 0 ? (
                          <ul className="space-y-2">
                            {latestSummary.yesterday_completed.map((task, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[#a1a1a1]">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <span className="leading-relaxed">{task}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#525252] italic">No tasks logged</p>
                        )}
                      </div>

                      <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-xl">
                        <span className="text-[11px] font-medium text-[#525252] uppercase tracking-[0.06em] block mb-2.5">Today&apos;s Priorities</span>
                        {latestSummary.today_priorities.length > 0 ? (
                          <ul className="space-y-2">
                            {latestSummary.today_priorities.map((task, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[#a1a1a1]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1] mt-1.5 shrink-0" />
                                <span className="leading-relaxed">{task}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#525252] italic">No priorities set</p>
                        )}
                      </div>
                    </div>

                    {latestSummary.blockers_identified && latestSummary.blockers_identified.length > 0 && (
                      <div className="rounded-xl bg-rose-500/[0.02] border border-rose-500/10 p-5 space-y-3">
                        <span className="text-[11px] font-medium text-rose-400 uppercase tracking-[0.06em] block">Identified Blockers</span>
                        <ul className="space-y-3">
                          {latestSummary.blockers_identified.map((blocker, i) => (
                            <li key={i} className="text-xs text-[#a1a1a1] space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-rose-500 shrink-0" />
                                <span className="font-semibold text-rose-450">Blocker: </span> <span>{blocker}</span>
                              </div>
                              {latestSummary.blocker_suggestions && latestSummary.blocker_suggestions[i] && (
                                <p className="text-[11px] text-[#a1a1a1] bg-[#050505] border border-[#1a1a1a] p-2.5 rounded-lg italic leading-relaxed mt-1">
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
                <div className="dash-card p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#e5e5e5]">Active Sprint Board</h2>
                    <p className="mt-1 text-xs text-[#a1a1a1]">
                      Active sprint goals and task status in this cycle.
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="flex items-start gap-3 rounded-xl border border-[#1a1a1a] bg-[#050505] p-3.5 hover:border-[#262626] transition-colors text-xs"
                        >
                          <span className={`mt-0.5 rounded px-2 py-0.5 text-[10px] font-medium border tracking-wider shrink-0 capitalize ${
                            task.status === 'done' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                              : task.status === 'blocked'
                              ? 'bg-rose-500/10 text-rose-450 border-rose-500/15'
                              : task.status === 'in_progress'
                              ? 'bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/15'
                              : 'bg-[#1a1a1a] text-[#a1a1a1] border-[#262626]'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="font-medium text-[#e5e5e5] truncate leading-tight">{task.title}</h4>
                            {task.description && (
                              <p className="text-[11px] text-[#525252] line-clamp-2 leading-relaxed">{task.description}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#525252] italic text-center py-4">No active sprint tasks found.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* History view */
            <div className="space-y-6 lg:col-span-3">
              {momentumHistory.length > 0 ? (
                <div className="relative border-l border-[#1a1a1a] ml-4 pl-6 space-y-8 py-2">
                  {momentumHistory.map((item, index) => (
                    <div key={index} className="relative group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[30px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#050505] text-[#525252]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1a1a1a]" />
                      </span>

                      <div className="dash-card p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                          <span className="text-xs font-semibold text-[#a1a1a1]">
                            {new Date(item.date).toLocaleDateString(undefined, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                            item.momentum_delta >= 0 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-450'
                          }`}>
                            {item.momentum_delta >= 0 ? '+' : ''}{item.momentum_delta} Momentum
                          </span>
                        </div>
                        
                        <p className="text-sm italic text-[#e5e5e5] leading-relaxed pl-4 border-l border-[#6366f1]/40">&ldquo;{item.encouragement}&rdquo;</p>
                        
                        <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-[#1a1a1a]">
                          <div>
                            <span className="text-[11px] font-medium text-[#525252] uppercase tracking-[0.06em] block mb-2">Completed</span>
                            <ul className="space-y-1.5">
                              {item.yesterday_completed.map((t, i) => (
                                <li key={i} className="text-xs text-[#a1a1a1] flex items-start gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-[#525252] uppercase tracking-[0.06em] block mb-2">Target Priorities</span>
                            <ul className="space-y-1.5">
                              {item.today_priorities.map((t, i) => (
                                <li key={i} className="text-xs text-[#a1a1a1] flex items-start gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1] mt-1.5 shrink-0" />
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
                <div className="dash-card p-12 text-center text-[#525252]">
                  <p className="text-sm">No daily check-ins recorded yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
