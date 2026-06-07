'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import AgentExecutePanel from './AgentExecutePanel'
import type { AgentTask } from './AgentExecutePanel'

interface TodaysTasksProps {
  tasks: AgentTask[]
  founderId: string
}

function getCategoryTheme(category: string) {
  switch (category) {
    case 'build':
      return {
        badge: 'bg-[#6366f1]/10 text-[#818cf8] border-[#6366f1]/20',
        color: '#6366f1',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        )
      }
    case 'research':
      return {
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        color: '#06b6d4',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 10.5a6 6 0 00-6-6" />
          </svg>
        )
      }
    case 'outreach':
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        color: '#10b981',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        )
      }
    case 'content':
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        color: '#f59e0b',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        )
      }
    case 'design':
      return {
        badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        color: '#ec4899',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-1.305-3.579M3 9.75h1.875c.621 0 1.125-.504 1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125H9.75M3 9.75v6c0 .621.504 1.125 1.125 1.125H9.75M3 9.75h1.875c.621 0 1.125.504 1.125 1.125V18M9.75 4.5V3c0-.621.504-1.125 1.125-1.125h6c.621 0 1.125.504 1.125 1.125v1.5M9.75 4.5h1.875c.621 0 1.125.504 1.125 1.125V9.75m0-4.125h6c.621 0 1.125.504 1.125 1.125V9.75M9.75 9.75V18c0 .621.504 1.125 1.125 1.125h6c.621 0 1.125-.504 1.125-1.125V9.75M9.75 9.75h7.5" />
          </svg>
        )
      }
    default:
      return {
        badge: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
        color: '#71717a',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )
      }
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'todo': return 'To do'
    case 'in_progress': return 'Executing'
    case 'done': return 'Completed'
    case 'pending_approval': return 'Review Draft'
    case 'blocked': return 'Blocked'
    default: return status
  }
}

export default function TodaysTasks({ tasks: initialTasks, founderId }: TodaysTasksProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [tasks, setTasks] = useState<AgentTask[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set())

  const visibleTasks = tasks.slice(0, 3)

  // Realtime: task status updates
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
          if (
            updated.status === 'done' ||
            updated.status === 'pending_approval' ||
            updated.status === 'blocked'
          ) {
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

  // Realtime: agent run completions
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
    if (task.auto_executable && task.category === 'build') {
      router.push(`/studio?taskId=${task.id}&fullscreen=true`)
      return
    }
    setSelectedTask(task)
    setIsPanelOpen(true)
  }, [router])

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
    // Optimistic complete
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'done' as const } : t))
    )

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
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#525252]">
            Today&apos;s Launch Sprints
          </h2>
          <span className="text-[12px] font-mono text-[#525252]">Active Priorities</span>
        </div>

        {/* Task Cards Grid */}
        <div className="space-y-4">
          {visibleTasks.map((task) => {
            const isDone = task.status === 'done'
            const needsApproval = task.status === 'pending_approval'
            const isRunning = runningTaskIds.has(task.id) || task.status === 'in_progress'
            const theme = getCategoryTheme(task.category)

            return (
              <div
                key={task.id}
                className={`group border border-[#1a1a1a] bg-[#050505]/75 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all duration-300 hover:border-zinc-800 ${
                  isDone ? 'opacity-50' : 'hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
                }`}
                style={{
                  borderLeft: isDone ? '1px solid #1a1a1a' : `2px solid ${theme.color}`
                }}
              >
                <div className="flex items-start gap-4 min-w-0">
                  {/* Category Styled Visual Icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: isDone ? 'rgba(255,255,255,0.02)' : `${theme.color}0a`,
                      border: `1px solid ${isDone ? 'rgba(255,255,255,0.04)' : `${theme.color}20`}`,
                      color: isDone ? '#525252' : theme.color
                    }}
                  >
                    {theme.icon}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}>
                        {task.category}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#525252]">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          isDone 
                            ? 'bg-emerald-400' 
                            : isRunning 
                            ? 'bg-indigo-400 animate-pulse' 
                            : needsApproval 
                            ? 'bg-amber-400' 
                            : 'bg-neutral-600'
                        }`} />
                        {getStatusLabel(task.status)}
                      </span>
                    </div>

                    <h4 className={`text-[15px] font-semibold text-white truncate ${isDone ? 'line-through text-zinc-500' : ''}`}>
                      {task.title}
                    </h4>

                    <p className="text-[13px] text-[#737373] leading-relaxed line-clamp-1">
                      {task.description || 'Pre-configured sprint task generated by the roadmap spine.'}
                    </p>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="shrink-0 flex items-center justify-start sm:justify-end">
                  {isDone || needsApproval ? (
                    task.agent_output ? (
                      <a
                        href={needsApproval ? '/agents/outreach' : '/vault'}
                        className="text-[13px] text-white hover:text-white bg-[#0a0a0c] hover:bg-[#121217] border border-[#1a1a1e] px-4 py-2 rounded-xl font-medium transition-all"
                      >
                        {needsApproval ? 'Review Draft →' : 'View Output →'}
                      </a>
                    ) : (
                      <span className="text-[12px] font-mono text-zinc-600">No output logs</span>
                    )
                  ) : isRunning ? (
                    <div className="flex flex-col items-center gap-1.5 w-24">
                      <div className="h-1 w-full rounded-full bg-[#141416] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] animate-pulse w-2/3" />
                      </div>
                      <span className="text-[10px] font-mono text-[#525252] animate-pulse">Running...</span>
                    </div>
                  ) : task.auto_executable ? (
                    <button
                      onClick={() => handleOpenPanel(task)}
                      className="text-[13px] font-bold text-white bg-[#6366f1] hover:bg-[#5558e6] px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] whitespace-nowrap"
                    >
                      {task.execute_label || 'Let Karnex →'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkDone(task.id)}
                      className="flex items-center gap-2 text-[13px] text-[#737373] hover:text-[#a1a1a1] border border-[#1a1a1e] bg-[#07070a] hover:bg-[#121217] px-4.5 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-[#525252] group-hover:text-[#a1a1a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {visibleTasks.length === 0 && (
            <div className="border border-[#1a1a1a] border-dashed p-10 text-center rounded-2xl text-[#525252] bg-black/10">
              <p className="text-[14px]">All tasks completed! Check back tomorrow for the next sprint.</p>
            </div>
          )}
        </div>

        {/* Sprints Navigation Link */}
        {tasks.length > 3 && (
          <a
            href="/warroom"
            className="block text-center text-[12px] text-[#525252] hover:text-[#a1a1a1] transition-colors mt-2"
          >
            + View all {tasks.length} active sprint tasks
          </a>
        )}
      </div>

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
