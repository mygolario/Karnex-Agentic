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
import VisualEditModal from '@/components/forge/VisualEditModal'


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
    { id: 'intent', label: 'Stage 1: Intent Crystallization', state: 'pending' },
    { id: 'architecture', label: 'Stage 2: Architecture Blueprint', state: 'pending' },
    { id: 'assets', label: 'Stage 3: Visual Asset Pre-Generation', state: 'pending' },
    { id: 'coding', label: 'Stage 4: Modular Code Scaffolding', state: 'pending' },
    { id: 'compilation', label: 'Stage 5: Autonomous Compiler Sandbox', state: 'pending' },
    { id: 'deploy', label: 'Stage 6: Deployment & Git Sync', state: 'pending' },
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
    if (msg.includes('crystallization') || msg.includes('intent spec')) {
      activeIdx = 0
    } else if (msg.includes('architecture blueprint') || msg.includes('designing schema')) {
      steps[0].state = 'done'
      activeIdx = 1
    } else if (msg.includes('asset injection') || msg.includes('brand tokens')) {
      steps[0].state = 'done'
      steps[1].state = 'done'
      activeIdx = 2
    } else if (msg.includes('code generation') || msg.includes('scaffolded')) {
      steps[0].state = 'done'
      steps[1].state = 'done'
      steps[2].state = 'done'
      activeIdx = 3
    } else if (msg.includes('autonomous testing') || msg.includes('compilation') || msg.includes('heal')) {
      steps[0].state = 'done'
      steps[1].state = 'done'
      steps[2].state = 'done'
      steps[3].state = 'done'
      activeIdx = 4
    } else if (msg.includes('deployment') || msg.includes('committing') || msg.includes('github') || msg.includes('deploying')) {
      steps[0].state = 'done'
      steps[1].state = 'done'
      steps[2].state = 'done'
      steps[3].state = 'done'
      steps[4].state = 'done'
      activeIdx = 5
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
  const [showCode, setShowCode] = useState(false)
  const [draft, setDraft] = useState('')
  const [selectedElement, setSelectedElement] = useState<{ selector: string; text: string } | null>(null)
  const [isVisualEditOpen, setIsVisualEditOpen] = useState(false)


  // Config
  const [framework, setFramework] = useState('nextjs')
  const [styling, setStyling] = useState('tailwind')
  const [database, setDatabase] = useState('supabase')
  const [githubRepo, setGithubRepo] = useState('')

  // Forge model & mode
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [forgeMode, setForgeMode] = useState<'auto' | 'build' | 'plan' | 'ask' | 'debug'>('auto')
  const [autoModel, setAutoModel] = useState(false)
  const [maxMode, setMaxMode] = useState(false)

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
        const isNewSession = typeof window !== 'undefined' && sessionStorage.getItem('karnex-workspace-new') === 'true'
        if (runs.length > 0 && !currentRunId && !builderOutput && !isNewSession) {
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
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('karnex-workspace-new')
    }

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
          mode: forgeMode,
          model_id: selectedModelId || null,
          auto_model: autoModel,
          max_mode: maxMode,
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
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('karnex-workspace-new')
    }
    setLoading(true)
    await fetchRunOutput(buildId)
    setLoading(false)
  }

  // Clear workspace for a new project
  const handleNewProject = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('karnex-workspace-new', 'true')
    }
    setBuilderOutput(null)
    setCurrentRunId(null)
    setCurrentRunStatus('')
    setSelectedFileIdx(0)
    setProjectName('')
    setChatMessages([
      {
        id: 'welcome',
        sender: 'system',
        message: 'Welcome to Karnex Forge. Describe your idea below to begin.',
        timestamp: new Date(),
      },
    ])
    setShowCode(false)
  }

  const handleSaveVisualEdit = (selector: string, updates: { text?: string; bg?: string; color?: string; border?: string }) => {
    if (!builderOutput) return

    let userPrompt = `Modify element '${selector}'`
    if (updates.text) userPrompt += ` to have text content: "${updates.text}"`
    if (updates.bg) userPrompt += ` with background styles: "${updates.bg}"`
    if (updates.color) userPrompt += ` with text color classes: "${updates.color}"`
    if (updates.border) userPrompt += ` with border styling: "${updates.border}"`

    handleBuild(userPrompt)
  }


  // Computed
  const hasOutput = builderOutput !== null && builderOutput.files.length > 0
  const buildProgress = loading ? 50 : 0
  const activeAgent = loading ? 'Orchestrator' : null
  const activeSteps = parseLogsToSteps(chatMessages, currentRunStatus)

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white dash-reveal">
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
        showCode={showCode}
        onToggleCode={() => setShowCode(!showCode)}
        onNewProject={handleNewProject}
      />

      {/* Main workspace (Three-Column Layout) */}
      <div className="flex-1 flex min-h-0 divide-x divide-zinc-900/50 overflow-hidden forge-grid-bg bg-[#050505]">
        
        {/* Column 1: Chat & Progress timeline */}
        <div className="w-[300px] shrink-0 flex flex-col h-full bg-[#07070a]/60 backdrop-blur-md">
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
              forgeMode={forgeMode}
              onForgeModeChange={setForgeMode}
              maxMode={maxMode}
              onMaxModeChange={setMaxMode}
              draft={draft}
              onDraftChange={setDraft}
            />
          </div>
        </div>

        {/* Column 2: Code Editor (shown if showCode is true OR if we don't have output yet) */}
        {(showCode || !hasOutput) && (
          <div className="flex-[1.2] flex flex-col h-full min-w-[320px] bg-[#09090d]/60 backdrop-blur-md">
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
                  <div className="flex flex-col items-center gap-5 max-w-xs">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[13px] font-medium text-zinc-200">Karnex is building your MVP...</p>
                      <p className="text-[11px] text-zinc-500">Running multi-agent pipeline · Generating files</p>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse"
                        style={{ width: buildDuration ? `${Math.min(95, (buildDuration / 180) * 100)}%` : '15%' }}
                      />
                    </div>
                    {buildDuration !== null && buildDuration > 0 && (
                      <p className="text-[10px] text-zinc-600 font-mono">{buildDuration}s elapsed</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Column 3: Live Preview / DB Schema (only shown if we have output) */}
        {hasOutput && (
          <div className="flex-1 flex flex-col h-full min-w-[360px] bg-[#050505]/40 backdrop-blur-md">
            <div className="flex-1 min-h-0 p-2 overflow-hidden">
              {/* Preview Panel */}
              {activeTab === 'preview' && (
                <div className="h-full">
                  <PreviewPanel
                    files={builderOutput?.files || []}
                    inspectMode={inspectMode}
                    onToggleInspect={() => setInspectMode(!inspectMode)}
                    onSelectElement={(selector, text) => {
                      appendChat('system', `Selected: ${selector} — "${text}"`)

                      const tag = selector.split(/[.#]/)[0] || 'element'
                      setDraft(`Selected: ${selector} - '${text}' -> Edit this ${tag}...`)
                      setSelectedElement({ selector, text })
                      setIsVisualEditOpen(true)

                      setShowCode(true)

                      if (builderOutput?.files && builderOutput.files.length > 0) {
                        let bestIdx = 0
                        let maxScore = -1
                        const textLower = text.trim().toLowerCase()
                        const tagLower = tag.toLowerCase()
                        const classes = selector.split('.').slice(1).map(c => c.toLowerCase())

                        builderOutput.files.forEach((file, idx) => {
                          let score = 0
                          const contentLower = file.content.toLowerCase()

                          // 1. Text match (highest priority)
                          if (textLower && contentLower.includes(textLower)) {
                            score += 1000
                          }

                          // 2. Class name matches
                          if (classes.length > 0) {
                            let classMatches = 0
                            classes.forEach(c => {
                              if (contentLower.includes(c)) {
                                classMatches++
                              }
                            })
                            score += classMatches * 50
                          }

                          // 3. Tag match
                          if (tagLower && contentLower.includes(`<${tagLower}`)) {
                            score += 10
                          }

                          // 4. File name heuristic
                          if (file.path.toLowerCase().endsWith('page.tsx') || file.path.toLowerCase().endsWith('index.html')) {
                            score += 5
                          }

                          if (score > maxScore && score > 0) {
                            maxScore = score
                            bestIdx = idx
                          }
                        })

                        setSelectedFileIdx(bestIdx)
                      }
                    }}
                    isBuilding={loading && !hasOutput}
                    gitHubPrUrl={builderOutput?.pr_url}
                  />
                </div>
              )}

              {/* Database Panel */}
              {activeTab === 'database' && (
                <div className="h-full">
                  <SchemaVisualizer files={builderOutput.files} />
                </div>
              )}

              {/* Launch / Deploy Panel */}
              {activeTab === 'deploy' && (
                <div className="h-full overflow-y-auto forge-scroll rounded-lg border border-zinc-900 bg-[#0a0a0e] p-6">
                  <div className="space-y-6">
                    {builderOutput.pr_url && (
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-[12px] font-medium text-white">GitHub Repository Connected</h4>
                          <p className="text-[11px] text-zinc-400">The generated code has been pushed to a new branch in your repository.</p>
                        </div>
                        <a
                          href={builderOutput.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-[#6366f1] hover:bg-[#5558e6] text-white text-[11px] font-medium rounded-md px-3 py-1.5 transition-colors shrink-0 cursor-pointer"
                        >
                          Open Pull Request
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0019 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </div>
                    )}

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
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Version timeline (slide-in) */}
      <VersionTimeline
        visible={showVersions}
        versions={versions}
        activeVersionId={currentRunId}
        onSelectVersion={(id) => handleLoadBuild(id)}
        onClose={() => setShowVersions(false)}
      />

      {/* Click-to-Select Visual Edit Modal */}
      <VisualEditModal
        isOpen={isVisualEditOpen}
        onClose={() => setIsVisualEditOpen(false)}
        selectedElement={selectedElement}
        onSave={handleSaveVisualEdit}
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
