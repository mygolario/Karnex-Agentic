'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import AgentExecutePanel from './AgentExecutePanel'
import type { AgentTask } from './AgentExecutePanel'

interface TodaysTasksProps {
  tasks: AgentTask[]
  founderId: string
}

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'build': return 'bg-[#6366f1]/10 text-[#818cf8] border-[#6366f1]/20'
    case 'research': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    case 'outreach': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'content': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'design': return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
  }
}

function getStatusDot(status: string): string {
  switch (status) {
    case 'todo': return 'bg-neutral-500'
    case 'in_progress': return 'bg-[#6366f1] animate-pulse'
    case 'done': return 'bg-emerald-400'
    case 'blocked': return 'bg-red-500'
    default: return 'bg-neutral-500'
  }
}

export default function TodaysTasks({ tasks: initialTasks, founderId }: TodaysTasksProps) {
  const supabase = createSupabaseBrowserClient()
  const [tasks, setTasks] = useState<AgentTask[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set())

  const visibleTasks = tasks.slice(0, 3)

  // Subscribe to task status changes via Realtime
  useEffect(() => {
    const taskIds = tasks.map((t) => t.id).filter((id) => !id.startsWith('mock-'))
    if (taskIds.length === 0) return

    const channel = supabase
      .channel('task-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `founder_id=eq.${founderId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as unknown as AgentTask
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          )
          if (updated.status === 'done') {
            setRunningTaskIds((prev) => {
              const next = new Set(prev)
              next.delete(updated.id)
              return next
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tasks, founderId, supabase])

  // Subscribe to agent_runs for running tasks
  useEffect(() => {
    const runIds = tasks
      .filter((t) => t.agent_run_id && t.status === 'in_progress')
      .map((t) => t.agent_run_id!)

    if (runIds.length === 0) return

    const channel = supabase
      .channel('agent-run-task-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_runs',
          filter: `founder_id=eq.${founderId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const run = payload.new
          if (run.status === 'success' || run.status === 'error') {
            // Find the task with this run_id and update
            setTasks((prev) =>
              prev.map((t) =>
                t.agent_run_id === run.id
                  ? { ...t, status: run.status === 'success' ? 'done' : t.status }
                  : t
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tasks, founderId, supabase])

  const handleOpenPanel = useCallback((task: AgentTask) => {
    setSelectedTask(task)
    setIsPanelOpen(true)
  }, [])

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
    setSelectedTask(null)
  }, [])

  const handleTaskComplete = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'done' as const } : t))
    )
    setRunningTaskIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }, [])

  const handleMarkDone = useCallback(async (taskId: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'done' as const } : t))
    )

    // Persist to DB (skip for mock tasks)
    if (!taskId.startsWith('mock-')) {
      await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', taskId)
    }
  }, [supabase])

  return (
    <>
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold tracking-[0.06em] uppercase text-[#525252]">
            Your 3 Tasks for Today
          </h2>
          <span className="text-[12px] text-[#525252]">Sprint Priorities</span>
        </div>

        {/* Task cards */}
        <div className="space-y-3">
          {visibleTasks.map((task) => {
            const isDone = task.status === 'done'
            const isRunning = runningTaskIds.has(task.id) || task.status === 'in_progress'

            return (
              <div
                key={task.id}
                className={`border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 hover:border-[#262626] ${
                  isDone ? 'opacity-60' : ''
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  {/* Category badge + status */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`border px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-[0.05em] ${getCategoryBadgeClass(task.category)}`}
                    >
                      {task.category}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${getStatusDot(task.status)}`} />
                    {isDone && (
                      <span className="text-emerald-400 text-[12px] font-semibold flex items-center gap-1">
                        ✓ Done
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4
                    className={`text-[15px] font-semibold text-white truncate ${
                      isDone ? 'line-through' : ''
                    }`}
                  >
                    {task.title}
                  </h4>

                  {/* Description */}
                  <p className="text-[13px] text-[#737373] line-clamp-1">
                    {task.description || 'Pre-configured co-founder task.'}
                  </p>
                </div>

                {/* Action area */}
                <div className="shrink-0">
                  {isDone ? (
                    task.agent_output ? (
                      <a
                        href="/vault"
                        className="text-[13px] text-[#6366f1] hover:text-[#818cf8] font-medium transition-colors"
                      >
                        View output →
                      </a>
                    ) : null
                  ) : isRunning ? (
                    /* Mini progress bar */
                    <div className="space-y-1 w-24">
                      <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] animate-pulse w-2/3" />
                      </div>
                      <p className="text-[11px] text-[#525252] text-center">Running…</p>
                    </div>
                  ) : task.auto_executable ? (
                    <button
                      onClick={() => handleOpenPanel(task)}
                      className="text-[13px] font-semibold text-white bg-[#6366f1] hover:bg-[#5558e6] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow whitespace-nowrap"
                    >
                      {task.execute_label || 'Let Karnex →'}
                    </button>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleMarkDone(task.id)}
                        className="h-4 w-4 rounded border-[#333] bg-[#0a0a0a] accent-[#6366f1]"
                      />
                      <span className="text-[13px] text-[#525252]">Mark done</span>
                    </label>
                  )}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {visibleTasks.length === 0 && (
            <div className="border border-[#1a1a1a] border-dashed p-10 text-center rounded-2xl text-[#525252]">
              <p className="text-[14px]">All tasks completed! 🎉</p>
            </div>
          )}
        </div>

        {/* View all link */}
        {tasks.length > 3 && (
          <a
            href="/warroom"
            className="block text-center text-[13px] text-[#525252] hover:text-[#a1a1a1] transition-colors"
          >
            + View all {tasks.length} sprint tasks
          </a>
        )}
      </div>

      {/* Agent Execute Panel slide-over */}
      <AgentExecutePanel
        task={selectedTask}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        founderId={founderId}
        onTaskComplete={handleTaskComplete}
      />
    </>
  )
}
