'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

interface SelectedIdea {
  id: string
  title: string
  problem_statement: string
  proposed_solution: string
}

interface Sprint {
  id: string
  sprint_number: number
  title: string
  week_start: string
  week_end: string
  goals: string[]
  focus_area: string
  capacity_hours: number
  status: 'active' | 'planned' | 'completed'
}

interface Task {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'deferred'
  description?: string
  priority: number
  estimated_hours: number
  sprint_id: string
}

interface RoadmapPhase {
  phase_number: number
  title: string
  theme: string
  weekly_goals: { week_number: number; focus: string; goals: string[] }[]
}

export default function WarRoomPage() {
  return (
    <ErrorBoundary>
      <WarRoomContent />
    </ErrorBoundary>
  )
}

function WarRoomContent() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [selectedIdea, setSelectedIdea] = useState<SelectedIdea | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [phases, setPhases] = useState<RoadmapPhase[]>([])
  const [roadmapId, setRoadmapId] = useState<string | null>(null)
  const [weeklyHours, setWeeklyHours] = useState(20)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const uid = session.user.id

      // Fetch weekly hours from founder profile
      const { data: founderData } = await supabase
        .from('founders')
        .select('weekly_hours_available, current_startup_id')
        .eq('id', uid)
        .maybeSingle()

      if (founderData?.weekly_hours_available) {
        setWeeklyHours(founderData.weekly_hours_available)
      }

      // Fetch selected idea
      const { data: ideaData } = await supabase
        .from('ideas')
        .select('id, title, problem_statement, proposed_solution')
        .eq('founder_id', uid)
        .eq('status', 'selected')
        .maybeSingle()

      if (ideaData) {
        setSelectedIdea(ideaData as SelectedIdea)
      }

      // Fetch active roadmap
      const { data: roadmapData } = await supabase
        .from('roadmaps')
        .select('id, phases')
        .eq('founder_id', uid)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (roadmapData) {
        setRoadmapId(roadmapData.id)
        if (Array.isArray(roadmapData.phases)) {
          setPhases(roadmapData.phases as RoadmapPhase[])
        }

        // Fetch sprints for this roadmap
        const { data: sprintData } = await supabase
          .from('sprints')
          .select('*')
          .eq('roadmap_id', roadmapData.id)
          .order('sprint_number', { ascending: true })

        if (sprintData) {
          const sprintList = sprintData as Sprint[]
          setSprints(sprintList)

          const active = sprintList.find(s => s.status === 'active') || sprintList[0]
          if (active) {
            setActiveSprint(active)

            // Fetch tasks for active sprint
            const { data: taskData } = await supabase
              .from('tasks')
              .select('*')
              .eq('sprint_id', active.id)
              .order('priority', { ascending: true })

            if (taskData) setTasks(taskData as Task[])
          }
        }
      }
    } catch (err) {
      console.error('Error loading war room:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateRoadmap = async () => {
    try {
      setGenerating(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      const response = await fetch(getAgentApiUrl('v1/agents/war-room'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          weekly_hours: weeklyHours
        })
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      await fetchData()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to generate roadmap: ${message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
    } catch (err) {
      console.error('Error toggling task status:', err)
    }
  }

  const handleSelectSprint = async (sprint: Sprint) => {
    setActiveSprint(sprint)
    try {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('sprint_id', sprint.id)
        .order('priority', { ascending: true })

      if (taskData) setTasks(taskData as Task[])
    } catch (err) {
      console.error('Error fetching sprint tasks:', err)
    }
  }

  const completedCount = tasks.filter(t => t.status === 'done').length
  const completionPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  if (loading) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-8 pb-16">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-6 w-96 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="section-label mb-3">Strategy</p>
          <h1 className="font-display font-bold text-[clamp(28px,3.5vw,36px)] leading-[1.15] tracking-[-0.025em] text-white">
            War Room
          </h1>
          <p className="mt-2 text-[15px] text-[#737373] max-w-[500px]">
            Structure your 90-day execution plan with sprints, tasks, and automated roadmap generation.
          </p>
        </div>
        <button
          onClick={handleGenerateRoadmap}
          disabled={generating}
          className="dash-btn dash-btn-primary shrink-0"
        >
          {generating ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Generating...
            </>
          ) : (
            'Generate Roadmap'
          )}
        </button>
      </div>

      {/* Selected Idea Banner */}
      {selectedIdea && (
        <div className="dash-card p-6 border-[#6366f1]/20">
          <div className="flex items-start gap-4">
            <div className="h-2 w-2 rounded-full bg-[#6366f1] mt-2 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="muted-label mb-1.5">Active Hypothesis</p>
              <h3 className="text-[16px] font-semibold text-white">{selectedIdea.title}</h3>
              <p className="text-[14px] text-[#737373] leading-[1.7] mt-1.5 line-clamp-2">
                {selectedIdea.proposed_solution}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sprint Detail — Left Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeSprint ? (
            <>
              {/* Sprint Header */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-white">
                    {activeSprint.title}
                  </h2>
                  <p className="text-[13px] text-[#525252] mt-1">
                    {new Date(activeSprint.week_start).toLocaleDateString()} — {new Date(activeSprint.week_end).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-display font-bold text-[24px] tracking-[-0.03em] text-white">{completionPct}%</span>
                  <p className="text-[13px] text-[#525252]">{completedCount}/{tasks.length} tasks</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                {tasks.length > 0 ? (
                  tasks.map((task) => {
                    const isDone = task.status === 'done'
                    const isBlocked = task.status === 'blocked'
                    return (
                      <div
                        key={task.id}
                        className="dash-card flex items-start gap-4 p-4 cursor-pointer"
                        onClick={() => handleToggleTask(task.id, task.status)}
                      >
                        {/* Checkbox */}
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isDone 
                            ? 'bg-[#6366f1] border-[#6366f1]' 
                            : 'border-[#262626] hover:border-[#404040]'
                        }`}>
                          {isDone && (
                            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className={`text-[14px] font-medium transition-colors ${isDone ? 'text-[#525252] line-through' : 'text-[#e5e5e5]'}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[13px] text-[#525252] mt-1 line-clamp-1">{task.description}</p>
                          )}
                        </div>

                        {isBlocked && (
                          <span className="dash-badge bg-red-500/10 border-red-500/20 text-red-400 text-[11px]">
                            Blocked
                          </span>
                        )}

                        <span className="text-[13px] text-[#525252] shrink-0">{task.estimated_hours}h</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="dash-card p-12 text-center">
                    <p className="text-[15px] text-[#525252]">No tasks found for this sprint.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="dash-card p-16 text-center space-y-4">
              <p className="text-[16px] text-[#a1a1a1]">No roadmap generated yet.</p>
              <p className="text-[14px] text-[#525252]">Select an idea from the Dream Engine, then generate a 90-day roadmap.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar — Sprint Timeline & Config */}
        <div className="space-y-6">
          
          {/* Sprint Timeline */}
          <div className="dash-card p-6 space-y-4">
            <p className="muted-label">Sprint Timeline</p>
            
            <div className="space-y-1">
              {sprints.length > 0 ? (
                sprints.map((sprint) => {
                  const isActive = activeSprint?.id === sprint.id
                  const isCompleted = sprint.status === 'completed'
                  return (
                    <button
                      key={sprint.id}
                      type="button"
                      onClick={() => handleSelectSprint(sprint)}
                      className={`w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white/[0.04] text-white'
                          : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-white/[0.02]'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${
                        isActive ? 'bg-[#6366f1]' : isCompleted ? 'bg-emerald-500' : 'bg-[#262626]'
                      }`} />
                      <span className="text-[13px] font-medium truncate">
                        Sprint {sprint.sprint_number}
                      </span>
                      <span className="ml-auto text-[12px] text-[#525252] capitalize shrink-0">
                        {sprint.status}
                      </span>
                    </button>
                  )
                })
              ) : (
                <p className="text-[14px] text-[#525252] py-4 text-center">No sprints found.</p>
              )}
            </div>
          </div>

          {/* Phase Tracker */}
          {phases.length > 0 && (
            <div className="dash-card p-6 space-y-4">
              <p className="muted-label">Execution Phases</p>
              <div className="space-y-4">
                {phases.map((phase, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-[#6366f1]/10 text-[#6366f1] text-[11px] font-medium">
                        {phase.phase_number}
                      </span>
                      <h4 className="text-[13px] font-medium text-[#e5e5e5]">{phase.title}</h4>
                    </div>
                    <p className="text-[13px] text-[#525252] pl-7">{phase.theme}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Config */}
          <div className="dash-card p-6 space-y-4">
            <p className="muted-label">Configuration</p>
            <div className="space-y-3 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">Weekly capacity</span>
                <span className="text-[#a1a1a1] font-medium">{weeklyHours}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">Sprint cadence</span>
                <span className="text-[#a1a1a1]">Weekly</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">Active sprints</span>
                <span className="text-[#a1a1a1]">{sprints.filter(s => s.status === 'active').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
