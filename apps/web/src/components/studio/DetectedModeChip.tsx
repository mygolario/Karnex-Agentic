'use client'

import React from 'react'
import type { ForgeMode } from '@/lib/studio/forge-types'

interface DetectedModeChipProps {
  detectedMode: Exclude<ForgeMode, 'auto'> | null
  reason?: string
  currentMode: ForgeMode
  onSwitch: (mode: Exclude<ForgeMode, 'auto'>) => void
}

const LABELS: Record<string, string> = {
  plan: 'Plan',
  ask: 'Ask',
  debug: 'Debug',
  build: 'Build',
}

export default function DetectedModeChip({
  detectedMode,
  reason,
  currentMode,
  onSwitch,
}: DetectedModeChipProps) {
  if (currentMode !== 'auto' || !detectedMode) return null

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#141417] bg-[#6366f1]/5">
      <span className="text-[11px] text-zinc-500">
        Detected: <span className="text-[#a5b4fc] font-medium">{LABELS[detectedMode]}</span>
        {reason ? ` — ${reason}` : ''}
      </span>
      <button
        type="button"
        onClick={() => onSwitch(detectedMode)}
        className="text-[11px] text-[#818cf8] hover:text-white underline"
      >
        Switch?
      </button>
    </div>
  )
}
