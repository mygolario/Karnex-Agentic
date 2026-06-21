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
      <div className="flex flex-col h-full">
        <div className="px-3 py-3 border-b border-[#141417]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Build Pipeline</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
            <Zap className="h-4 w-4 text-zinc-600" />
          </div>
          <p className="text-[11px] text-zinc-600">Ready to build</p>
          <p className="text-[10px] text-zinc-700 mt-1">Describe your idea to begin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#141417] shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">Build Pipeline</span>
        {eta != null && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>~{eta}s remaining</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-3 pt-2 shrink-0">
        <div className="h-1 bg-zinc-800/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, ((activeStage + (loading ? 0.5 : 1)) / 6) * 100)}%` }}
          />
        </div>
      </div>

      {/* 6-Stage vertical pipeline */}
      <div className="flex-1 overflow-y-auto forge-scroll px-3 py-3">
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-zinc-800">
            <div
              className="w-full bg-gradient-to-b from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ height: `${Math.min(100, (activeStage / 5) * 100)}%` }}
            />
          </div>

          <div className="space-y-4 relative">
            {STAGES.map((stage, idx) => {
              const status = getStageStatus(idx, activeStage, currentRunStatus)
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${
                    status === 'active' ? 'forge-stage-active' :
                    status === 'complete' ? 'forge-stage-complete' :
                    status === 'error' ? 'forge-stage-error' : ''
                  }`}
                >
                  {/* Stage indicator */}
                  <div
                    className={`relative z-10 h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      status === 'complete' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      status === 'active' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' :
                      status === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                      'bg-zinc-900 text-zinc-600 border border-zinc-800'
                    }`}
                  >
                    {status === 'complete' && <CheckCircle2 className="h-3 w-3" />}
                    {status === 'active' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {status === 'error' && <XCircle className="h-3 w-3" />}
                    {status === 'pending' && <span className="text-[8px] font-mono">{idx + 1}</span>}
                  </div>

                  {/* Stage info */}
                  <div className="flex-1 min-w-0 pt-[2px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">{stage.emoji}</span>
                      <span className={`text-[11px] font-medium transition-colors ${
                        status === 'active' ? 'text-white' :
                        status === 'complete' ? 'text-zinc-300' :
                        status === 'error' ? 'text-rose-300' :
                        'text-zinc-500'
                      }`}>
                        {stage.label}
                      </span>
                    </div>

                    {/* Substages for code generation */}
                    {status === 'active' && stage.substages && (
                      <div className="mt-1.5 space-y-1 ml-1">
                        {stage.substages.map((sub, si) => (
                          <div key={si} className="flex items-center gap-1.5">
                            <span className={`h-[4px] w-[4px] rounded-full ${
                              si === 0 ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-700'
                            }`} />
                            <span className={`text-[9px] ${
                              si === 0 ? 'text-indigo-300' : 'text-zinc-600'
                            }`}>
                              {sub}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Duration for completed stages */}
                    {status === 'complete' && buildDuration != null && (
                      <span className="text-[9px] text-zinc-600 font-mono">
                        ~{Math.round(buildDuration / 6)}s
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Real-time activity feed */}
      {latestActivity && loading && (
        <div className="border-t border-[#141417] px-3 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-[5px] w-[5px] rounded-full bg-indigo-500 animate-pulse shrink-0" />
            <p className="text-[10px] text-zinc-400 truncate">
              {latestActivity.content}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
