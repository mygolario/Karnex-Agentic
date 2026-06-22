'use client'

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'
import { useForgeStore } from './forge-store'
import type { ChatMessage, BuilderOutput } from './forge-store'

/* ── Karnex Context Types ── */

interface KarnexContext {
  icp: {
    targetAudience: string
    painPoints: string[]
    positioning: string
  } | null
  roadmapPhase: string | null
  momentumScore: number | null
  recentDecisions: string[]
}

interface ForgeContextValue {
  karnexContext: KarnexContext
  triggerBuild: (prompt: string, githubRepo?: string, platform?: string) => Promise<void>
  fetchRunOutput: (runId: string) => Promise<void>
  loadHistory: () => Promise<void>
  refreshKarnexContext: () => Promise<void>
  supabase: ReturnType<typeof createSupabaseBrowserClient>
}

const ForgeContext = createContext<ForgeContextValue | null>(null)

export function useForgeContext() {
  const ctx = useContext(ForgeContext)
  if (!ctx) throw new Error('useForgeContext must be used within ForgeContextProvider')
  return ctx
}

/* ── Provider ── */

export function ForgeContextProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseBrowserClient()
  const store = useForgeStore()
  const karnexContextRef = useRef<KarnexContext>({
    icp: null,
    roadmapPhase: null,
    momentumScore: null,
    recentDecisions: [],
  })
  const [karnexContext, setKarnexContext] = React.useState<KarnexContext>(karnexContextRef.current)

  /* ── Fetch Karnex Context (ICP, roadmap, momentum) ── */
  const refreshKarnexContext = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Load ICP from founder_memory vault
      const { data: icpData } = await supabase
        .from('founder_memory')
        .select('content')
        .eq('founder_id', session.user.id)
        .eq('namespace', 'icp')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Load roadmap phase
      const { data: roadmapData } = await supabase
        .from('founder_memory')
        .select('content')
        .eq('founder_id', session.user.id)
        .eq('namespace', 'roadmap')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Load recent decisions
      const { data: decisions } = await supabase
        .from('founder_memory')
        .select('content')
        .eq('founder_id', session.user.id)
        .eq('namespace', 'decisions')
        .order('created_at', { ascending: false })
        .limit(5)

      const newCtx: KarnexContext = {
        icp: icpData?.content ? {
          targetAudience: icpData.content.target_audience || '',
          painPoints: icpData.content.pain_points || [],
          positioning: icpData.content.positioning || '',
        } : null,
        roadmapPhase: roadmapData?.content?.current_phase || null,
        momentumScore: roadmapData?.content?.momentum_score || null,
        recentDecisions: decisions?.map((d: { content: { summary?: string } }) => d.content?.summary || '') || [],
      }
      karnexContextRef.current = newCtx
      setKarnexContext(newCtx)
    } catch (err) {
      console.error('Failed to load Karnex context:', err)
    }
  }, [supabase])

  /* ── Fetch Run Output ── */
  const fetchRunOutput = useCallback(async (runId: string) => {
    try {
      const { data: out, error } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()

      if (error) throw error

      if (out?.output?.files) {
        store.setBuilderOutput(out.output as BuilderOutput)
        store.setSelectedFileIdx(0)
      }
    } catch (err) {
      console.error('Error retrieving build output:', err)
    }
  }, [supabase, store])

  /* ── Load History ── */
  const loadHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, input, created_at, status, logs, error_message')
        .eq('founder_id', session.user.id)
        .eq('agent_id', 'mvp-scanner-v1')
        .order('created_at', { ascending: false })

      if (runs) {
        const successRuns = runs.filter((r: Record<string, unknown>) => r.status === 'success')
        const projects = successRuns.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: ((r.input as Record<string, unknown>)?.specification as string)?.slice(0, 40) || 'Code Build',
          techStack: { framework: 'nextjs', styling: 'tailwind', database: 'supabase' },
          status: r.status as string,
          currentVersion: 1,
        }))
        store.setProjects(projects)

        // Auto-restore latest run if no build is active
        const isNewSession = typeof window !== 'undefined' && sessionStorage.getItem('karnex-workspace-new') === 'true'
        if (runs.length > 0 && !store.currentRunId && !store.builderOutput && !isNewSession) {
          const latestRun = runs[0] as Record<string, unknown>
          store.setProjectName(((latestRun.input as Record<string, unknown>)?.specification as string)?.slice(0, 40) || 'Code Build')

          const inProgressStatuses = [
            'queued', 'decomposing_specifications', 'spawning_db_designer',
            'spawning_ui_coder', 'running_linter_validation', 'committing_to_github'
          ]
          const isInProgress = inProgressStatuses.includes(latestRun.status as string)

          // Restore chat
          let restoredMessages: ChatMessage[] = []
          if (latestRun.logs && Array.isArray(latestRun.logs)) {
            restoredMessages = (latestRun.logs as Array<Record<string, unknown>>).map((log, idx) => ({
              id: `${latestRun.id}-${idx}`,
              sender: (log.sender as ChatMessage['sender']) || 'system',
              content: (log.message as string) || '',
              timestamp: (log.timestamp as string) || new Date().toISOString(),
              type: 'text' as const,
            }))
          }

          const messages: ChatMessage[] = [
            {
              id: 'welcome',
              sender: 'system',
              content: 'Welcome to Karnex Forge. Describe your idea below to begin.',
              timestamp: new Date(latestRun.created_at as string).toISOString(),
              type: 'text',
            },
            ...restoredMessages,
          ]

          if (latestRun.status === 'error') {
            messages.push({
              id: `${latestRun.id}-error`,
              sender: 'system',
              content: `Build failed: ${latestRun.error_message || 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              type: 'status',
            })
          }

          store.setChatMessages(messages)

          if (isInProgress) {
            store.setLoading(true)
            store.setCurrentRun(latestRun.id as string, latestRun.status as string)
            store.setBuildStartTime(new Date(latestRun.created_at as string).getTime())
          } else if (latestRun.status === 'success') {
            fetchRunOutput(latestRun.id as string)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }, [supabase, store, fetchRunOutput])

  /* ── Trigger Build ── */
  const triggerBuild = useCallback(async (promptText: string, githubRepo?: string, platform?: string) => {
    if (!promptText.trim()) return
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('karnex-workspace-new')
    }

    store.setLoading(true)
    store.setBuilderOutput(null)
    store.setCurrentRun(null, null)
    store.setInspectMode(false)
    store.setBuildStartTime(Date.now())
    store.setBuildDuration(0)
    store.setCurrentStage(0)

    if (!store.projectName) {
      store.setProjectName(promptText.slice(0, 40))
    }

    store.addChatMessage({
      id: `user-${Date.now()}`,
      sender: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
      type: 'text',
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        store.addChatMessage({
          id: `system-auth-${Date.now()}`,
          sender: 'system',
          content: 'Please sign in to use Forge.',
          timestamp: new Date().toISOString(),
          type: 'status',
        })
        store.setLoading(false)
        return
      }

      const response = await fetch(getAgentApiUrl('v1/agents/scanner'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          url: promptText,
          github_repo: githubRepo || null,
          mvp_source_platform: platform || 'custom',
          forge_project_id: store.project?.id || null,
        }),
      })

      if (!response.ok) throw new Error(await readAgentError(response))

      const result = await response.json()
      store.setCurrentRun(result.run_id, result.status)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      store.addChatMessage({
        id: `system-error-${Date.now()}`,
        sender: 'system',
        content: `Initialization failed: ${message}`,
        timestamp: new Date().toISOString(),
        type: 'status',
      })
      store.setLoading(false)
    }
  }, [supabase, store])

  /* ── Realtime Subscription on agent_runs ── */
  useEffect(() => {
    const channel = supabase
      .channel('forge-agent-runs')
      .on(
        'postgres_changes' as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_runs',
        },
        (payload: { new: Record<string, unknown> }) => {
          const run = payload.new
          if (run.id !== store.currentRunId) return

          store.setCurrentRun(run.id as string, run.status as string)

          // Sync logs
          if (run.logs && Array.isArray(run.logs)) {
            const syncedMessages: ChatMessage[] = (run.logs as Array<Record<string, unknown>>).map((log, idx) => ({
              id: `${run.id}-${idx}`,
              sender: (log.sender as ChatMessage['sender']) || 'system',
              content: (log.message as string) || '',
              timestamp: (log.timestamp as string) || new Date().toISOString(),
              type: 'text' as const,
            }))
            store.setChatMessages([
              {
                id: 'welcome',
                sender: 'system',
                content: 'Welcome to Karnex Forge. Describe your idea below to begin.',
                timestamp: new Date().toISOString(),
                type: 'text',
              },
              ...syncedMessages,
            ])
          }

          if (run.status === 'success') {
            store.setLoading(false)
            store.setBuildDuration(
              store.buildStartTime
                ? Math.round((Date.now() - store.buildStartTime) / 1000)
                : null
            )
            store.setCurrentStage(6)
            fetchRunOutput(run.id as string)
            loadHistory()
          } else if (run.status === 'error') {
            store.setLoading(false)
            store.addChatMessage({
              id: `${run.id}-error`,
              sender: 'system',
              content: `Build failed: ${run.error_message || 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              type: 'status',
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, store, fetchRunOutput, loadHistory])

  /* ── Polling fallback for run status ── */
  useEffect(() => {
    if (!store.currentRunId || store.currentRunStatus === 'success' || store.currentRunStatus === 'error') return

    const interval = setInterval(async () => {
      try {
        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message, logs')
          .eq('id', store.currentRunId!)
          .single()

        if (error) throw error
        if (!run) return

        if (run.status !== store.currentRunStatus) {
          store.setCurrentRun(store.currentRunId!, run.status)
        }

        if (run.status === 'success') {
          store.setLoading(false)
          store.setBuildDuration(
            store.buildStartTime ? Math.round((Date.now() - store.buildStartTime) / 1000) : null
          )
          store.setCurrentStage(6)
          fetchRunOutput(store.currentRunId!)
          loadHistory()
        } else if (run.status === 'error') {
          store.setLoading(false)
          store.addChatMessage({
            id: `${store.currentRunId}-error`,
            sender: 'system',
            content: `Build failed: ${run.error_message || 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            type: 'status',
          })
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [supabase, store, fetchRunOutput, loadHistory])

  /* ── Build duration timer ── */
  useEffect(() => {
    if (!store.loading || !store.buildStartTime) return
    const interval = setInterval(() => {
      store.setBuildDuration(Math.round((Date.now() - store.buildStartTime!) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [store.loading, store.buildStartTime, store])

  /* ── Init on mount ── */
  useEffect(() => {
    loadHistory()
    refreshKarnexContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: ForgeContextValue = {
    karnexContext,
    triggerBuild,
    fetchRunOutput,
    loadHistory,
    refreshKarnexContext,
    supabase,
  }

  return (
    <ForgeContext.Provider value={value}>
      {children}
    </ForgeContext.Provider>
  )
}
