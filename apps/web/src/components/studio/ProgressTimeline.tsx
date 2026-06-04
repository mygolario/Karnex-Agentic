'use client'

import React from 'react'
import type { AgentRunLog } from '@/lib/studio/types'

const TYPE_LABELS: Record<string, string> = {
  mode_detected: 'Mode',
  plan_step: 'Plan',
  subagent_spawn: 'Spawn',
  subagent_progress: 'Progress',
  artifact: 'Artifact',
  approval_required: 'Approval',
  error: 'Error',
  log: 'Log',
}

interface ProgressTimelineProps {
  logs: AgentRunLog[]
  className?: string
}

export default function ProgressTimeline({ logs, className = '' }: ProgressTimelineProps) {
  const structured = logs.filter((l) => l.type && l.type !== 'log')
  const display = structured.length > 0 ? structured : logs.slice(-8)

  if (display.length === 0) return null

  return (
    <div className={`border-t border-[#141417] bg-[#050505]/90 max-h-[140px] overflow-y-auto ${className}`}>
      <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
        Progress feed
      </div>
      <ul className="px-2 pb-2 space-y-1">
        {display.map((log, i) => (
          <li
            key={`${log.timestamp}-${i}`}
            className="flex gap-2 text-[11px] leading-snug"
          >
            <span className="shrink-0 text-zinc-600 w-14 truncate">
              {log.type ? TYPE_LABELS[log.type] || log.type : log.sender}
            </span>
            <span className="text-zinc-400 flex-1">{log.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
