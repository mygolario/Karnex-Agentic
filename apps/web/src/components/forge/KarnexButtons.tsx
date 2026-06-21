'use client'

import React from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { useForgeContext } from '@/lib/studio/forge-context'
import {
  Target, Map, ShieldCheck, Archive, Rocket,
} from 'lucide-react'

interface KarnexButtonDef {
  id: string
  icon: React.ReactNode
  label: string
  tooltip: string
  disabled: boolean
  onClick: () => void
  accent?: string
}

export default function KarnexButtons() {
  const { karnexContext, triggerBuild } = useForgeContext()
  const builderOutput = useForgeStore((s) => s.builderOutput)
  const setDraft = useForgeStore((s) => s.setDraft)

  const hasICP = !!karnexContext.icp
  const hasOutput = !!builderOutput && builderOutput.files.length > 0

  const buttons: KarnexButtonDef[] = [
    {
      id: 'icp-build',
      icon: <Target className="h-3.5 w-3.5" />,
      label: 'Build from ICP',
      tooltip: hasICP ? 'Auto-fill prompt from your ICP data' : 'No ICP data found in Vault',
      disabled: !hasICP,
      accent: 'text-purple-400 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10',
      onClick: () => {
        if (!karnexContext.icp) return
        const prompt = `Build a web application for: ${karnexContext.icp.targetAudience}. ` +
          `Pain points: ${karnexContext.icp.painPoints.join(', ')}. ` +
          `Positioning: ${karnexContext.icp.positioning}.`
        setDraft(prompt)
      },
    },
    {
      id: 'roadmap-align',
      icon: <Map className="h-3.5 w-3.5" />,
      label: 'Align with Roadmap',
      tooltip: karnexContext.roadmapPhase ? 'Show current sprint tasks as suggestions' : 'No roadmap set',
      disabled: !karnexContext.roadmapPhase,
      accent: 'text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10',
      onClick: () => {
        if (!karnexContext.roadmapPhase) return
        setDraft(`Based on my current roadmap phase: "${karnexContext.roadmapPhase}", suggest and build the next feature I should implement.`)
      },
    },
    {
      id: 'mirror-check',
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      label: 'Mirror Agent Check',
      tooltip: hasOutput ? 'Run mirror analysis on current build' : 'Build something first',
      disabled: !hasOutput,
      accent: 'text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
      onClick: () => {
        triggerBuild('Challenge this implementation: identify potential issues, missing edge cases, security vulnerabilities, and UX improvements. Be brutally honest.')
      },
    },
    {
      id: 'vault-export',
      icon: <Archive className="h-3.5 w-3.5" />,
      label: 'Export to Vault',
      tooltip: hasOutput ? 'Save output to Vault namespace' : 'Build something first',
      disabled: !hasOutput,
      accent: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10',
      onClick: () => {
        // Placeholder — will connect to vault API
        console.log('Exporting to Vault...')
      },
    },
    {
      id: 'fundraise-export',
      icon: <Rocket className="h-3.5 w-3.5" />,
      label: 'Fundraising Export',
      tooltip: 'Coming soon — generate fundraising package',
      disabled: true,
      accent: 'text-zinc-500 border-zinc-700/30 bg-zinc-800/20',
      onClick: () => {},
    },
  ]

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto forge-scroll">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={btn.onClick}
          disabled={btn.disabled}
          title={btn.tooltip}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed ${btn.accent || 'text-zinc-400 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'}`}
        >
          {btn.icon}
          {btn.label}
        </button>
      ))}
    </div>
  )
}
