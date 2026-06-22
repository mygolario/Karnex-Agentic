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
    <div className="flex flex-col bg-zinc-950/20">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center justify-between border-b border-zinc-900/50 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
            Project Context
          </span>
        </div>
      </div>

      {/* Content panel */}
      <div className="p-4 space-y-4">

        {/* ICP Snapshot */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">
            <Target className="h-3 w-3 text-purple-400" />
            Target Audience (ICP)
          </div>
          {hasICP ? (
            <div className="bg-[#0b0b0d] rounded-lg p-3 border border-zinc-900/80 space-y-2">
              <p className="text-[11.5px] text-zinc-300 font-medium leading-relaxed">{karnexContext.icp!.targetAudience}</p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {karnexContext.icp!.painPoints.slice(0, 3).map((p, i) => (
                  <span key={i} className="text-[9px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/10 font-mono font-medium">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-650 italic pl-1">No ICP context established.</p>
          )}
        </div>

        {/* Roadmap Phase */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">
            <Map className="h-3 w-3 text-blue-400" />
            Roadmap Stage
          </div>
          <p className="text-[11.5px] text-zinc-300 font-medium bg-[#0b0b0d] rounded-lg p-3 border border-zinc-900/80 select-text leading-relaxed">
            {karnexContext.roadmapPhase || <span className="text-zinc-600 italic">No roadmap phase assigned</span>}
          </p>
        </div>

        {/* Momentum Score */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            Momentum index
          </div>
          <div className="bg-[#0b0b0d] rounded-lg p-3 border border-zinc-900/80 flex items-center justify-between gap-4">
            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${karnexContext.momentumScore || 0}%` }}
              />
            </div>
            <span className={`text-[11px] font-mono font-bold ${getMomentumColor(karnexContext.momentumScore)}`}>
              {karnexContext.momentumScore != null ? `${karnexContext.momentumScore}%` : '—'}
            </span>
          </div>
        </div>

        {/* Recent Decisions */}
        {karnexContext.recentDecisions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-bold">
              <Lightbulb className="h-3 w-3 text-amber-400" />
              Strategic Decisions
            </div>
            <div className="space-y-1.5 bg-[#0b0b0d] rounded-lg p-3 border border-zinc-900/80">
              {karnexContext.recentDecisions.slice(0, 3).map((d, i) => (
                <p key={i} className="text-[10.5px] text-zinc-400 flex items-start gap-2 leading-relaxed">
                  <span className="text-zinc-700 mt-1.5 shrink-0 h-1 w-1 rounded-full bg-zinc-650" />
                  <span>{d}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-zinc-900/40">
          <button
            onClick={() => refreshKarnexContext()}
            className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 bg-[#0e0e11] hover:bg-zinc-900 border border-zinc-900 rounded-lg py-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Sync
          </button>
          {hasICP && (
            <button
              onClick={handleBuildFromICP}
              className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-500/35 rounded-lg py-2 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              Build ICP
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

