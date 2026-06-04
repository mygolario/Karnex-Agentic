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

const TYPE_STYLES: Record<string, { dot: string; ring: string; badge: string }> = {
  mode_detected: { 
    dot: 'bg-indigo-400', 
    ring: 'border-indigo-500/30 bg-indigo-950/40', 
    badge: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
  },
  plan_step: { 
    dot: 'bg-blue-400', 
    ring: 'border-blue-500/30 bg-blue-950/40', 
    badge: 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
  },
  subagent_spawn: { 
    dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]', 
    ring: 'border-cyan-500/40 bg-cyan-950/40 animate-pulse', 
    badge: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' 
  },
  subagent_progress: { 
    dot: 'bg-purple-400', 
    ring: 'border-purple-500/30 bg-purple-950/40', 
    badge: 'bg-purple-500/10 text-purple-300 border border-purple-500/20' 
  },
  artifact: { 
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]', 
    ring: 'border-emerald-500/40 bg-emerald-950/40', 
    badge: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
  },
  approval_required: { 
    dot: 'bg-amber-400 animate-ping', 
    ring: 'border-amber-500/50 bg-amber-950/60', 
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold' 
  },
  error: { 
    dot: 'bg-rose-500 animate-pulse', 
    ring: 'border-rose-500/60 bg-rose-950/60', 
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold' 
  },
  log: { 
    dot: 'bg-zinc-500', 
    ring: 'border-zinc-800 bg-zinc-900/60', 
    badge: 'bg-zinc-900 text-zinc-400 border border-zinc-800' 
  }
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
    <div className={`border-t border-[#141417] bg-[#030306]/95 max-h-[160px] overflow-y-auto flex flex-col min-h-0 select-none ${className}`}>
      {/* Header telemetry band */}
      <div className="sticky top-0 bg-[#030306]/98 backdrop-blur-md px-4 py-2 border-b border-[#141417] flex justify-between items-center z-10 shrink-0">
        <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-indigo-400/80">
          Telemetry Activity Stream
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[8.5px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
        </span>
      </div>

      {/* Timeline items body */}
      <div className="p-4 relative flex-1 min-h-0 overflow-y-auto">
        {/* Continuous vertical pipeline line */}
        <div className="absolute left-[23px] top-6 bottom-6 w-[1.5px] bg-zinc-900 pointer-events-none" />

        <ul className="space-y-4">
          {display.map((log, i) => {
            const isLast = i === display.length - 1
            const typeKey = log.type || 'log'
            const style = TYPE_STYLES[typeKey] || TYPE_STYLES['log']
            const label = TYPE_LABELS[typeKey] || log.sender || 'System'

            return (
              <li
                key={`${log.timestamp}-${i}`}
                className={`flex gap-4 items-start relative transition-all duration-300 ${isLast ? 'opacity-100 scale-[1.01]' : 'opacity-65 hover:opacity-90'}`}
              >
                {/* Timeline node */}
                <div className="relative shrink-0 flex items-center justify-center w-5 h-5 mt-0.5">
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${style.ring}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  </span>
                </div>

                {/* Event text content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    {/* Badge */}
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0 ${style.badge}`}>
                      {label}
                    </span>
                    {/* Timestamp */}
                    <span className="text-[8.5px] font-mono text-zinc-600 select-none">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''}
                    </span>
                  </div>
                  
                  {/* Message body */}
                  <p className="text-[11.5px] text-zinc-300 font-sans leading-relaxed font-normal break-words">
                    {log.message}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
