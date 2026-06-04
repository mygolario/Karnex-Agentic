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
import type { ForgeAutonomy, ForgeMode, ForgeProjectType } from '@/lib/studio/forge-types'
import StudioForgeControls from '@/components/studio/StudioForgeControls'
import ProgressTimeline from '@/components/studio/ProgressTimeline'
import LetKarnexHandoffs from '@/components/studio/LetKarnexHandoffs'
import DetectedModeChip from '@/components/studio/DetectedModeChip'
import PlanEditor from '@/components/studio/PlanEditor'
import { detectForgeModeClient } from '@/lib/studio/detect-mode'

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
  const [forgeMode, setForgeMode] = useState<ForgeMode>('auto')
  const [forgeAutonomy, setForgeAutonomy] = useState<ForgeAutonomy>('founder')
  const [projectType, setProjectType] = useState<ForgeProjectType>('auto')
  const [modelId, setModelId] = useState('karnex-forge-fast-high')
  const [autoModel, setAutoModel] = useState(false)
  const [maxMode, setMaxMode] = useState(false)
  const [planApproved, setPlanApproved] = useState(false)
  const [awaitingPlanApproval, setAwaitingPlanApproval] = useState(false)
  const [toolsStatus, setToolsStatus] = useState<'ok' | 'degraded'>('ok')
  const [useAllSteps, setUseAllSteps] = useState(false)
  const [skipGithubPush, setSkipGithubPush] = useState(false)
  const [costEstimate, setCostEstimate] = useState<string | null>(null)
  const [costUsdRange, setCostUsdRange] = useState<[number, number] | null>(null)
  const [proactiveScanning, setProactiveScanning] = useState(false)
  const [detectedFromLogs, setDetectedFromLogs] = useState<string | null>(null)

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
    async (runId: string): Promise<BuilderOutput | null> => {
      const { data: out } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()

      if (out?.output) {
        const output = out.output as BuilderOutput
        setBuilderOutput(output)
        return output
      }
      return null
    },
    [supabase]
  )

  const handleRunSuccess = useCallback(
    async (runId: string) => {
      setLoading(false)
      setBuildComplete(true)
      const output = await fetchRunOutput(runId)
      if (output?.approval_required || output?.pending_plan) {
        setAwaitingPlanApproval(true)
      }
      await refreshPreviewUrl()
      setMessages((prev) => {
        const summary = output?.summary || statusToCtoMessage('success')?.message || 'Build completed successfully.'
        if (prev.some((m) => m.message === summary)) return prev
        return [
          ...prev,
          {
            id: `success-${Date.now()}`,
            sender: 'builder',
            message: summary,
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
    if (!runStatus || runStatus === lastStatusRef.current || runStatus === 'success') return
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

  const handleBuild = async (
    specification: string,
    opts?: { planApprovedOverride?: boolean }
  ) => {
    const spec = specification.trim() || pendingSpec.trim()
    if (!spec) return

    const approved = opts?.planApprovedOverride ?? planApproved

    setLoading(true)
    setBuildComplete(false)
    setBuilderOutput(null)
    setCurrentRunId(null)
    lastStatusRef.current = ''
    setDeployError(null)
    if (!opts?.planApprovedOverride) {
      setPlanApproved(false)
      setAwaitingPlanApproval(false)
    }

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
        mode: forgeMode,
        autonomy: forgeAutonomy,
        project_type: projectType,
        model_id: autoModel ? undefined : modelId,
        auto_model: autoModel,
        max_mode: maxMode,
        plan_approved: approved,
        preview_url: previewUrl,
        use_selected_model_all_steps: useAllSteps,
        skip_github_push: skipGithubPush,
        estimated_cost_usd: costUsdRange ?? undefined,
      }

      if (task) {
        payload = {
          ...buildPayloadFromTask(task),
          specification: spec,
          tech_stack: techStack,
          github_repo: githubRepo,
          mode: forgeMode,
          autonomy: forgeAutonomy,
          project_type: projectType,
          model_id: autoModel ? undefined : modelId,
          auto_model: autoModel,
          max_mode: maxMode,
          plan_approved: approved,
          preview_url: previewUrl,
          use_selected_model_all_steps: useAllSteps,
          skip_github_push: skipGithubPush,
          task_id: task.id,
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

  const handlePlanApproved = () => {
    setPlanApproved(true)
    setAwaitingPlanApproval(false)
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user')
    if (lastUser) void handleBuild(lastUser.message, { planApprovedOverride: true })
  }

  const handleProactiveScan = async () => {
    setProactiveScanning(true)
    setForgeMode('debug')
    const spec =
      'Proactive scan: find bugs, missing error handling, type issues, and security risks. Apply patches where possible.'
    setPendingSpec(spec)
    await handleBuild(spec)
    setProactiveScanning(false)
  }

  useEffect(() => {
    if (searchParams.get('advanced') === '1') setAdvancedOpen(true)
    const specParam = searchParams.get('spec')
    if (specParam) setPendingSpec(decodeURIComponent(specParam))
  }, [searchParams])

  useEffect(() => {
    fetch('/api/forge/tools-health')
      .then((r) => r.json())
      .then((d) => setToolsStatus(d.status === 'degraded' ? 'degraded' : 'ok'))
      .catch(() => setToolsStatus('degraded'))
  }, [])

  useEffect(() => {
    fetch('/api/forge/studio-defaults')
      .then((r) => r.json())
      .then((d) => {
        if (d.autonomy) setForgeAutonomy(d.autonomy)
        if (typeof d.max_mode === 'boolean') setMaxMode(d.max_mode)
        if (typeof d.auto_model === 'boolean') setAutoModel(d.auto_model)
        if (d.mode) setForgeMode(d.mode)
        if (d.project_type) setProjectType(d.project_type)
      })
      .catch(() => {})
  }, [])

  const clientDetected = pendingSpec.trim()
    ? detectForgeModeClient(pendingSpec)
    : null

  const effectiveDetectedMode =
    (detectedFromLogs as Exclude<ForgeMode, 'auto'> | null) ||
    (clientDetected?.mode ?? null)

  useEffect(() => {
    const logMode = runLogs.find((l) => l.type === 'mode_detected' || l.detected_mode)
    if (logMode?.detected_mode) setDetectedFromLogs(logMode.detected_mode)
  }, [runLogs])

  const refreshCostEstimate = useCallback(async (spec: string) => {
    if (!spec.trim()) {
      setCostEstimate(null)
      return
    }
    try {
      const res = await fetch('/api/forge/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specification: spec,
          max_mode: maxMode,
          mode: forgeMode,
        }),
      })
      const data = await res.json()
      if (data.usd_range && data.usd_range.length >= 2) {
        setCostUsdRange([data.usd_range[0], data.usd_range[1]])
        setCostEstimate(`$${data.usd_range[0]}–$${data.usd_range[1]}`)
      }
    } catch {
      setCostEstimate(null)
    }
  }, [maxMode, forgeMode])

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshCostEstimate(pendingSpec)
    }, 400)
    return () => clearTimeout(t)
  }, [pendingSpec, refreshCostEstimate])

  return (
    <div className="flex flex-col h-screen min-h-0 bg-[#050505]">
      <div className="forge-accent-bar shrink-0" />

      <StudioForgeControls
        mode={forgeMode}
        autonomy={forgeAutonomy}
        projectType={projectType}
        modelId={modelId}
        autoModel={autoModel}
        maxMode={maxMode}
        planApproved={planApproved}
        toolsStatus={toolsStatus}
        useAllSteps={useAllSteps}
        skipGithubPush={skipGithubPush}
        costEstimate={costEstimate}
        showPlanApprove={awaitingPlanApproval && forgeAutonomy === 'developer'}
        onModeChange={setForgeMode}
        onAutonomyChange={setForgeAutonomy}
        onProjectTypeChange={setProjectType}
        onModelIdChange={setModelId}
        onAutoModelChange={setAutoModel}
        onMaxModeChange={setMaxMode}
        onPlanApproved={handlePlanApproved}
        onUseAllStepsChange={setUseAllSteps}
        onSkipGithubPushChange={setSkipGithubPush}
        onProactiveScan={() => void handleProactiveScan()}
        proactiveScanning={proactiveScanning}
      />

      <DetectedModeChip
        detectedMode={effectiveDetectedMode}
        reason={clientDetected?.reason}
        currentMode={forgeMode}
        onSwitch={(m) => setForgeMode(m)}
      />

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
              projectType={
                (builderOutput?.project_type as ForgeProjectType) || projectType
              }
              builderSummary={builderOutput?.summary}
              showProgressFeed
              vercelConnected={vercelConnected}
              onReviewCode={() => setAdvancedOpen(true)}
              onDeploy={handleDeploy}
              onSharePreview={handleSharePreview}
              deployError={deployError}
              deploying={deploying}
            />
          </div>
        </div>

        {awaitingPlanApproval && builderOutput?.pending_plan && (
          <PlanEditor
            pendingPlan={builderOutput.pending_plan}
            disabled={loading}
            onSaveAndBuild={(edited) => void handleBuild(edited, { planApprovedOverride: true })}
          />
        )}

        {builderOutput?.handoff_actions && builderOutput.handoff_actions.length > 0 && (
          <LetKarnexHandoffs actions={builderOutput.handoff_actions} />
        )}

        {currentRunId && runLogs.length > 0 && (
          <ProgressTimeline logs={runLogs} />
        )}

        <AdvancedPanel
          open={advancedOpen}
          builderOutput={builderOutput}
          techStack={techStack}
          githubRepo={githubRepo}
          runId={currentRunId}
          toolsStatus={toolsStatus}
          modelId={modelId}
          autoModel={autoModel}
          maxMode={maxMode}
          onModelIdChange={setModelId}
          onAutoModelChange={setAutoModel}
          onMaxModeChange={setMaxMode}
        />
      </div>
    </div>
  )
}
