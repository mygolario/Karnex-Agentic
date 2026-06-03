'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'
import PreviewContainer from '@/components/forge/PreviewContainer'
import SchemaVisualizer from '@/components/forge/SchemaVisualizer'

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

interface RunInfo {
  id: string
  status: string
  error_message?: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'designer' | 'db' | 'builder' | 'github' | 'system'
  message: string
  timestamp: Date
  details?: string
}

export default function ForgePage() {
  return (
    <ErrorBoundary>
      <ForgeContent />
    </ErrorBoundary>
  )
}

function ForgeContent() {
  const supabase = createSupabaseBrowserClient()

  // Tab state: 'preview' | 'code' | 'database' | 'deployments'
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'database' | 'deployments'>('preview')

  // Form Configuration State
  const [taskType, setTaskType] = useState<'landing_page' | 'auth_setup' | 'payment_integration' | 'dashboard' | 'api_endpoint' | 'custom'>('landing_page')
  const [specification, setSpecification] = useState('Create a dark-themed conversion optimized landing page for a SaaS, including a hero section, email waitlist input, customer testimonial cards, and modern grid-lines pricing section.')
  const [framework, setFramework] = useState('nextjs')
  const [styling, setStyling] = useState('tailwind')
  const [database, setDatabase] = useState('supabase')
  const [githubRepo, setGithubRepo] = useState('https://github.com/ariokaveh85/Karnex-Waitlist')
  const [codeContext, setCodeContext] = useState('')

  // Selected Target Element (Inspector Mode)
  const [inspectMode, setInspectMode] = useState(false)
  const [targetedElement, setTargetedElement] = useState<{ selector: string; text: string } | null>(null)

  // Execution and Output state
  const [loading, setLoading] = useState(false)
  const [currentRun, setCurrentRun] = useState<RunInfo | null>(null)
  const [builderOutput, setBuilderOutput] = useState<BuilderOutput | null>(null)
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0)
  const [pastBuilds, setPastBuilds] = useState<{ id: string; spec: string; created_at: string }[]>([])
  
  // Custom Chat Feed representation
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'system',
      message: 'Welcome to Karnex Forge. Describe your startup features below to begin compiling pages, schemas, and routes.',
      timestamp: new Date()
    }
  ])

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load Past Build Runs
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
          spec: r.input?.specification || 'Code Scaffolding Build',
          created_at: r.created_at
        }))
        setPastBuilds(formatted)
        
        // Auto-load latest build on entry if we don't have active output
        if (formatted.length > 0 && !builderOutput && !loading) {
          setLoading(true)
          fetchRunOutput(formatted[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }, [supabase, builderOutput, loading])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Process Agent Log Messages dynamically during runs
  const appendAgentLogs = (status: string) => {
    const timestamp = new Date()
    let sender: ChatMessage['sender'] = 'system'
    let message = ''
    
    switch (status) {
      case 'queued':
        sender = 'system'
        message = 'Enqueuing build pipeline task inside supervisor node...'
        break
      case 'decomposing_specifications':
        sender = 'designer'
        message = '🎨 Design Agent: Decomposing layout specs, mapping color scheme variables, and layout typography.'
        break
      case 'spawning_db_designer':
        sender = 'db'
        message = '📊 Database Agent: Provisioning SQL schemas, database migration files, and table keys.'
        break
      case 'spawning_ui_coder':
        sender = 'builder'
        message = '⚙️ Builder Agent: Scaffold coding React component elements and styles configuration.'
        break
      case 'running_linter_validation':
        sender = 'system'
        message = '🔧 Linter: Self-healing compilation running, scanning brace balance, and imports validation.'
        break
      case 'committing_to_github':
        sender = 'github'
        message = '🐙 GitHub Agent: Exchanging repository access tokens and pushing feature branch commits.'
        break
      case 'success':
        sender = 'system'
        message = '✓ Build succeeded! Component is active and ready for verification.'
        break
      default:
        return
    }

    setChatMessages(prev => {
      // Avoid duplicate logs matching the exact message
      if (prev.some(m => m.message === message)) return prev
      return [...prev, { id: status + timestamp.getTime(), sender, message, timestamp }]
    })
  }

  // Polling hook to monitor run compilation
  useEffect(() => {
    if (!currentRun || currentRun.status === 'success' || currentRun.status === 'error') return

    appendAgentLogs(currentRun.status)

    const interval = setInterval(async () => {
      try {
        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message')
          .eq('id', currentRun.id)
          .single()

        if (error) throw error

        if (run) {
          setCurrentRun((prev) => prev ? { ...prev, status: run.status, error_message: run.error_message } : null)
          appendAgentLogs(run.status)

          if (run.status === 'success') {
            clearInterval(interval)
            showToast('✓ Code files successfully compiled and pushed!')
            loadHistory()
            fetchRunOutput(currentRun.id)
          } else if (run.status === 'error') {
            clearInterval(interval)
            setLoading(false)
            setChatMessages(prev => [...prev, {
              id: 'err' + Date.now(),
              sender: 'system',
              message: `❌ Error: ${run.error_message || 'Builder agent execution aborted.'}`,
              timestamp: new Date()
            }])
            showToast(run.error_message || 'Builder agent execution failed.', 'error')
          }
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentRun, supabase, loadHistory])

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
      }
      setLoading(false)
    } catch (err) {
      console.error('Error retrieving build output:', err)
      showToast('Failed to fetch build output details.', 'error')
      setLoading(false)
    }
  }

  const handleTriggerBuild = async (promptText: string, specificContext?: string) => {
    if (!promptText.trim()) return

    setLoading(true)
    setBuilderOutput(null)
    setCurrentRun(null)
    setInspectMode(false)
    setTargetedElement(null)

    // Append user query to chat feed
    setChatMessages(prev => [...prev, {
      id: 'usr' + Date.now(),
      sender: 'user',
      message: promptText,
      timestamp: new Date()
    }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('Please sign in to trigger the agent coder.', 'error')
        setLoading(false)
        return
      }

      const token = session.access_token

      const response = await fetch(getAgentApiUrl('v1/agents/builder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          task_type: taskType,
          specification: promptText,
          tech_stack: {
            framework,
            styling,
            database
          },
          existing_codebase_context: specificContext || codeContext || null,
          github_repo: githubRepo || null
        })
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      setCurrentRun({
        id: result.run_id,
        status: result.status
      })

    } catch (err: any) {
      console.error('Trigger builder error:', err)
      setChatMessages(prev => [...prev, {
        id: 'err' + Date.now(),
        sender: 'system',
        message: `❌ Initialization failed: ${err.message}`,
        timestamp: new Date()
      }])
      showToast(err.message || 'Failed to initialize agent coder.', 'error')
      setLoading(false)
    }
  }

  const getProgressPercent = (status: string) => {
    switch (status) {
      case 'queued': return 10
      case 'decomposing_specifications': return 30
      case 'spawning_db_designer': return 55
      case 'spawning_ui_coder': return 75
      case 'running_linter_validation': return 90
      case 'committing_to_github': return 95
      case 'success': return 100
      default: return 0
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] h-[calc(100vh-140px)] flex flex-col gap-6 relative">
      <div className="absolute -top-10 left-12 w-64 h-64 bg-[#6366f1]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 rounded-xl px-5 py-3.5 text-xs font-bold text-white shadow-2xl flex items-center gap-2 border ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400'
            : 'bg-red-950/90 border-red-500/30 text-red-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1a1a1a]/40 pb-4 gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
            Karnex Forge
            <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15">
              Visual Creation Suite
            </span>
          </h1>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Describe layouts and watch the multi-agent system write frontend codes, design SQL tables, and commit to GitHub branches.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg border border-[#1a1a1a]/40 bg-[#060608]/80 px-3 py-1.5 font-mono text-[10px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>GitHub Sync Connected</span>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 grid lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Pane: Agent Chat Log Feed & Input Console */}
        <div className="lg:col-span-4 flex flex-col bg-[#07070a]/90 border border-[#1a1a1a]/40 rounded-2xl overflow-hidden min-h-0">
          
          {/* Chat Headers */}
          <div className="border-b border-[#1a1a1a]/40 bg-zinc-950/30 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Agent Collaborative Log</h2>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-semibold text-emerald-400 font-mono">STANDBY</span>
            </div>
          </div>

          {/* Logs scroll workspace */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 text-xs font-mono scrollbar-thin">
            {chatMessages.map((msg, index) => {
              const isUser = msg.sender === 'user'
              const isSys = msg.sender === 'system'
              
              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender tag */}
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wide">
                    {isUser ? 'Founder' : msg.sender} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {/* Text Bubble */}
                  <div className={`rounded-xl p-3 max-w-[90%] leading-relaxed border ${
                    isUser
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
                      : isSys
                      ? 'bg-zinc-950 border-zinc-900 text-zinc-400'
                      : 'bg-black/45 border-zinc-900 text-zinc-300'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              )
            })}

            {/* Live Loading Stepper */}
            {loading && currentRun && (
              <div className="bg-zinc-950/45 border border-dashed border-indigo-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400 text-[10px] uppercase font-mono">Compiling files tree...</span>
                  <span className="font-bold text-zinc-400 text-[10px]">{getProgressPercent(currentRun.status)}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/40">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-700 ease-out"
                    style={{ width: `${getProgressPercent(currentRun.status)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Target Element Edit Overlay */}
          {inspectMode && targetedElement && (
            <div className="border-t border-indigo-500/20 bg-indigo-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-indigo-400 font-bold">🎯 TARGETING ELEMENT:</span>
                <button
                  onClick={() => setTargetedElement(null)}
                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
              <div className="bg-black/35 rounded border border-indigo-500/10 p-2 font-mono text-[10px] text-zinc-400 truncate">
                Selector: <span className="text-indigo-300">{targetedElement.selector}</span>
                {targetedElement.text && <p className="mt-1 truncate">Text content: "{targetedElement.text}"</p>}
              </div>
            </div>
          )}

          {/* Quick Config Settings drawer */}
          <div className="px-6 py-2 border-t border-[#1a1a1a]/30 bg-zinc-950/10 grid grid-cols-3 gap-2 text-[9px] text-zinc-550 font-mono">
            <div>
              <span>STACK: </span>
              <span className="text-zinc-400 font-semibold">{framework.toUpperCase()}</span>
            </div>
            <div>
              <span>STYLES: </span>
              <span className="text-zinc-400 font-semibold">{styling.toUpperCase()}</span>
            </div>
            <div>
              <span>DB: </span>
              <span className="text-zinc-400 font-semibold">{database.toUpperCase()}</span>
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="border-t border-[#1a1a1a]/40 bg-zinc-950/25 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const input = form.elements.namedItem('prompt') as HTMLInputElement
                if (!input.value.trim()) return

                let promptText = input.value
                let specContext = ''
                
                if (inspectMode && targetedElement) {
                  // Prepend context about targeted element to prompt
                  specContext = `Targeted UI component selector: "${targetedElement.selector}" containing text: "${targetedElement.text}". `
                  promptText = `${specContext} Request: ${promptText}`
                }

                handleTriggerBuild(promptText)
                input.value = ''
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                name="prompt"
                disabled={loading}
                placeholder={inspectMode ? "Tweak selection (e.g. 'Make button neon purple')..." : "Type waitlist components specifications..."}
                className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#030303] px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none transition-all disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-indigo-500 hover:bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>

        </div>

        {/* Right Pane: Multi-Tab Workspace Canvas */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          
          {/* Tab Selection */}
          <div className="flex items-center justify-between border-b border-[#1a1a1a]/40 pb-3">
            <div className="flex gap-1.5 p-0.5 bg-[#09090b] rounded-xl border border-zinc-900">
              {(['preview', 'code', 'database', 'deployments'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize font-mono ${
                    activeTab === tab
                      ? 'bg-[#121217] border border-[#1a1a1a] text-white shadow-md'
                      : 'text-zinc-550 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Inspector Toggle */}
            {activeTab === 'preview' && (
              <button
                onClick={() => setInspectMode(!inspectMode)}
                className={`dash-btn px-4 py-2 text-xs font-mono font-bold border transition-all ${
                  inspectMode 
                    ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400' 
                    : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                🎯 Inspect Mode: {inspectMode ? 'ON' : 'OFF'}
              </button>
            )}
          </div>

          {/* Active Tab Workspace Renders */}
          <div className="flex-1 min-h-0 mt-4 relative">
            
            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <PreviewContainer
                files={builderOutput?.files || []}
                inspectMode={inspectMode}
                onSelectElement={(selector, text) => {
                  setTargetedElement({ selector, text })
                  showToast(`Selected element ${selector}`)
                }}
              />
            )}

            {/* Code Workspace Tab */}
            {activeTab === 'code' && builderOutput && (
              <div className="grid md:grid-cols-12 border border-[#1a1a1a]/40 rounded-2xl overflow-hidden bg-[#07070a]/90 h-full min-h-0">
                {/* File Tree List */}
                <div className="md:col-span-4 border-r border-[#1a1a1a]/40 bg-zinc-950/40 p-4 space-y-4 overflow-y-auto">
                  <h3 className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider font-mono">Workspace Directory</h3>
                  <div className="space-y-1.5">
                    {builderOutput.files.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedFileIdx(idx)}
                        className={`w-full text-left rounded-lg p-2.5 flex items-start gap-2.5 transition-all text-xs ${
                          selectedFileIdx === idx
                            ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold'
                            : 'border border-transparent text-zinc-450 hover:bg-[#0c0c12]'
                        }`}
                      >
                        <span className="font-mono text-zinc-600 mt-0.5">📂</span>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-mono text-[11px]">{file.path}</span>
                          <span className="block text-[9px] text-zinc-550 truncate mt-0.5">{file.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor Content Area */}
                <div className="md:col-span-8 flex flex-col bg-[#030303] text-zinc-300 min-h-0">
                  <div className="border-b border-[#1a1a1a]/40 bg-zinc-950/20 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                    <span className="text-[10px] text-zinc-500">{builderOutput.files[selectedFileIdx].path}</span>
                    <span className="text-[9px] uppercase font-bold text-zinc-500 px-1.5 py-0.5 bg-zinc-900/60 border border-zinc-800 rounded">
                      {builderOutput.files[selectedFileIdx].language}
                    </span>
                  </div>
                  
                  {/* File Code Display */}
                  <div className="p-6 flex-1 overflow-auto font-mono text-[11px] leading-relaxed text-zinc-350 bg-black/40">
                    <pre className="whitespace-pre">
                      {builderOutput.files[selectedFileIdx].content}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Database Relational Visualizer Tab */}
            {activeTab === 'database' && (
              <SchemaVisualizer files={builderOutput?.files || []} />
            )}

            {/* Deployments & Pipelines History Tab */}
            {activeTab === 'deployments' && (
              <div className="bg-[#07070a]/90 border border-[#1a1a1a]/40 rounded-2xl p-6 h-full overflow-y-auto space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Pipelines & Git Commits Logs</h3>
                  <p className="text-xs text-zinc-500 mt-1">Review active branch status, setup guides, and repository deployments details.</p>
                </div>

                {builderOutput && (
                  <div className="grid gap-6 md:grid-cols-2 font-mono text-xs">
                    {/* Setup commands cards */}
                    <div className="bg-black/35 rounded-xl border border-zinc-900 p-5 space-y-3">
                      <h4 className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-900 pb-2">Scaffolding Instructions</h4>
                      <div className="space-y-2.5 text-zinc-300 leading-normal">
                        {builderOutput.setup_instructions.map((inst, idx) => (
                          <div key={idx} className="bg-zinc-950/60 p-2.5 rounded border border-zinc-900/50">
                            {inst}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Architectural metrics card */}
                    <div className="bg-black/35 rounded-xl border border-zinc-900 p-5 space-y-4">
                      <h4 className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-900 pb-2">Forge Analysis Metrics</h4>
                      <ul className="list-disc list-inside space-y-2 text-zinc-400 leading-relaxed font-medium">
                        {builderOutput.suggested_improvements.map((imp, idx) => (
                          <li key={idx} className="marker:text-indigo-400">{imp}</li>
                        ))}
                      </ul>
                      <div className="border-t border-[#1a1a1a]/40 pt-4 flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500 uppercase font-bold">Linter Status:</span>
                        <span className="text-emerald-400 font-bold">✓ PASSING</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Git branch checklist list */}
                <div className="space-y-2.5">
                  <h4 className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider font-mono">Recent Branches History</h4>
                  {pastBuilds.length === 0 ? (
                    <p className="text-xs text-zinc-600 font-mono">No repository logs found.</p>
                  ) : (
                    <div className="space-y-2">
                      {pastBuilds.map((build) => (
                        <div
                          key={build.id}
                          className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 flex items-center justify-between text-xs"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-zinc-300 font-semibold leading-normal font-mono">{build.spec}</span>
                            <span className="text-[10px] text-zinc-550 font-mono">Run ID: {build.id}</span>
                          </div>
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 font-mono text-[10px] font-bold">
                            DEPLOYED
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fallback empty view when no output generated yet and not loading */}
            {!builderOutput && !loading && activeTab !== 'preview' && (
              <div className="absolute inset-0 bg-[#07070a]/90 border border-dashed border-[#1a1a1a]/40 rounded-2xl flex flex-col items-center justify-center text-center p-12 gap-3 text-zinc-650">
                <svg className="h-8 w-8 text-zinc-800 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-mono max-w-sm">No workspace compiled. Use the Prompt Chat on the left to trigger the agents and generate workspace files.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
