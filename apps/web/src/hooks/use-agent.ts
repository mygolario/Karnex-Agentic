'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AgentTask } from '@/components/home/AgentExecutePanel'
import {
  buildChecklistFromLabels,
  stepLabelFromRun,
  activeStepIndexFromRun,
  type ChecklistStep,
} from '@/lib/agents/step-checklist'

export type AgentRunStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'success'
  | 'error'
  | 'partial'

function progressFromStatus(status: string, stepCount: number, activeIndex: number): number {
  if (status === 'idle') return 0
  if (status === 'queued') return 15
  if (status === 'success' || status === 'error' || status === 'partial') return 100
  if (stepCount > 0) {
    return Math.min(95, Math.round(((activeIndex + 0.5) / stepCount) * 100))
  }
  if (status.includes('github') || status.includes('commit')) return 85
  if (status.includes('lint') || status.includes('valid')) return 75
  if (status.includes('generat') || status.includes('search')) return 40
  return 50
}

function labelFromRun(run: Record<string, unknown>): string | null {
  const tools = run.tools_called
  if (Array.isArray(tools) && tools.length > 0) {
    const last = String(tools[tools.length - 1])
    return last.replace(/_/g, ' ')
  }
  const logs = run.logs
  if (Array.isArray(logs) && logs.length > 0) {
    const last = logs[logs.length - 1] as Record<string, unknown>
    const message = last.message ? String(last.message) : ''
    if (message) return message
  }
  const status = String(run.status ?? '')
  if (status === 'queued') return 'Queued…'
  if (status === 'running') return 'Running agent pipeline…'
  return null
}

interface UseAgentOptions {
  task: AgentTask | null
  enabled?: boolean
  onTaskUpdate?: (task: Partial<AgentTask>) => void
  onTaskComplete?: (taskId: string) => void
}

export function useAgent({
  task,
  enabled = true,
  onTaskUpdate,
  onTaskComplete,
}: UseAgentOptions) {
  const supabase = createSupabaseBrowserClient()

  const stepLabels = useMemo(() => {
    const config = task?.agent_config ?? {}
    const raw = config.step_labels
    if (Array.isArray(raw)) {
      return raw.filter((x): x is string => typeof x === 'string')
    }
    return [] as string[]
  }, [task?.agent_config])

  const [runId, setRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<AgentRunStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [stepLabel, setStepLabel] = useState<string | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [output, setOutput] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const checklistSteps: ChecklistStep[] = useMemo(
    () => buildChecklistFromLabels(stepLabels, activeStepIndex, runStatus),
    [stepLabels, activeStepIndex, runStatus]
  )

  const reset = useCallback(() => {
    setRunId(null)
    setRunStatus('idle')
    setProgress(0)
    setLogs([])
    setStepLabel(null)
    setActiveStepIndex(0)
    setOutput(null)
    setError(null)
    setIsExecuting(false)
  }, [])

  useEffect(() => {
    if (!enabled) reset()
  }, [task?.id, enabled, reset])

  const execute = useCallback(async () => {
    if (!task || task.id.startsWith('mock-')) {
      setError('This demo task cannot be executed.')
      return
    }

    setIsExecuting(true)
    setRunStatus('queued')
    setProgress(10)
    setOutput(null)
    setError(null)
    setLogs(['Starting one-click execution…', 'Checking credits and task config…'])

    try {
      const res = await fetch(`/api/tasks/${task.id}/execute`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof body.error === 'string' ? body.error : `Execute failed (${res.status})`
        )
      }

      const newRunId = body.run_id as string
      setRunId(newRunId)
      setRunStatus('running')
      setProgress(30)
      setLogs((prev) => [
        ...prev,
        `Agent run ${newRunId} queued.`,
        'Streaming progress from agent pipeline…',
      ])
      onTaskUpdate?.({ status: 'in_progress', agent_run_id: newRunId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setIsExecuting(false)
      setRunStatus('error')
      setLogs((prev) => [...prev, `Error: ${msg}`])
    }
  }, [task, onTaskUpdate])

  const retry = useCallback(() => {
    reset()
    void execute()
  }, [reset, execute])

  useEffect(() => {
    if (!task?.id || !enabled) return

    const channel = supabase
      .channel(`task-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${task.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          const status = row.status as AgentTask['status']
          onTaskUpdate?.({
            status,
            agent_output: row.agent_output as Record<string, unknown> | null,
            agent_run_id: row.agent_run_id as string | null,
          })

          if (status === 'done' || status === 'pending_approval') {
            setRunStatus('success')
            setProgress(100)
            setIsExecuting(false)
            if (row.agent_output && typeof row.agent_output === 'object') {
              setOutput(row.agent_output as Record<string, unknown>)
            }
            onTaskComplete?.(task.id)
          } else if (status === 'blocked') {
            setRunStatus('error')
            setProgress(100)
            setIsExecuting(false)
            const out = row.agent_output as Record<string, unknown> | undefined
            setError(
              typeof out?.error === 'string' ? out.error : 'Agent execution failed.'
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [task?.id, enabled, supabase, onTaskUpdate, onTaskComplete])

  useEffect(() => {
    if (!runId || !enabled) return
    if (runStatus === 'success' || runStatus === 'error') return

    const handleRunRow = (run: Record<string, unknown>) => {
      const status = String(run.status ?? 'running')
      setRunStatus(
        status === 'success' || status === 'error' || status === 'partial'
          ? (status as AgentRunStatus)
          : status === 'queued'
            ? 'queued'
            : 'running'
      )
      const idx = activeStepIndexFromRun(run, stepLabels)
      setActiveStepIndex(idx)
      setProgress(progressFromStatus(status, stepLabels.length, idx))

      const label =
        stepLabelFromRun(run, stepLabels) ?? labelFromRun(run)
      if (label) {
        setStepLabel(label)
        setLogs((prev) => {
          if (prev[prev.length - 1] === label) return prev
          return [...prev, label]
        })
      }

      if (status === 'error') {
        setIsExecuting(false)
        setError((run.error_message as string) || 'Agent failed.')
      }
    }

    const channel = supabase
      .channel(`agent-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_runs',
          filter: `id=eq.${runId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          handleRunRow(payload.new)
        }
      )
      .subscribe()

    const interval = setInterval(async () => {
      const { data: run } = await supabase
        .from('agent_runs')
        .select('status, error_message, tools_called, logs')
        .eq('id', runId)
        .single()
      if (run) handleRunRow(run as Record<string, unknown>)
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [runId, runStatus, enabled, supabase, stepLabels])

  return {
    runId,
    runStatus,
    progress,
    logs,
    stepLabel,
    checklistSteps,
    output,
    error,
    isExecuting,
    execute,
    retry,
    reset,
  }
}
