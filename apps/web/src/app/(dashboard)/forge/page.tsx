'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'
import ForgeHeader from '@/components/forge/ForgeHeader'
import ChatPanel from '@/components/forge/ChatPanel'
import PreviewPanel from '@/components/forge/PreviewPanel'
import CodePanel from '@/components/forge/CodePanel'
import SchemaVisualizer from '@/components/forge/SchemaVisualizer'
import ProjectLauncher from '@/components/forge/ProjectLauncher'
import ForgeStatusBar from '@/components/forge/ForgeStatusBar'
import VersionTimeline from '@/components/forge/VersionTimeline'

/* ── Types ── */

interface GeneratedFile {
  path: string
  content: string
  language: string
  description: string
}

interface BuilderOutput {
  files: GeneratedFile[]
  summary: string
  setup_instructions: string[]
  tests_included: boolean
  deployment_ready: boolean
  suggested_improvements: string[]
  pr_url?: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'design' | 'database' | 'builder' | 'github' | 'system'
  message: string
  timestamp: Date
  fileCreated?: string
}

interface BuildVersion {
  id: string
  prompt: string
  fileCount: number
  timestamp: Date
}

interface StepState {
  id: string
  label: string
  state: 'pending' | 'active' | 'done' | 'failed'
}

/* ── Helper to parse logs and determine active step ── */

function parseLogsToSteps(logs: ChatMessage[], status: string): StepState[] {
  const steps: StepState[] = [
    { id: 'content', label: 'Phase 1: Content & Copywriting Asset Generation', state: 'pending' },
    { id: 'schema', label: 'Phase 2: Relational Schema & API Scaffolding', state: 'pending' },
    { id: 'coding', label: 'Phase 3: Visual UI Coding (Framer Motion + Tailwind)', state: 'pending' },
    { id: 'compilation', label: 'Phase 4: Sandboxed Compiler & QA Self-Healing', state: 'pending' },
    { id: 'deploy', label: 'Phase 5: GitHub Sync & Vercel Preview Deploy', state: 'pending' },
  ]

  if (status === 'error') {
    steps.forEach(s => s.state = 'failed')
    return steps
  }

  if (status === 'success') {
    steps.forEach(s => s.state = 'done')
    return steps
  }

  // Determine progress based on message strings
  let activeIdx = 0
  for (const log of logs) {
    const msg = log.message.toLowerCase()
    if (msg.includes('copywriting') || msg.includes('asset')) {
      activeIdx = 0
    } else if (msg.includes('database architect') || msg.includes('architecture plan')) {
      steps[0].state = 'done'
      activeIdx = 1
    } else if (msg.includes('visual ui coder') || msg.includes('scaffolded')) {
      steps[0].state = 'done'
      steps[1].state = 'done'
      activeIdx = 2
    } else if (msg.includes('sandbox') || msg.includes('compiler') || msg.includes('heal')) {
      steps[0].state = 'done'
      steps[1].state = 'done'
      steps[2].state = 'done'
      activeIdx = 3
    } else if (msg.includes('committing') || msg.includes('github') || msg.includes('deploying')) {
      steps[0].state = 'done'
      steps[1].state = 'done'
      steps[2].state = 'done'
      steps[3].state = 'done'
      activeIdx = 4
    }
  }

  for (let i = 0; i < steps.length; i++) {
    if (i < activeIdx) steps[i].state = 'done'
    else if (i === activeIdx) steps[i].state = 'active'
    else steps[i].state = 'pending'
  }

  return steps
}

/* ── Page ── */

export default function ForgePage() {
  return (
    <ErrorBoundary>
      <ForgeWorkspace />
    </ErrorBoundary>
  )
}

function ForgeWorkspace() {
  const supabase = createSupabaseBrowserClient()

  // UI state
  const [activeTab, setActiveTab] = useState<'preview' | 'database' | 'deploy'>('preview')
  const [showVersions, setShowVersions] = useState(false)
  const [inspectMode, setInspectMode] = useState(false)

  // Config
  const [framework, setFramework] = useState('nextjs')
  const [styling, setStyling] = useState('tailwind')
  const [database, setDatabase] = useState('supabase')
  const [githubRepo, setGithubRepo] = useState('')

  // Build state
  const [loading, setLoading] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [currentRunStatus, setCurrentRunStatus] = useState<string>('')
  const [builderOutput, setBuilderOutput] = useState<BuilderOutput | null>(null)
  const [selectedFileIdx, setSelectedFileIdx] = useState(0)
  const [buildStartTime, setBuildStartTime] = useState<number | null>(null)
  const [buildDuration, setBuildDuration] = useState<number | null>(null)

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'system',
      message: 'Welcome to Karnex Forge. Describe your idea below to begin.',
      timestamp: new Date(),
    },
  ])

  // History
  const [pastBuilds, setPastBuilds] = useState<{ id: string; spec: string; created_at: string }[]>([])
  const [versions, setVersions] = useState<BuildVersion[]>([])
  const [projectName, setProjectName] = useState('')

  // Build duration timer
  useEffect(() => {
    if (!loading || !buildStartTime) return
    const interval = setInterval(() => {
      setBuildDuration(Math.round((Date.now() - buildStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading, buildStartTime])

  // Fetch build output
  const fetchRunOutput = useCallback(async (runId: string) => {
    try {
      const { data: out, error } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()

      if (error) throw error

      if (out?.output?.files) {
        setBuilderOutput(out.output)
        setSelectedFileIdx(0)

        // Update fileCount in versions timeline
        setVersions((prev) => {
          return prev.map((v) => {
            if (v.id === runId) {
              return { ...v, fileCount: out.output.files.length }
            }
            return v
          })
        })
      }
    } catch (err) {
      console.error('Error retrieving build output:', err)
    }
  }, [supabase])

  // Load past builds and restore workspace
  const loadHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, input, created_at, status, logs, error_message')
        .eq('founder_id', session.user.id)
        .eq('agent_id', 'builder-v1')
        .order('created_at', { ascending: false })

      if (runs) {
        const successRuns = runs.filter((r: any) => r.status === 'success')
        const formatted = successRuns.map((r: any) => ({
          id: r.id,
          spec: r.input?.specification || 'Code Build',
          created_at: r.created_at,
        }))
        setPastBuilds(formatted)

        // Populate versions list for timeline
        const historyVersions = successRuns.map((r: any) => ({
          id: r.id,
          prompt: r.input?.specification || 'Code Build',
          fileCount: 0, // Will be updated when files load
          timestamp: new Date(r.created_at),
        }))
        setVersions(historyVersions)

        // Auto-restore workspace on refresh if no build is active or loaded
        if (runs.length > 0 && !currentRunId && !builderOutput) {
          const latestRun = runs[0]
          setProjectName(latestRun.input?.specification?.slice(0, 40) || 'Code Build')

          // Check if latest run is in progress
          const isInProgress = [
            'queued',
            'decomposing_specifications',
            'spawning_db_designer',
            'spawning_ui_coder',
            'running_linter_validation',
            'committing_to_github'
          ].includes(latestRun.status)

          // Restore chat history from the latest run logs
          let restoredLogs: ChatMessage[] = []
          if (latestRun.logs && Array.isArray(latestRun.logs)) {
            restoredLogs = latestRun.logs.map((log: any, idx: number) => ({
              id: `${latestRun.id}-${idx}`,
              sender: log.sender,
              message: log.message,
              timestamp: new Date(log.timestamp),
              fileCreated: log.fileCreated
            }))
          }

          // If empty logs, fallback to user prompt
          if (restoredLogs.length === 0 && latestRun.input?.specification) {
            restoredLogs.push({
              id: `${latestRun.id}-0`,
              sender: 'user',
              message: latestRun.input.specification,
              timestamp: new Date(latestRun.created_at)
            })
          }

          const messages: ChatMessage[] = [
            {
              id: 'welcome',
              sender: 'system',
              message: 'Welcome to Karnex Forge. Describe your idea below to begin.',
              timestamp: new Date(latestRun.created_at),
            },
            ...restoredLogs
          ]

          // If latest run was error, show error message
          if (latestRun.status === 'error') {
            messages.push({
              id: `${latestRun.id}-error`,
              sender: 'system',
              message: `Build failed: ${latestRun.error_message || 'Unknown error'}`,
              timestamp: new Date(latestRun.created_at)
            })
          }

          setChatMessages(messages)

          if (isInProgress) {
            // Re-start polling and loading state
            setLoading(true)
            setCurrentRunId(latestRun.id)
            setCurrentRunStatus(latestRun.status)
            setBuildStartTime(new Date(latestRun.created_at).getTime())
          } else if (latestRun.status === 'success') {
            // Load the output files
            fetchRunOutput(latestRun.id)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }, [supabase, currentRunId, builderOutput, fetchRunOutput])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Append chat message (deduped)
  const appendChat = useCallback((sender: ChatMessage['sender'], message: string, fileCreated?: string) => {
    setChatMessages((prev) => {
      if (prev.some((m) => m.message === message)) return prev
      return [...prev, {
        id: `${sender}-${Date.now()}-${Math.random()}`,
        sender,
        message,
        timestamp: new Date(),
        fileCreated,
      }]
    })
  }, [])

  // Poll run status
  useEffect(() => {
    if (!currentRunId || currentRunStatus === 'success' || currentRunStatus === 'error') return

    const interval = setInterval(async () => {
      try {
        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message, logs')
          .eq('id', currentRunId)
          .single()

        if (error) throw error
        if (!run) return

        if (run.status !== currentRunStatus) {
          setCurrentRunStatus(run.status)
        }

        // Sync logs from the database
        if (run.logs && Array.isArray(run.logs)) {
          const incomingLogs = run.logs.map((log: any, idx: number) => ({
            id: `${currentRunId}-${idx}`,
            sender: log.sender,
            message: log.message,
            timestamp: new Date(log.timestamp),
            fileCreated: log.fileCreated
          }))

          setChatMessages((prev) => {
            const cleanMessages = prev.filter(m => !m.id.startsWith('temp-user-') && !m.id.startsWith(currentRunId))
            return [...cleanMessages, ...incomingLogs]
          })
        }

        if (run.status === 'success') {
          clearInterval(interval)
          setLoading(false)
          setBuildDuration(buildStartTime ? Math.round((Date.now() - buildStartTime) / 1000) : null)
          fetchRunOutput(currentRunId)
          loadHistory()
        } else if (run.status === 'error') {
          clearInterval(interval)
          setLoading(false)
          setChatMessages((prev) => {
            const errorMsg = `Build failed: ${run.error_message || 'Unknown error'}`
            if (prev.some(m => m.message === errorMsg)) return prev
            return [...prev, {
              id: `${currentRunId}-error`,
              sender: 'system',
              message: errorMsg,
              timestamp: new Date()
            }]
          })
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentRunId, currentRunStatus, supabase, loadHistory, fetchRunOutput, buildStartTime])

  // Trigger build
  const handleBuild = async (promptText: string) => {
    if (!promptText.trim()) return

    setLoading(true)
    setBuilderOutput(null)
    setCurrentRunId(null)
    setCurrentRunStatus('')
    setInspectMode(false)
    setBuildStartTime(Date.now())
    setBuildDuration(0)

    if (!projectName) {
      setProjectName(promptText.slice(0, 40))
    }

    const tempUserMsgId = `temp-user-${Date.now()}`
    setChatMessages((prev) => [
      ...prev,
      {
        id: tempUserMsgId,
        sender: 'user',
        message: promptText,
        timestamp: new Date(),
      }
    ])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        appendChat('system', 'Please sign in to use Forge.')
        setLoading(false)
        return
      }

      const response = await fetch(getAgentApiUrl('v1/agents/builder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          task_type: 'custom',
          specification: promptText,
          tech_stack: { framework, styling, database },
          github_repo: githubRepo || null,
        }),
      })

      if (!response.ok) throw new Error(await readAgentError(response))

      const result = await response.json()
      setCurrentRunId(result.run_id)
      setCurrentRunStatus(result.status)
    } catch (err: any) {
      appendChat('system', `Initialization failed: ${err.message}`)
      setLoading(false)
    }
  }

  // Load a past build
  const handleLoadBuild = async (buildId: string) => {
    setLoading(true)
    await fetchRunOutput(buildId)
    setLoading(false)
  }

  // Computed
  const hasOutput = builderOutput !== null && builderOutput.files.length > 0
  const buildProgress = loading ? 50 : 0
  const activeAgent = loading ? 'Orchestrator' : null
  const activeSteps = parseLogsToSteps(chatMessages, currentRunStatus)

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white">
      {/* Accent line */}
      <div className="forge-accent-bar shrink-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />

      {/* Header */}
      <ForgeHeader
        projectName={projectName}
        activeTab={activeTab as any}
        onTabChange={setActiveTab as any}
        onDeploy={() => setActiveTab('deploy')}
        onToggleVersions={() => setShowVersions(!showVersions)}
        hasOutput={hasOutput}
      />

      {/* Main workspace (Three-Column Layout) */}
      <div className="flex-1 flex min-h-0 divide-x divide-zinc-900">
        
        {/* Column 1: Chat & Progress timeline */}
        <div className="w-[340px] shrink-0 flex flex-col h-full bg-[#07070a]">
          {loading && (
            <div className="border-b border-zinc-900 bg-zinc-950/50 p-4 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Build Progress</span>
              <ul className="space-y-1.5">
                {activeSteps.map(step => (
                  <li key={step.id} className="flex items-center gap-2 text-[11px]">
                    <span className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center text-[8px] ${
                      step.state === 'done' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                      step.state === 'active' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 animate-pulse' :
                      step.state === 'failed' ? 'border-rose-500 bg-rose-500/10 text-rose-400' :
                      'border-zinc-800 text-zinc-600'
                    }`}>
                      {step.state === 'done' ? '✓' : step.state === 'active' ? '→' : '○'}
                    </span>
                    <span className={step.state === 'active' ? 'text-zinc-100 font-medium' : 'text-zinc-400'}>{step.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <ChatPanel
              messages={chatMessages}
              isBuilding={loading}
              onSendPrompt={handleBuild}
              framework={framework}
              styling={styling}
              database={database}
              onFrameworkChange={setFramework}
              onStylingChange={setStyling}
              onDatabaseChange={setDatabase}
              buildProgress={buildProgress}
            />
          </div>
        </div>

        {/* Column 2: Code Editor */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-[#09090d]">
          {hasOutput ? (
            <CodePanel
              files={builderOutput.files}
              selectedFileIdx={selectedFileIdx}
              onSelectFile={setSelectedFileIdx}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              {!loading && (
                <div className="max-w-md">
                  <ProjectLauncher
                    onSelectTemplate={handleBuild}
                    recentBuilds={pastBuilds}
                    onLoadBuild={handleLoadBuild}
                  />
                </div>
              )}
              {loading && (
                <div className="space-y-3">
                  <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                  <p className="text-[12px] text-zinc-500">Preparing sandbox and generating MVP files...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 3: Live Preview / DB Schema */}
        <div className="w-[480px] shrink-0 flex flex-col h-full bg-[#050505]">
          <div className="flex-1 min-h-0 p-2 overflow-hidden">
            {/* Preview Panel */}
            {activeTab === 'preview' && (
              <div className="h-full">
                {builderOutput?.pr_url ? (
                  <div className="h-full flex flex-col bg-[#0a0a0e] rounded-lg overflow-hidden border border-zinc-900">
                    <div className="bg-[#09090b] px-3 py-1.5 border-b border-zinc-900 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500 truncate">{builderOutput.pr_url}</span>
                    </div>
                    <iframe
                      src={builderOutput.pr_url}
                      className="flex-1 w-full border-none bg-white"
                      title="MVP Preview"
                    />
                  </div>
                ) : (
                  <PreviewPanel
                    files={builderOutput?.files || []}
                    inspectMode={inspectMode}
                    onToggleInspect={() => setInspectMode(!inspectMode)}
                    onSelectElement={(selector, text) => {
                      appendChat('system', `Selected: ${selector} — "${text}"`)
                    }}
                    isBuilding={loading && !hasOutput}
                  />
                )}
              </div>
            )}

            {/* Database Panel */}
            {activeTab === 'database' && (
              <div className="h-full">
                {hasOutput ? (
                  <SchemaVisualizer files={builderOutput.files} />
                ) : (
                  <div className="flex items-center justify-center h-full rounded-lg border border-dashed border-zinc-800">
                    <span className="text-[12px] text-zinc-600">Run a build to view database schemas</span>
                  </div>
                )}
              </div>
            )}

            {/* Launch / Deploy Panel */}
            {activeTab === 'deploy' && (
              <div className="h-full overflow-y-auto forge-scroll rounded-lg border border-zinc-900 bg-[#0a0a0e] p-6">
                {hasOutput ? (
                  <div className="space-y-6">
                    {/* Setup instructions */}
                    <div>
                      <h3 className="text-[12px] font-medium text-zinc-200">Setup Instructions</h3>
                      <div className="mt-2 space-y-1.5">
                        {builderOutput.setup_instructions.map((inst, idx) => (
                          <div key={idx} className="bg-zinc-950 rounded border border-zinc-900 p-2.5 text-[11px] font-mono text-zinc-400">
                            {inst}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Improvements */}
                    <div>
                      <h3 className="text-[12px] font-medium text-zinc-200">Suggested Improvements</h3>
                      <ul className="mt-2 space-y-1">
                        {builderOutput.suggested_improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[11px] text-zinc-400">
                            <span className="text-zinc-700 mt-0.5 shrink-0">—</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[12px] text-zinc-600">Run a build to launch staging environment</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Version timeline (slide-in) */}
      <VersionTimeline
        visible={showVersions}
        versions={versions}
        activeVersionId={currentRunId}
        onSelectVersion={(id) => handleLoadBuild(id)}
        onClose={() => setShowVersions(false)}
      />

      {/* Status bar */}
      <ForgeStatusBar
        activeAgent={activeAgent}
        buildDuration={buildDuration}
        fileCount={builderOutput?.files.length || 0}
        framework={framework === 'nextjs' ? 'Next.js' : framework === 'fastapi' ? 'FastAPI' : 'React'}
        gitConnected={!!githubRepo}
      />
    </div>
  )
}
