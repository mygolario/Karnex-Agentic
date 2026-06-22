'use client'

import React, { useEffect, useState } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import {
  Search, Cpu, Palette, Zap, Code2,
  TestTube2, Rocket, CheckCircle2, XCircle, Clock,
  Loader2,
} from 'lucide-react'

interface StageConfig {
  icon: React.ReactNode
  label: string
  emoji: string
  substages?: string[]
}

const STAGES: StageConfig[] = [
  {
    icon: <Search className="h-3.5 w-3.5" />,
    label: 'Crystallizing intent',
    emoji: '🔍',
  },
  {
    icon: <Cpu className="h-3.5 w-3.5" />,
    label: 'Blueprinting architecture',
    emoji: '🏗️',
  },
  {
    icon: <Palette className="h-3.5 w-3.5" />,
    label: 'Pre-generating visual assets',
    emoji: '🎨',
  },
  {
    icon: <Code2 className="h-3.5 w-3.5" />,
    label: 'Generating code',
    emoji: '⚙️',
    substages: ['Foundation', 'Data layer', 'UI components', 'Integration', 'Quality pass'],
  },
  {
    icon: <TestTube2 className="h-3.5 w-3.5" />,
    label: 'Testing & self-healing',
    emoji: '🧪',
  },
  {
    icon: <Rocket className="h-3.5 w-3.5" />,
    label: 'Deploying',
    emoji: '🚀',
  },
]

function getStageStatus(stageIdx: number, currentStage: number, runStatus: string | null): 'pending' | 'active' | 'complete' | 'error' {
  if (runStatus === 'error') return stageIdx <= currentStage ? 'error' : 'pending'
  if (runStatus === 'success') return 'complete'
  if (stageIdx < currentStage) return 'complete'
  if (stageIdx === currentStage) return 'active'
  return 'pending'
}

export default function ForgeStatusBar() {
  const loading = useForgeStore((s) => s.loading)
  const currentStage = useForgeStore((s) => s.currentStage)
  const currentRunStatus = useForgeStore((s) => s.currentRunStatus)
  const buildDuration = useForgeStore((s) => s.buildDuration)
  const chatMessages = useForgeStore((s) => s.chatMessages)

  // ETA estimation — rough heuristic
  const estimatedTotal = 120 // seconds
  const eta = buildDuration != null && loading
    ? Math.max(0, estimatedTotal - buildDuration)
    : null

  // Derive active stage from chat messages when status changes
  const [derivedStage, setDerivedStage] = useState(0)

  useEffect(() => {
    if (!loading) {
      if (currentRunStatus === 'success') setDerivedStage(6)
      return
    }

    let maxStage = 0
    for (const msg of chatMessages) {
      const lower = msg.content.toLowerCase()
      if (lower.includes('crystallization') || lower.includes('intent spec')) maxStage = Math.max(maxStage, 0)
      if (lower.includes('architecture') || lower.includes('blueprint') || lower.includes('designing schema')) maxStage = Math.max(maxStage, 1)
      if (lower.includes('asset injection') || lower.includes('brand tokens') || lower.includes('visual')) maxStage = Math.max(maxStage, 2)
      if (lower.includes('code generation') || lower.includes('scaffolded') || lower.includes('generating')) maxStage = Math.max(maxStage, 3)
      if (lower.includes('testing') || lower.includes('compilation') || lower.includes('heal') || lower.includes('linter')) maxStage = Math.max(maxStage, 4)
      if (lower.includes('deployment') || lower.includes('committing') || lower.includes('github') || lower.includes('deploying')) maxStage = Math.max(maxStage, 5)
    }
    setDerivedStage(maxStage)
  }, [chatMessages, loading, currentRunStatus])

  const activeStage = currentStage > 0 ? currentStage : derivedStage

  // Latest activity message
  const latestActivity = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null

  if (!loading && currentRunStatus !== 'success' && currentRunStatus !== 'error') {
    // Minimal status bar when idle
    return (
      <div className="flex flex-col h-full bg-[#050507]">
        <div className="px-4 py-3 border-b border-zinc-900/50 bg-zinc-950/40">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Build Pipeline</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="h-9 w-9 rounded-xl border border-zinc-900 bg-zinc-950/80 flex items-center justify-center mb-3 text-zinc-550 shadow-md">
            <Zap className="h-4 w-4" />
          </div>
          <p className="text-[11.5px] font-medium text-zinc-400">Pipeline Standby</p>
          <p className="text-[10px] text-zinc-650 mt-1 max-w-[150px] leading-relaxed">Enter a prompt in the orchestrator to launch a build run.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#050507]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900/50 bg-zinc-950/40 shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold font-mono">Build Pipeline</span>
        {eta != null && (
          <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-550 font-mono font-medium">
            <Clock className="h-3 w-3 text-zinc-600" />
            <span>~{eta}s remaining</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3.5 shrink-0">
        <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, ((activeStage + (loading ? 0.5 : 1)) / 6) * 100)}%` }}
          />
        </div>
      </div>

      {/* 6-Stage vertical pipeline */}
      <div className="flex-1 overflow-y-auto forge-scroll px-4 py-4">
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-3.5 bottom-3.5 w-px bg-zinc-900">
            <div
              className="w-full bg-indigo-500 transition-all duration-700"
              style={{ height: `${Math.min(100, (activeStage / 5) * 100)}%` }}
            />
          </div>

          <div className="space-y-5 relative">
            {STAGES.map((stage, idx) => {
              const status = getStageStatus(idx, activeStage, currentRunStatus)
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3.5 ${
                    status === 'active' ? 'forge-stage-active' :
                    status === 'complete' ? 'forge-stage-complete' :
                    status === 'error' ? 'forge-stage-error' : ''
                  }`}
                >
                  {/* Stage indicator */}
                  <div
                    className={`relative z-10 h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      status === 'complete' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/25' :
                      status === 'active' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' :
                      status === 'error' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/25' :
                      'bg-[#0b0b0d] text-zinc-600 border border-zinc-900'
                    }`}
                  >
                    {status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {status === 'active' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {status === 'error' && <XCircle className="h-3.5 w-3.5" />}
                    {status === 'pending' && <div className="opacity-60 scale-75">{stage.icon}</div>}
                  </div>

                  {/* Stage info */}
                  <div className="flex-1 min-w-0 pt-[2px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11.5px] font-semibold transition-colors ${
                        status === 'active' ? 'text-white' :
                        status === 'complete' ? 'text-zinc-350' :
                        status === 'error' ? 'text-rose-350' :
                        'text-zinc-650'
                      }`}>
                        {stage.label}
                      </span>

                      {/* Duration for completed stages */}
                      {status === 'complete' && buildDuration != null && (
                        <span className="text-[9px] text-zinc-600 font-mono">
                          ~{Math.round(buildDuration / 6)}s
                        </span>
                      )}
                    </div>

                    {/* Substages for code generation */}
                    {status === 'active' && stage.substages && (
                      <div className="mt-2 space-y-1.5 pl-1.5 border-l border-zinc-900">
                        {stage.substages.map((sub, si) => (
                          <div key={si} className="flex items-center gap-2">
                            <span className={`h-1 w-1 rounded-full ${
                              si === 0 ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-800'
                            }`} />
                            <span className={`text-[9.5px] font-mono ${
                              si === 0 ? 'text-indigo-300' : 'text-zinc-600'
                            }`}>
                              {sub}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Real-time activity feed logs panel */}
      {latestActivity && loading && (
        <div className="border-t border-zinc-900 bg-zinc-950/60 p-3.5 shrink-0">
          <div className="flex items-start gap-2.5 ci-cd-terminal p-2.5 select-text text-[9.5px] text-zinc-400 leading-normal max-h-16 overflow-hidden">
            <span className="text-zinc-600 select-none shrink-0">$</span>
            <p className="font-mono flex-1 line-clamp-2">
              {latestActivity.content}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
