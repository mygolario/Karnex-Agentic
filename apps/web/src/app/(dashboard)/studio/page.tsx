'use client'

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'
import CTOChatPanel from '@/components/studio/CTOChatPanel'
import PreviewPane from '@/components/studio/PreviewPane'
import AdvancedPanel from '@/components/studio/AdvancedPanel'
import { useAgentRunSubscription } from '@/lib/studio/useAgentRunSubscription'
import { useStudioTask } from '@/lib/studio/useStudioTask'
import { usePreviewUrl } from '@/lib/studio/usePreviewUrl'
import {
  buildPayloadFromTask,
  statusToCtoMessage,
} from '@/lib/studio/status-mappers'
import type { BuilderOutput, ChatMessage, TechStack } from '@/lib/studio/types'

const DEFAULT_TECH_STACK: TechStack = {
  framework: 'nextjs',
  styling: 'tailwind',
  database: 'supabase',
}

export default function StudioPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<StudioLoading />}>
        <StudioWorkspace />
      </Suspense>
    </ErrorBoundary>
  )
}

function StudioLoading() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#050505] text-zinc-500 text-[13px]">
      Loading Studio...
    </div>
  )
}

function StudioWorkspace() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get('taskId')
  const fullscreen = searchParams.get('fullscreen') === 'true'

  const supabase = createSupabaseBrowserClient()
  const [founderId, setFounderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [buildComplete, setBuildComplete] = useState(false)
  const [builderOutput, setBuilderOutput] = useState<BuilderOutput | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [techStack, setTechStack] = useState<TechStack>(DEFAULT_TECH_STACK)
  const [githubRepo, setGithubRepo] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [pendingSpec, setPendingSpec] = useState('')
  const lastStatusRef = useRef<string>('')

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'builder',
      message: "I'm your Builder — describe what you want and I'll scaffold it, push a branch, and spin up a preview.",
      timestamp: new Date(),
    },
  ])

  const { task, greeting, suggestions } = useStudioTask(taskId, founderId)
  const { previewUrl, setPreviewUrl, vercelConnected, refreshPreviewUrl } = usePreviewUrl()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setFounderId(session.user.id)
    })
  }, [supabase])

  useEffect(() => {
    if (fullscreen) {
      document.documentElement.classList.add('studio-fullscreen')
      return () => document.documentElement.classList.remove('studio-fullscreen')
    }
  }, [fullscreen])

  useEffect(() => {
    if (greeting) {
      setMessages([
        {
          id: 'task-greeting',
          sender: 'builder',
          message: greeting,
          timestamp: new Date(),
        },
      ])
      if (task) {
        const payload = buildPayloadFromTask(task)
        const stack = payload.tech_stack as TechStack | undefined
        if (stack) setTechStack({ ...DEFAULT_TECH_STACK, ...stack })
      }
    }
  }, [greeting, task])

  const fetchRunOutput = useCallback(
    async (runId: string) => {
      const { data: out } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()

      if (out?.output?.files) {
        setBuilderOutput(out.output as BuilderOutput)
      }
    },
    [supabase]
  )

  const handleRunSuccess = useCallback(
    async (runId: string) => {
      setLoading(false)
      setBuildComplete(true)
      await fetchRunOutput(runId)
      await refreshPreviewUrl()
      setMessages((prev) => {
        const msg = statusToCtoMessage('success')
        if (!msg || prev.some((m) => m.message === msg.message)) return prev
        return [
          ...prev,
          {
            id: `success-${Date.now()}`,
            sender: msg.sender,
            message: msg.message,
            timestamp: new Date(),
          },
        ]
      })
    },
    [fetchRunOutput, refreshPreviewUrl]
  )

  const handleRunError = useCallback((message: string) => {
    setLoading(false)
    setMessages((prev) => [
      ...prev,
      {
        id: `error-${Date.now()}`,
        sender: 'system',
        message: `Build failed: ${message}`,
        timestamp: new Date(),
      },
    ])
  }, [])

  const { status: runStatus, logs: runLogs } = useAgentRunSubscription(
    currentRunId,
    handleRunSuccess,
    handleRunError
  )

  useEffect(() => {
    if (!runStatus || runStatus === lastStatusRef.current) return
    lastStatusRef.current = runStatus
    const cto = statusToCtoMessage(runStatus)
    if (!cto) return
    setMessages((prev) => {
      if (prev.some((m) => m.message === cto.message)) return prev
      return [
        ...prev,
        {
          id: `${runStatus}-${Date.now()}`,
          sender: cto.sender,
          message: cto.message,
          timestamp: new Date(),
        },
      ]
    })
  }, [runStatus])

  const handleBuild = async (specification: string) => {
    const spec = specification.trim() || pendingSpec.trim()
    if (!spec) return

    setLoading(true)
    setBuildComplete(false)
    setBuilderOutput(null)
    setCurrentRunId(null)
    lastStatusRef.current = ''
    setDeployError(null)

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        message: spec,
        timestamp: new Date(),
      },
    ])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        handleRunError('Please sign in to use Studio.')
        return
      }

      let payload: Record<string, unknown> = {
        task_type: 'custom',
        specification: spec,
        tech_stack: techStack,
        github_repo: githubRepo,
      }

      if (task) {
        payload = {
          ...buildPayloadFromTask(task),
          specification: spec,
          tech_stack: techStack,
          github_repo: githubRepo,
        }
      }

      const response = await fetch(getAgentApiUrl('v1/agents/builder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(await readAgentError(response))

      const result = await response.json()
      setCurrentRunId(result.run_id)
      lastStatusRef.current = result.status || 'queued'
    } catch (err) {
      handleRunError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleSuggestionSelect = (spec: string) => {
    setPendingSpec(spec)
    setMessages((prev) => [
      ...prev,
      {
        id: `suggestion-${Date.now()}`,
        sender: 'builder',
        message: `I've pulled up "${spec}". Hit Go when you're ready.`,
        timestamp: new Date(),
      },
    ])
  }

  const handleDeploy = async () => {
    setDeployError(null)
    setDeploying(true)
    try {
      const res = await fetch('/api/integrations/vercel/deploy', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setDeployError(data.error || 'Deploy failed')
        return
      }
      if (data.preview_url) {
        setPreviewUrl(data.preview_url)
        setBuildComplete(true)
      }
    } catch {
      setDeployError('Deploy request failed')
    } finally {
      setDeploying(false)
    }
  }

  const handleSharePreview = () => {
    if (!previewUrl) return
    void navigator.clipboard.writeText(previewUrl)
  }

  return (
    <div className="flex flex-col h-screen min-h-0 bg-[#050505]">
      <div className="forge-accent-bar shrink-0" />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
          <CTOChatPanel
            messages={messages}
            isBuilding={loading}
            taskContext={task}
            suggestions={suggestions}
            onBuild={handleBuild}
            onSuggestionSelect={handleSuggestionSelect}
            onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
            advancedOpen={advancedOpen}
          />
          <div className="p-2 min-h-0 flex flex-col">
            <PreviewPane
              previewUrl={previewUrl}
              isBuilding={loading}
              buildComplete={buildComplete || !!previewUrl}
              runId={currentRunId}
              runStatus={runStatus}
              runLogs={runLogs}
              vercelConnected={vercelConnected}
              onReviewCode={() => setAdvancedOpen(true)}
              onDeploy={handleDeploy}
              onSharePreview={handleSharePreview}
              deployError={deployError}
              deploying={deploying}
            />
          </div>
        </div>

        <AdvancedPanel
          open={advancedOpen}
          builderOutput={builderOutput}
          techStack={techStack}
          githubRepo={githubRepo}
        />
      </div>
    </div>
  )
}
