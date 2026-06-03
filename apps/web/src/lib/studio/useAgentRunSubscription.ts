'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AgentRunLog } from './types'

interface UseAgentRunSubscriptionResult {
  status: string
  logs: AgentRunLog[]
  errorMessage: string | null
}

export function useAgentRunSubscription(
  runId: string | null,
  onSuccess?: (runId: string) => void,
  onError?: (message: string) => void
): UseAgentRunSubscriptionResult {
  const supabase = createSupabaseBrowserClient()
  const [status, setStatus] = useState('')
  const [logs, setLogs] = useState<AgentRunLog[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const applyRun = useCallback(
    (run: { status?: string; logs?: unknown; error_message?: string | null }) => {
      if (run.status) setStatus(run.status)
      if (run.logs && Array.isArray(run.logs)) {
        setLogs(run.logs as AgentRunLog[])
      }
      if (run.status === 'error') {
        const msg = run.error_message || 'Build failed'
        setErrorMessage(msg)
        onError?.(msg)
      }
      if (run.status === 'success' && runId) {
        onSuccess?.(runId)
      }
    },
    [runId, onSuccess, onError]
  )

  useEffect(() => {
    if (!runId) return

    setStatus('queued')
    setLogs([])
    setErrorMessage(null)

    const channel = supabase
      .channel(`studio-agent-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_runs',
          filter: `id=eq.${runId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          applyRun({
            status: payload.new.status as string,
            logs: payload.new.logs,
            error_message: payload.new.error_message as string | null,
          })
        }
      )
      .subscribe()

    const interval = setInterval(async () => {
      const { data: run } = await supabase
        .from('agent_runs')
        .select('status, logs, error_message')
        .eq('id', runId)
        .single()

      if (run) applyRun(run)
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [runId, supabase, applyRun])

  return { status, logs, errorMessage }
}
