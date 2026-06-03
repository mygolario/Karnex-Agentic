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

/* ── Status → Progress mapping ── */

function statusToProgress(status: string): number {
  switch (status) {
    case 'queued': return 8
    case 'decomposing_specifications': return 25
    case 'spawning_db_designer': return 50
    case 'spawning_ui_coder': return 70
    case 'running_linter_validation': return 88
    case 'committing_to_github': return 95
    case 'success': return 100
    default: return 0
  }
}

function statusToAgentLabel(status: string): string | null {
  switch (status) {
    case 'decomposing_specifications': return 'Design Agent'
    case 'spawning_db_designer': return 'Database Agent'
    case 'spawning_ui_coder': return 'Builder Agent'
    case 'running_linter_validation': return 'Linter'
    case 'committing_to_github': return 'GitHub Agent'
    default: return null
  }
}

function statusToChatMessage(status: string): { sender: ChatMessage['sender']; message: string } | null {
  switch (status) {
    case 'queued':
      return { sender: 'system', message: 'Build pipeline queued. Initializing agents...' }
    case 'decomposing_specifications':
      return { sender: 'design', message: 'Decomposing layout specs, mapping color variables and typography.' }
    case 'spawning_db_designer':
      return { sender: 'database', message: 'Provisioning SQL schemas, migration files, and table constraints.' }
    case 'spawning_ui_coder':
      return { sender: 'builder', message: 'Scaffolding React components, styles, and configuration.' }
    case 'running_linter_validation':
      return { sender: 'system', message: 'Running self-healing compilation, scanning imports and syntax.' }
    case 'committing_to_github':
      return { sender: 'github', message: 'Pushing feature branch commits to repository.' }
    case 'success':
      return { sender: 'system', message: 'Build succeeded. Files ready for review.' }
    default:
      return null
  }
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
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'database' | 'deploy'>('preview')
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

  // Load past builds
  const loadHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('id, input, created_at')
        .eq('founder_id', session.user.id)
        .eq('agent_id', 'builder-v1')
        .eq('status', 'success')
        .order('created_at', { ascending: false })

      if (runs) {
        const formatted = runs.map((r: any) => ({
          id: r.id,
          spec: r.input?.specification || 'Code Build',
          created_at: r.created_at,
        }))
        setPastBuilds(formatted)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }, [supabase])

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
          .select('status, error_message')
          .eq('id', currentRunId)
          .single()

        if (error) throw error
        if (!run) return

        if (run.status !== currentRunStatus) {
          setCurrentRunStatus(run.status)
          const msg = statusToChatMessage(run.status)
          if (msg) appendChat(msg.sender, msg.message)
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
          appendChat('system', `Build failed: ${run.error_message || 'Unknown error'}`)
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentRunId, currentRunStatus, supabase, appendChat, loadHistory, buildStartTime])

  // Fetch build output
  const fetchRunOutput = async (runId: string) => {
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

        // Add to version timeline
        setVersions((prev) => {
          if (prev.some((v) => v.id === runId)) return prev
          return [{
            id: runId,
            prompt: projectName || 'Build',
            fileCount: out.output.files.length,
            timestamp: new Date(),
          }, ...prev]
        })
      }
    } catch (err) {
      console.error('Error retrieving build output:', err)
    }
  }

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

    appendChat('user', promptText)

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
  const buildProgress = statusToProgress(currentRunStatus)
  const activeAgent = loading ? statusToAgentLabel(currentRunStatus) : null

  return (
    <div className="flex flex-col h-screen bg-[#050505]">
      {/* Accent line */}
      <div className="forge-accent-bar shrink-0" />

      {/* Header */}
      <ForgeHeader
        projectName={projectName}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDeploy={() => {}}
        onToggleVersions={() => setShowVersions(!showVersions)}
        hasOutput={hasOutput}
      />

      {/* Main workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Chat panel */}
        <div className="w-[340px] shrink-0">
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

        {/* Canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-2 min-h-0">
            {/* Show launcher when no output and not building */}
            {!hasOutput && !loading && (
              <ProjectLauncher
                onSelectTemplate={handleBuild}
                recentBuilds={pastBuilds}
                onLoadBuild={handleLoadBuild}
              />
            )}

            {/* Preview tab */}
            {(hasOutput || loading) && activeTab === 'preview' && (
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

            {/* Code tab */}
            {hasOutput && activeTab === 'code' && (
              <CodePanel
                files={builderOutput.files}
                selectedFileIdx={selectedFileIdx}
                onSelectFile={setSelectedFileIdx}
              />
            )}

            {/* Database tab */}
            {activeTab === 'database' && (
              <div className="h-full">
                {hasOutput ? (
                  <SchemaVisualizer files={builderOutput.files} />
                ) : (
                  <div className="flex items-center justify-center h-full rounded-lg border border-dashed border-[#1a1a1a]">
                    <span className="text-[13px] text-zinc-600">Run a build to view database schemas</span>
                  </div>
                )}
              </div>
            )}

            {/* Deploy tab */}
            {activeTab === 'deploy' && (
              <div className="h-full overflow-y-auto forge-scroll rounded-lg border border-[#141417] bg-[#0a0a0e] p-6">
                {hasOutput ? (
                  <div className="space-y-6 max-w-3xl">
                    {/* Setup instructions */}
                    <div>
                      <h3 className="text-[13px] font-medium text-zinc-200">Setup Instructions</h3>
                      <div className="mt-3 space-y-2">
                        {builderOutput.setup_instructions.map((inst, idx) => (
                          <div key={idx} className="bg-[#09090b] rounded-md border border-[#141417] p-3 text-[12px] font-mono text-zinc-400">
                            {inst}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Improvements */}
                    <div>
                      <h3 className="text-[13px] font-medium text-zinc-200">Suggested Improvements</h3>
                      <ul className="mt-3 space-y-1.5">
                        {builderOutput.suggested_improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[12px] text-zinc-400">
                            <span className="text-zinc-600 mt-0.5 shrink-0">—</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Build history */}
                    <div>
                      <h3 className="text-[13px] font-medium text-zinc-200">Build History</h3>
                      <div className="mt-3 space-y-2">
                        {pastBuilds.map((build) => (
                          <div
                            key={build.id}
                            className="flex items-center justify-between bg-[#09090b] rounded-md border border-[#141417] p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] text-zinc-300 truncate">{build.spec}</p>
                              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{build.id.slice(0, 8)}</p>
                            </div>
                            <span className="text-[10px] font-medium text-emerald-500/80 bg-emerald-500/8 border border-emerald-500/10 rounded px-2 py-0.5 shrink-0">
                              DEPLOYED
                            </span>
                          </div>
                        ))}
                        {pastBuilds.length === 0 && (
                          <p className="text-[12px] text-zinc-600">No builds yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[13px] text-zinc-600">Run a build to view deployment options</span>
                  </div>
                )}
              </div>
            )}
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
      </div>

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
