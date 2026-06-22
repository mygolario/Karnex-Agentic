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
      icon: <Target className="h-3.5 w-3.5 font-bold" />,
      label: 'Build from ICP',
      tooltip: hasICP ? 'Auto-fill prompt from your ICP data' : 'No ICP data found in Vault',
      disabled: !hasICP,
      accent: 'text-purple-300 border-purple-900/80 bg-purple-950/20 hover:bg-purple-950/40 hover:border-purple-800',
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
      accent: 'text-blue-300 border-blue-900/80 bg-blue-950/20 hover:bg-blue-950/40 hover:border-blue-800',
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
      accent: 'text-amber-300 border-amber-900/80 bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-800',
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
      accent: 'text-emerald-300 border-emerald-900/80 bg-emerald-950/20 hover:bg-emerald-950/40 hover:border-emerald-850',
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
      accent: 'text-zinc-650 border-zinc-900 bg-zinc-950/30',
      onClick: () => {},
    },
  ]

  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto forge-scroll bg-zinc-950/10">
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={btn.onClick}
          disabled={btn.disabled}
          title={btn.tooltip}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold font-mono border transition-all whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
            btn.accent || 'text-zinc-400 border-zinc-900 bg-[#0e0e11] hover:bg-zinc-900 hover:text-white'
          }`}
        >
          {btn.icon}
          {btn.label}
        </button>
      ))}
    </div>
  )
}
