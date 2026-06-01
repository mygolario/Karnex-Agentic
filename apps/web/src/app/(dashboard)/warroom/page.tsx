'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface TaskRecord {
  id: string
  sprint_id: string
  title: string
  description?: string
  priority: number
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'deferred'
  estimated_hours?: number
}

interface SprintRecord {
  id: string
  roadmap_id: string
  sprint_number: number
  title: string
  week_start: string
  week_end: string
  goals: string[]
  focus_area?: string
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  tasks?: TaskRecord[]
}

interface WeeklyGoalRecord {
  week_number: number
  focus: string
  goals: string[]
  estimated_hours: number
}

interface PhaseRecord {
  phase_number: number
  title: string
  theme: string
  weekly_goals?: WeeklyGoalRecord[]
  milestones?: unknown[]
}

interface RoadmapRecord {
  id: string
  title: string
  phases: PhaseRecord[]
  start_date: string
}

interface SelectedIdea {
  id: string
  title: string
  proposed_solution: string
  product_brief: {
    title?: string
    problem_statement?: string
    proposed_solution?: string
    target_audience?: string
    market_size_estimate?: string
  } | null
  icp_document: {
    target_audience?: string
    key_risks?: string[]
    next_steps?: string[]
  } | null
}

const AGENT_SERVICE_URL = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || 'http://localhost:8000'

export default function WarRoomPage() {
  return (
    <ErrorBoundary>
      <WarRoomContent />
    </ErrorBoundary>
  )
}

function WarRoomContent() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [recalibrating, setRecalibrating] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<SelectedIdea | null>(null)
  const [activeRoadmap, setActiveRoadmap] = useState<RoadmapRecord | null>(null)
  const [sprints, setSprints] = useState<SprintRecord[]>([])
  
  // Capacity preferences loaded from founder profile
  const [founderCapacity, setFounderCapacity] = useState({
    weekly_hours: 20,
    technical_level: 'intermediate',
    budget_monthly: 500
  })

  // Fetch all initial planning states
  const initPage = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 1. Fetch active selected idea
      const { data: ideaRes } = await supabase
        .from('ideas')
        .select('id, title, proposed_solution, product_brief, icp_document')
        .eq('founder_id', session.user.id)
        .eq('status', 'selected')
        .limit(1)
        .maybeSingle()

      if (ideaRes) {
        setSelectedIdea(ideaRes as SelectedIdea)
      } else {
        setSelectedIdea(null)
      }

      // 2. Fetch founder profile capacity
      const { data: founderRes } = await supabase
        .from('founders')
        .select('weekly_hours_available, technical_level')
        .eq('id', session.user.id)
        .maybeSingle()

      if (founderRes) {
        setFounderCapacity({
          weekly_hours: founderRes.weekly_hours_available ?? 20,
          technical_level: founderRes.technical_level ?? 'intermediate',
          budget_monthly: 500 // fallback
        })
      }

      // 3. Fetch active roadmap
      const { data: roadmapRes } = await supabase
        .from('roadmaps')
        .select('id, title, phases, start_date')
        .eq('founder_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (roadmapRes) {
        setActiveRoadmap(roadmapRes as RoadmapRecord)

        // 4. Fetch sprints and tasks for this roadmap
        const { data: sprintRes } = await supabase
          .from('sprints')
          .select('*')
          .eq('roadmap_id', roadmapRes.id)
          .order('sprint_number', { ascending: true })

        if (sprintRes && sprintRes.length > 0) {
          const sprintsWithTasks: SprintRecord[] = []
          for (const sp of sprintRes) {
            const { data: taskRes } = await supabase
              .from('tasks')
              .select('*')
              .eq('sprint_id', sp.id)
            
            sprintsWithTasks.push({
              ...sp,
              goals: Array.isArray(sp.goals) ? sp.goals : [],
              tasks: (taskRes as TaskRecord[]) || []
            })
          }
          setSprints(sprintsWithTasks)
        } else {
          setSprints([])
        }
      } else {
        setActiveRoadmap(null)
        setSprints([])
      }
    } catch (err) {
      console.error('Error fetching warroom details:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initPage()
  }, [initPage])

  const handleRecalibrateRoadmap = async () => {
    if (!selectedIdea) {
      alert('Please select an active product idea in the Dream Engine first.')
      router.push('/ideas')
      return
    }

    try {
      setRecalibrating(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      // 1. Call agent `/v1/agents/war-room` endpoint
      const response = await fetch(`${AGENT_SERVICE_URL}/v1/agents/war-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          product_brief: selectedIdea.product_brief || {
            title: selectedIdea.title,
            proposed_solution: selectedIdea.proposed_solution
          },
          icp_document: selectedIdea.icp_document || {
            target_audience: 'General users',
            key_risks: [],
            next_steps: []
          },
          founder_capacity: founderCapacity
        })
      })

      if (!response.ok) {
        throw new Error('Failed to recalibrate roadmap via agent service')
      }

      // 2. Fetch the newly inserted active roadmap from database
      // The backend saves the roadmap automatically. We just retrieve it.
      const { data: newRoadmap } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('founder_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!newRoadmap) {
        throw new Error('Could not find newly created roadmap in database')
      }

      // 3. Populate sprints and tasks tables for the 12 weeks of the roadmap
      // Let's delete any old sprints for this roadmap (in case of double triggers)
      await supabase
        .from('sprints')
        .delete()
        .eq('roadmap_id', newRoadmap.id)

      const baseDate = newRoadmap.start_date ? new Date(newRoadmap.start_date) : new Date()

      // Loop through phases and insert sprints & tasks
      if (Array.isArray(newRoadmap.phases)) {
        for (const phase of newRoadmap.phases) {
          if (Array.isArray(phase.weekly_goals)) {
            for (const weeklyGoal of phase.weekly_goals) {
              const weekNum = weeklyGoal.week_number ?? 1
              
              // Calculate calendar dates for this weekly sprint
              const startOffset = (weekNum - 1) * 7 * 24 * 60 * 60 * 1000
              const sprintStart = new Date(baseDate.getTime() + startOffset)
              const sprintEnd = new Date(sprintStart.getTime() + 6 * 24 * 60 * 60 * 1000)

              // Insert Sprint
              const { data: spInserted, error: spErr } = await supabase
                .from('sprints')
                .insert({
                  roadmap_id: newRoadmap.id,
                  founder_id: session.user.id,
                  sprint_number: weekNum,
                  title: `Sprint ${weekNum} — ${weeklyGoal.focus || 'Development'}`,
                  week_start: sprintStart.toISOString().split('T')[0],
                  week_end: sprintEnd.toISOString().split('T')[0],
                  goals: weeklyGoal.goals || [],
                  focus_area: weeklyGoal.focus || 'Build',
                  capacity_hours: weeklyGoal.estimated_hours || founderCapacity.weekly_hours,
                  status: weekNum === 1 ? 'active' : 'planned'
                })
                .select()
                .single()

              if (spErr) throw spErr

              // Insert Tasks for each goal item in this week
              if (spInserted && Array.isArray(weeklyGoal.goals)) {
                const tasksPayload = weeklyGoal.goals.map((goalText: string) => {
                  const estimatedHours = Math.round((weeklyGoal.estimated_hours || founderCapacity.weekly_hours) / weeklyGoal.goals.length)
                  return {
                    sprint_id: spInserted.id,
                    founder_id: session.user.id,
                    title: goalText,
                    description: `Generated goal target for Week ${weekNum}`,
                    priority: 3,
                    estimated_hours: estimatedHours > 0 ? estimatedHours : 2,
                    status: 'todo',
                    category: 'other'
                  }
                })

                if (tasksPayload.length > 0) {
                  const { error: tErr } = await supabase
                    .from('tasks')
                    .insert(tasksPayload)
                  
                  if (tErr) throw tErr
                }
              }
            }
          }
        }
      }

      // Reload all dashboard panels
      await initPage()
    } catch (err) {
      console.error(err)
      alert('Failed to recalibrate roadmap.')
    } finally {
      setRecalibrating(false)
    }
  }

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'done' ? 'todo' : 'done'
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: nextStatus,
          completed_at: nextStatus === 'done' ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) throw error
      initPage()
    } catch (err) {
      console.error(err)
      alert('Failed to update task status.')
    }
  }


  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            War Room
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Plan, coordinate, and execute your 90-day startup sprints with help from your AI co-founder.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRecalibrateRoadmap}
          disabled={recalibrating || !selectedIdea}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10 self-start md:self-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {recalibrating ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Recalibrating Roadmap...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {activeRoadmap ? 'Recalibrate Roadmap' : 'Generate 90-Day Roadmap'}
            </>
          )}
        </button>
      </div>

      {/* Selected Idea Banner context */}
      {selectedIdea ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Active Target Concept</span>
            <h4 className="text-sm font-bold text-zinc-200 mt-0.5">{selectedIdea.title}</h4>
            <p className="text-xs text-zinc-400 mt-1">{selectedIdea.proposed_solution}</p>
          </div>
          <button
            onClick={() => router.push('/ideas')}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 underline transition-colors cursor-pointer shrink-0"
          >
            Change Idea
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.02] p-5 text-center space-y-3">
          <p className="text-sm text-zinc-300">You do not have an active idea selected for the War Room.</p>
          <button
            onClick={() => router.push('/ideas')}
            className="rounded bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-black transition-all cursor-pointer"
          >
            Select Idea in Dream Engine
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sprint Timeline (Left) */}
        <div className="lg:col-span-2 space-y-6">
          
          <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Active Sprint Execution
          </h2>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
          ) : activeRoadmap && sprints.length > 0 ? (
            <div className="space-y-6">
              {sprints.map((sprint) => {
                const isActive = sprint.status === 'active'
                const completedTasks = sprint.tasks?.filter(t => t.status === 'done') || []
                const totalTasks = sprint.tasks || []
                const pct = totalTasks.length > 0 ? Math.round((completedTasks.length / totalTasks.length) * 100) : 0
                
                return (
                  <div
                    key={sprint.id}
                    className={`rounded-xl border p-6 bg-[#07070a] space-y-4 ${
                      isActive ? 'border-indigo-500/20' : 'border-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">{sprint.title}</h3>
                        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {sprint.week_start} to {sprint.week_end}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20 font-mono">
                            ACTIVE SPRINT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-zinc-500 font-mono">
                            QUEUED
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-400">
                          {pct}% Done
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-[#1a1a1a] pt-4 space-y-3">
                      {sprint.tasks && sprint.tasks.length > 0 ? (
                        sprint.tasks.map((task) => {
                          const isDone = task.status === 'done'
                          return (
                            <div 
                              key={task.id} 
                              onClick={() => handleToggleTaskStatus(task.id, task.status)}
                              className="flex items-center justify-between text-xs cursor-pointer group hover:bg-white/[0.01] p-1.5 rounded transition-all"
                            >
                              <div className="flex items-center gap-3">
                                {isDone ? (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20 group-hover:bg-emerald-500/25 transition-all">
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-600 ring-1 ring-inset ring-zinc-800 group-hover:bg-zinc-700 group-hover:text-zinc-300 transition-all">
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </span>
                                )}
                                <span className={`${isDone ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                                  {task.title}
                                </span>
                              </div>

                              <span className={`text-[10px] font-mono capitalize ${isDone ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                {task.status}
                              </span>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-zinc-600">No sprint tasks generated for this week.</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#1a1a1a] bg-[#07070a] p-12 text-center text-zinc-600">
              <p className="text-sm">No roadmap generated yet. Select an idea and click &ldquo;Generate 90-Day Roadmap&rdquo;.</p>
            </div>
          )}

        </div>

        {/* Phase Tracker Sidebar (Right) */}
        <div className="space-y-6">
          
          <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase font-mono">
              90-Day Milestones
            </h3>
            
            {loading ? (
              <Skeleton className="h-32 rounded" />
            ) : activeRoadmap && activeRoadmap.phases ? (
              <div className="relative border-l border-[#1a1a1a] ml-2.5 pl-5 space-y-6 py-2">
                {activeRoadmap.phases.map((phase, idx) => {
                  const isCurrent = idx === 0 // Mocking phase tracker progression based on phase order
                  return (
                    <div key={idx} className="relative">
                      <span className={`absolute -left-[26px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-[#050505] ${
                        isCurrent ? 'bg-indigo-500' : idx < 1 ? 'bg-emerald-500' : 'bg-[#1a1a1a]'
                      }`} />
                      <h4 className="text-xs font-semibold text-zinc-300">Phase {phase.phase_number}: {phase.title}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{phase.theme}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">No milestone details available.</p>
            )}
          </div>

          <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase font-mono">
              War Room Rules
            </h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Karnex roadmaps are designed to prevent procrastination. Focus on completing the weekly sprints.
            </p>
            <div className="rounded bg-[#020203] border border-[#1a1a1a] p-3 text-[10px] text-zinc-400 font-mono">
              STATUS_SYS: OK<br />
              VELOCITY_RATIO: 1.0x<br />
              BUDGET_CAP: ${founderCapacity.budget_monthly}/mo<br />
              HOURS_LIMIT: {founderCapacity.weekly_hours}h/wk
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
