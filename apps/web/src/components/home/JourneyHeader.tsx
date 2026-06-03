'use client'

import React, { useEffect, useState } from 'react'

interface Founder {
  id: string
  full_name: string
  display_name: string | null
}

interface JourneyHeaderProps {
  founder: Founder
  currentPhase: 1 | 2 | 3
  progressPercent: number
  dayNumber: number
}

const PHASES = [
  { number: 1, label: 'Validate' },
  { number: 2, label: 'Build' },
  { number: 3, label: 'Launch' },
] as const

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function JourneyHeader({
  founder,
  currentPhase,
  progressPercent,
  dayNumber,
}: JourneyHeaderProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const name = founder.display_name || founder.full_name || 'Founder'
  const greeting = getGreeting()

  return (
    <div
      className="border-b border-[#1a1a1a] pb-6 space-y-5 transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
    >
      {/* Top row: Greeting + Day counter */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-[clamp(22px,3vw,30px)] leading-[1.15] tracking-[-0.025em] text-white">
            {greeting}, {name}.
          </h1>
        </div>
        <div className="shrink-0 flex items-center gap-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-full px-4 py-1.5">
          <span className="text-[14px] font-mono text-[#a1a1a1]">
            Day <span className="text-white font-semibold">{dayNumber}</span> of 90
          </span>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="space-y-3">
        {/* Phase labels row */}
        <div className="flex items-center gap-0">
          {PHASES.map((phase, i) => {
            const isCompleted = phase.number < currentPhase
            const isCurrent = phase.number === currentPhase
            const isFuture = phase.number > currentPhase

            return (
              <React.Fragment key={phase.number}>
                <div className="flex items-center gap-2">
                  {/* Phase dot */}
                  <div
                    className={`h-3 w-3 rounded-full border-2 transition-colors duration-300 ${
                      isCompleted
                        ? 'bg-emerald-400 border-emerald-400'
                        : isCurrent
                          ? 'bg-[#6366f1] border-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                          : 'bg-transparent border-[#333]'
                    }`}
                  />
                  {/* Phase label */}
                  <span
                    className={`text-[12px] font-bold tracking-[0.06em] uppercase whitespace-nowrap transition-colors duration-300 ${
                      isCompleted
                        ? 'text-emerald-400'
                        : isCurrent
                          ? 'text-[#6366f1]'
                          : 'text-[#525252]'
                    }`}
                  >
                    Phase {phase.number}: {phase.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < PHASES.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-3 rounded-full transition-colors duration-300 ${
                      isCompleted ? 'bg-emerald-400/40' : 'bg-[#1a1a1a]'
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
          {/* Percentage label */}
          <div className="flex justify-end mt-1">
            <span className="text-[12px] font-mono font-semibold text-[#6366f1]">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
