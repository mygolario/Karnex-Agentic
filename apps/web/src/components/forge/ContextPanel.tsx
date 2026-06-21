'use client'

import React from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { useForgeContext } from '@/lib/studio/forge-context'
import {
  Target, Map, TrendingUp, Lightbulb, RefreshCw, Sparkles,
  ChevronDown, ChevronRight,
} from 'lucide-react'

export default function ContextPanel() {
  const { karnexContext, refreshKarnexContext, triggerBuild } = useForgeContext()
  const showContextPanel = useForgeStore((s) => s.showContextPanel)
  const setShowContextPanel = useForgeStore((s) => s.setShowContextPanel)
  const setDraft = useForgeStore((s) => s.setDraft)

  const hasICP = !!karnexContext.icp

  const handleBuildFromICP = () => {
    if (!karnexContext.icp) return
    const prompt = `Build a web application for: ${karnexContext.icp.targetAudience}. ` +
      `Key pain points to solve: ${karnexContext.icp.painPoints.join(', ')}. ` +
      `Positioning: ${karnexContext.icp.positioning}. ` +
      `Use dark theme with modern design.`
    setDraft(prompt)
  }

  const getMomentumColor = (score: number | null) => {
    if (!score) return 'text-zinc-500'
    if (score >= 80) return 'text-emerald-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-rose-400'
  }

  return (
    <div className="forge-glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setShowContextPanel(!showContextPanel)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Karnex Context
          </span>
        </div>
        {showContextPanel ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
        )}
      </button>

      {/* Collapsible content */}
      <div className={`forge-context-collapsed ${showContextPanel ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-300 ease-out`}>
        <div className="px-4 pb-4 space-y-3">

          {/* ICP Snapshot */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">ICP</span>
            </div>
            {hasICP ? (
              <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04] space-y-1">
                <p className="text-[11px] text-zinc-300 font-medium">{karnexContext.icp!.targetAudience}</p>
                <div className="flex flex-wrap gap-1">
                  {karnexContext.icp!.painPoints.slice(0, 3).map((p, i) => (
                    <span key={i} className="text-[9px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-600 italic">No ICP data found in Vault</p>
            )}
          </div>

          {/* Roadmap Phase */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Map className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Roadmap</span>
            </div>
            <p className="text-[11px] text-zinc-300">
              {karnexContext.roadmapPhase || <span className="text-zinc-600 italic">No roadmap set</span>}
            </p>
          </div>

          {/* Momentum Score */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Momentum</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${karnexContext.momentumScore || 0}%` }}
                />
              </div>
              <span className={`text-[11px] font-mono font-medium ${getMomentumColor(karnexContext.momentumScore)}`}>
                {karnexContext.momentumScore != null ? `${karnexContext.momentumScore}%` : '—'}
              </span>
            </div>
          </div>

          {/* Recent Decisions */}
          {karnexContext.recentDecisions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Recent Decisions</span>
              </div>
              <div className="space-y-1">
                {karnexContext.recentDecisions.slice(0, 3).map((d, i) => (
                  <p key={i} className="text-[10px] text-zinc-400 flex items-start gap-1.5">
                    <span className="text-zinc-700 mt-0.5 shrink-0">—</span>
                    <span className="line-clamp-1">{d}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => refreshKarnexContext()}
              className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded-lg py-1.5 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Update
            </button>
            {hasICP && (
              <button
                onClick={handleBuildFromICP}
                className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-lg py-1.5 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                Build from ICP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
