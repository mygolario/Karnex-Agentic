'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'
import CodePanel from '@/components/forge/CodePanel'
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

interface ChatMessage {
  id: string
  sender: 'user' | 'builder' | 'system'
  message: string
  timestamp: Date
}

export default function StudioPage() {
  return (
    <ErrorBoundary>
      <StudioWorkspace />
    </ErrorBoundary>
  )
}

function StudioWorkspace() {
  const supabase = createSupabaseBrowserClient()

  // UI state
  const [advancedMode, setAdvancedMode] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<'code' | 'schema' | 'config'>('code')
  
  // Framework config state (Advanced tab)
  const [framework, setFramework] = useState('nextjs')
  const [styling, setStyling] = useState('tailwind')
  const [database, setDatabase] = useState('supabase')
  const [githubRepo, setGithubRepo] = useState('')

  // Building State
  const [loading, setLoading] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [currentRunStatus, setCurrentRunStatus] = useState<string>('idle')
  const [promptText, setPromptText] = useState('')
  const [builderOutput, setBuilderOutput] = useState<BuilderOutput | null>(null)
  const [selectedFileIdx, setSelectedFileIdx] = useState(0)

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'builder',
      message: "I've checked your schema. Ready to build the invoicing module. Describe what you want or click 'Go build this' to begin.",
      timestamp: new Date(),
    },
  ])

  // Build duration timer
  const [buildStartTime, setBuildStartTime] = useState<number | null>(null)
  const [buildDuration, setBuildDuration] = useState<number | null>(null)
  
  useEffect(() => {
    if (!loading || !buildStartTime) return
    const interval = setInterval(() => {
      setBuildDuration(Math.round((Date.now() - buildStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading, buildStartTime])

  // Polling for build agent status
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

        if (run) {
          setCurrentRunStatus(run.status)

          if (run.status === 'success') {
            clearInterval(interval)
            setLoading(false)
            fetchRunOutput(currentRunId)
            setChatMessages((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                sender: 'builder',
                message: 'Build completed successfully! Pushing features to your live branch. Preview is updated.',
                timestamp: new Date(),
              },
            ])
          } else if (run.status === 'error') {
            clearInterval(interval)
            setLoading(false)
            setChatMessages((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                sender: 'system',
                message: `❌ Build failed: ${run.error_message || 'Agent pipeline failure'}`,
                timestamp: new Date(),
              },
            ])
          }
        }
      } catch (err) {
        console.error('Error polling build status:', err)
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [currentRunId, currentRunStatus, supabase])

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
    } catch (err) {
      console.error('Error fetching build output:', err)
    }
  }

  // Trigger Builder Agent Run
  const handleTriggerBuild = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const spec = promptText.trim() || 'Build the invoicing module with invoice listing, form templates, total calculator, and responsive layouts.'
    setPromptText('')
    setLoading(true)
    setCurrentRunStatus('queued')
    setBuildStartTime(Date.now())
    setBuildDuration(0)
    setBuilderOutput(null)

    // Append user message
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        message: spec,
        timestamp: new Date(),
      },
      {
        id: Math.random().toString(),
        sender: 'system',
        message: 'Pipeline initializing. Building invoicing module assets in the background...',
        timestamp: new Date(),
      },
    ])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(getAgentApiUrl('v1/agents/builder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          task_type: 'scaffold_feature',
          specification: spec,
          tech_stack: {
            framework,
            styling,
            database,
          },
          github_repo: githubRepo || null,
        }),
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      setCurrentRunId(result.run_id)
      setCurrentRunStatus('running')

      // Mark the run status to running explicitly in db
      await supabase.from('agent_runs').update({
        status: 'running'
      }).eq('id', result.run_id)

    } catch (err: any) {
      console.error('Builder API error:', err)
      setLoading(false)
      setCurrentRunStatus('error')
      setChatMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'system',
          message: `❌ Failed to initialize builder: ${err.message || 'Check connection details.'}`,
          timestamp: new Date(),
        },
      ])
    }
  }

  // Action alerts
  const handleDeploy = () => alert('Deploying live to Production branch Vercel cluster...')
  const handleReviewCode = () => {
    setAdvancedMode(true)
    setActiveSubTab('code')
  }
  const handleSharePreview = () => {
    navigator.clipboard.writeText('https://folio-preview.vercel.app/invoicing')
    alert('✓ Copied preview link to clipboard!')
  }

  // Build steps mapping
  const buildSteps = [
    { label: 'Supabase table created', done: loading && currentRunStatus !== 'queued' },
    { label: 'API routes scaffolded', done: loading && currentRunStatus === 'running' },
    { label: 'Generating UI components...', done: loading && currentRunStatus === 'running' },
    { label: 'Running component tests', done: false },
    { label: 'Deploying branch preview', done: false },
  ]

  // Render dummy files for initial view
  const dummyFiles = builderOutput?.files || [
    {
      path: 'src/app/invoicing/page.tsx',
      content: `import React from 'react'\n\nexport default function Invoicing() {\n  return (\n    <div className="p-8">\n      <h1>Invoices</h1>\n    </div>\n  )\n}`,
      language: 'typescript',
      description: 'Main invoicing page React component'
    }
  ]

  return (
    <div className="mx-auto max-w-[1100px] pb-16 space-y-6 dash-reveal">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-6">
        <div>
          <h1 className="font-display font-bold text-[28px] text-white tracking-[-0.025em]">
            Studio Workspace
          </h1>
          <p className="text-[13px] text-[#737373] mt-1">
            Simplified Forge — CTO Over Your Shoulder
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className={`text-[12px] font-semibold px-4.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
              advancedMode 
                ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#818cf8]' 
                : 'bg-[#0a0a0a] border-[#1a1a1a] text-[#a1a1a1] hover:border-[#262626]'
            }`}
          >
            Advanced Mode
          </button>
        </div>
      </div>

      {/* Main Studio Console Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* LEFT COLUMN: CTO Chat dialogue */}
        <div className="border border-[#1a1a1a] bg-[#050505] rounded-2xl flex flex-col h-[520px]">
          
          {/* Chat Messages Console */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
            {chatMessages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-4 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender !== 'user' && (
                  <div className="h-9 w-9 shrink-0 rounded-full bg-[#6366f1]/10 text-[13px] font-bold text-[#6366f1] flex items-center justify-center">
                    🤖
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl p-4.5 text-[14px] leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-[#6366f1] text-white rounded-tr-none'
                    : msg.sender === 'system'
                    ? 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#737373] font-mono text-[12px]'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#e5e5e5] rounded-tl-none'
                }`}>
                  {msg.sender === 'builder' && (
                    <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#6366f1] mb-1.5">
                      Karnex says
                    </p>
                  )}
                  {msg.message}
                </div>
              </div>
            ))}
          </div>

          {/* Action Input form */}
          <div className="p-4 border-t border-[#1a1a1a] bg-[#050505] rounded-b-2xl">
            <form onSubmit={handleTriggerBuild} className="flex gap-2">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Modify invoicing layout or style preferences..."
                className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-[13px] placeholder-[#525252] text-[#e5e5e5] focus:border-[#6366f1] outline-none transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#312e81] text-white font-semibold text-[13px] px-5 py-3 rounded-xl transition-colors cursor-pointer"
              >
                {loading ? 'Building...' : 'Go — build this'}
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Live preview and timeline build */}
        <div className="border border-[#1a1a1a] bg-[#050505] rounded-2xl p-6 flex flex-col h-[520px]">
          
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4 mb-4">
            <h3 className="text-[13px] font-bold tracking-[0.06em] uppercase text-[#525252]">Live Preview</h3>
            <span className="text-[11px] font-mono text-[#737373]">folio-preview.vercel.app</span>
          </div>

          <div className="flex-1 relative bg-black border border-[#1a1a1a] rounded-xl overflow-hidden mb-5">
            {loading ? (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 space-y-6 z-10">
                <div className="space-y-1 text-center">
                  <h4 className="text-[15px] font-bold text-white tracking-tight flex items-center justify-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-ping" />
                    BUILDING IN PROGRESS...
                  </h4>
                  {buildDuration != null && (
                    <span className="text-[12px] text-[#525252] font-mono">Elapsed: {buildDuration}s</span>
                  )}
                </div>
                
                <div className="w-64 space-y-3">
                  {buildSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[12px]">
                      <span className={`h-4 w-4 shrink-0 rounded-full border text-[9px] flex items-center justify-center ${
                        step.done 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' 
                          : 'border-[#1a1a1a] text-[#525252]'
                      }`}>
                        {step.done ? '✓' : ''}
                      </span>
                      <span className={step.done ? 'text-[#a1a1a1]' : 'text-[#525252]'}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Deployed branch preview mock iframe */}
            <div className="w-full h-full bg-[#050505] p-6 text-center flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
                <span className="font-display font-semibold text-white text-[14px]">Folio Invoices</span>
                <span className="text-[11px] text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded">Preview</span>
              </div>
              
              <div className="py-10 space-y-3 max-w-sm mx-auto">
                <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-xl p-4 text-left flex justify-between items-center">
                  <div>
                    <p className="text-[13px] font-semibold text-white">INV-2026-001</p>
                    <p className="text-[11px] text-[#525252]">Client: Mia Chen</p>
                  </div>
                  <span className="text-[13px] font-bold text-emerald-400 font-mono">$19.00</span>
                </div>
                <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-xl p-4 text-left flex justify-between items-center opacity-40">
                  <div>
                    <p className="text-[13px] font-semibold text-white">INV-2026-002</p>
                    <p className="text-[11px] text-[#525252]">Client: Portland Brand</p>
                  </div>
                  <span className="text-[13px] font-bold text-[#525252] font-mono">$299.00</span>
                </div>
              </div>
              
              <span className="text-[11px] text-[#525252] font-mono">Iframe: vwvolsmukrfwrnbmxatc-invoicing.vercel.app</span>
            </div>

          </div>

          {/* Three Studio Action buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleDeploy}
              className="text-center font-bold text-[13px] text-white bg-[#6366f1] hover:bg-[#5558e6] py-3 rounded-xl transition-all cursor-pointer shadow"
            >
              Deploy
            </button>
            <button
              onClick={handleReviewCode}
              className="text-center font-bold text-[13px] text-[#a1a1a1] bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#262626] py-3 rounded-xl transition-all cursor-pointer"
            >
              Review Code
            </button>
            <button
              onClick={handleSharePreview}
              className="text-center font-bold text-[13px] text-[#a1a1a1] bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#262626] py-3 rounded-xl transition-all cursor-pointer"
            >
              Share Preview
            </button>
          </div>

        </div>

      </div>

      {/* BOTTOM COLLAPSIBLE PANEL: Advanced Mode specs */}
      {advancedMode && (
        <div className="border border-[#1a1a1a] bg-[#050505] rounded-2xl p-6 space-y-6 transition-all duration-300">
          
          {/* Advanced Mode Tabs */}
          <div className="flex gap-6 border-b border-[#1a1a1a] pb-4">
            <button
              onClick={() => setActiveSubTab('code')}
              className={`text-[13px] font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'code' ? 'text-white border-b-2 border-[#6366f1] pb-4 -mb-[18px]' : 'text-[#525252] hover:text-[#a1a1a1]'
              }`}
            >
              Generated Files
            </button>
            <button
              onClick={() => setActiveSubTab('schema')}
              className={`text-[13px] font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'schema' ? 'text-white border-b-2 border-[#6366f1] pb-4 -mb-[18px]' : 'text-[#525252] hover:text-[#a1a1a1]'
              }`}
            >
              Schema Visualizer
            </button>
            <button
              onClick={() => setActiveSubTab('config')}
              className={`text-[13px] font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'config' ? 'text-white border-b-2 border-[#6366f1] pb-4 -mb-[18px]' : 'text-[#525252] hover:text-[#a1a1a1]'
              }`}
            >
              Framework Configuration
            </button>
          </div>

          {/* Sub tab contents */}
          {activeSubTab === 'code' ? (
            <div className="h-[400px] overflow-hidden">
              <CodePanel
                files={dummyFiles}
                selectedFileIdx={selectedFileIdx}
                onSelectFile={setSelectedFileIdx}
              />
            </div>
          ) : activeSubTab === 'schema' ? (
            <div className="h-[400px] overflow-hidden">
              <SchemaVisualizer files={dummyFiles} />
            </div>
          ) : (
            <div className="max-w-xl space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">Framework</label>
                  <select 
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#e5e5e5] rounded-xl px-4 py-2.5 text-[13px] outline-none"
                  >
                    <option value="nextjs">Next.js 14+</option>
                    <option value="vite">Vite + React</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">CSS Styling</label>
                  <select 
                    value={styling}
                    onChange={(e) => setStyling(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#e5e5e5] rounded-xl px-4 py-2.5 text-[13px] outline-none"
                  >
                    <option value="tailwind">TailwindCSS 4</option>
                    <option value="css">Vanilla CSS Modules</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">Database Provider</label>
                  <select 
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#e5e5e5] rounded-xl px-4 py-2.5 text-[13px] outline-none"
                  >
                    <option value="supabase">Supabase Postgres</option>
                    <option value="prisma">Prisma ORM + PostgreSQL</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">GitHub Target Repository</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="https://github.com/myusername/my-karnex-app"
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#e5e5e5] rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[#6366f1]"
                />
                <p className="text-[12px] text-[#525252]">
                  The Builder Agent will compile code, commit, and push PRs directly to this repo if configured.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
