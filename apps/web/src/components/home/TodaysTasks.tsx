'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import AgentExecutePanel from './AgentExecutePanel'
import type { AgentTask } from './AgentExecutePanel'
import { 
  Code2, 
  Search, 
  Send, 
  FileText, 
  Palette, 
  MoreHorizontal, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface TodaysTasksProps {
  tasks: AgentTask[]
  founderId: string
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'build':
      return <Code2 className="w-4 h-4 text-indigo-400" />
    case 'research':
      return <Search className="w-4 h-4 text-cyan-400" />
    case 'outreach':
      return <Send className="w-4 h-4 text-emerald-400" />
    case 'content':
      return <FileText className="w-4 h-4 text-amber-400" />
    case 'design':
      return <Palette className="w-4 h-4 text-pink-400" />
    default:
      return <MoreHorizontal className="w-4 h-4 text-zinc-500" />
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'todo': return 'Backlog'
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
        <div className="flex items-center justify-between pb-1 border-b border-[#1a1a1f]/60">
          <h2 className="text-xs font-bold tracking-[0.06em] uppercase text-zinc-400 font-mono">
            LAUNCH ROADMAP SPRINT
          </h2>
          <span className="text-[10px] font-mono text-zinc-500">ACTIVE PRIORITIES</span>
        </div>

        {/* Task Cards Stack */}
        <div className="space-y-2.5">
          {visibleTasks.map((task) => {
            const isDone = task.status === 'done'
            const needsApproval = task.status === 'pending_approval'
            const isRunning = runningTaskIds.has(task.id) || task.status === 'in_progress'
            const categoryIcon = getCategoryIcon(task.category)
            
            const config = (task.agent_config || {}) as Record<string, unknown>
            const duration = config.estimated_duration_seconds as number | undefined

            return (
              <div
                key={task.id}
                className={`group border border-[#1a1a1f] bg-[#070709]/60 hover:bg-zinc-900/10 hover:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
                  isDone ? 'opacity-40' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Status Check Icon */}
                  <div className="mt-1 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isRunning ? (
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    )}
                  </div>

                  {/* Task Metadata & Text */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono">
                      <span className="text-zinc-400 flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 uppercase font-bold">
                        {categoryIcon}
                        {task.category}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className={`uppercase font-medium ${
                        isDone ? 'text-emerald-500' : isRunning ? 'text-indigo-400' : 'text-zinc-500'
                      }`}>
                        {getStatusLabel(task.status)}
                      </span>
                      {duration && !isDone && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500">{duration}s execution</span>
                        </>
                      )}
                    </div>

                    <h4 className={`text-[14px] font-semibold text-white truncate ${isDone ? 'line-through text-zinc-500' : ''}`}>
                      {task.title}
                    </h4>

                    <p className="text-xs text-zinc-500 leading-relaxed font-sans line-clamp-1 max-w-[500px]">
                      {task.description || 'Pre-configured sprint task generated by the roadmap spine.'}
                    </p>
                  </div>
                </div>

                {/* Task Actions (slide/fade in on hover) */}
                <div className="shrink-0 flex items-center justify-start md:justify-end md:opacity-85 group-hover:opacity-100 transition-opacity">
                  {isDone || needsApproval ? (
                    task.agent_output ? (
                      <a
                        href={needsApproval ? '/agents/outreach' : '/vault'}
                        className="text-xs text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5"
                      >
                        {needsApproval ? 'Review Draft' : 'View Output'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-600">NO OUTPUT LOGS</span>
                    )
                  ) : isRunning ? (
                    <div className="flex flex-col items-end gap-1 w-20">
                      <div className="h-1 w-full rounded-full bg-zinc-900 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500 animate-[forgeTimelineGlowH_2s_infinite_linear] w-1/2" />
                      </div>
                      <span className="text-[9px] font-mono text-indigo-400 animate-pulse uppercase">RUNNING</span>
                    </div>
                  ) : task.auto_executable ? (
                    <button
                      onClick={() => handleOpenPanel(task)}
                      className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {task.execute_label ? task.execute_label.replace('Let Karnex ', '') : 'Execute'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkDone(task.id)}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-850 hover:border-zinc-700 bg-zinc-950 px-4 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-zinc-500" />
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {visibleTasks.length === 0 && (
            <div className="border border-[#1a1a1f] border-dashed py-8 text-center rounded-xl text-zinc-500 bg-black/10 text-xs font-mono">
              ALL TASKS COMPLETED. CHECK BACK TOMORROW.
            </div>
          )}
        </div>

        {/* Bottom Navigation Link */}
        {tasks.length > 3 && (
          <a
            href="/warroom"
            className="block text-center text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors pt-1"
          >
            + VIEW ALL {tasks.length} ACTIVE SPRINT TASKS
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
