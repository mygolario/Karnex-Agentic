'use client'

import React, { useState } from 'react'
import { Compass, CheckCircle2, Circle, Clock } from 'lucide-react'

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
  { number: 1, label: 'Validate', days: '1 - 30', desc: 'Concept testing, competitor maps, ICP definition & landing page outreach.' },
  { number: 2, label: 'Build', days: '31 - 60', desc: 'Codebase scaffolding, schema design, Stripe/auth bindings & GitHub builds.' },
  { number: 3, label: 'Launch', days: '61 - 90', desc: 'Programmatic SEO, cold outreach sequences, sales proposals & scaling revenue.' },
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
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null)

  const name = founder.display_name || founder.full_name || 'Founder'
  const greeting = getGreeting()

  return (
    <div className="pb-6 border-b border-[#1a1a1f] space-y-6">
      {/* Top Banner: Greeting & Day Count */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-white leading-tight">
            {greeting}, {name}.
          </h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Let&apos;s build the next startup benchmark today.
          </p>
        </div>
        
        {/* Crisp Monospace Badge */}
        <div className="shrink-0 flex items-center gap-2.5 bg-[#09090b] border border-[#1a1a1f] rounded-lg px-4 py-2 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-zinc-400">
            DAY <span className="text-white font-bold">{dayNumber}</span> OF 90
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-indigo-400 font-bold">{progressPercent}% COMPLETE</span>
        </div>
      </div>

      {/* Redesigned Minimalist Progress Timeline */}
      <div className="bg-[#070709] border border-[#1a1a1f] rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.02), transparent 50%) pointer-events-none" />

        {/* Phase Progress Bar */}
        <div className="relative">
          {/* Main timeline line */}
          <div className="absolute top-[18px] left-8 right-8 h-[2px] bg-zinc-900" />
          
          {/* Active progress segment */}
          <div 
            className="absolute top-[18px] left-8 h-[2px] bg-indigo-500 transition-all duration-700 ease-out"
            style={{ width: `calc(${progressPercent}% - 16px)` }}
          />

          {/* Phase Nodes */}
          <div className="grid grid-cols-3 relative z-10">
            {PHASES.map((p) => {
              const isCompleted = currentPhase > p.number
              const isActive = currentPhase === p.number
              const isFuture = currentPhase < p.number

              return (
                <div 
                  key={p.number}
                  className="flex flex-col items-center cursor-pointer group"
                  onMouseEnter={() => setHoveredPhase(p.number)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  {/* Indicator Dot */}
                  <div 
                    className={`h-9 w-9 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                        : isActive
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                        : 'bg-zinc-950 border-[#1a1a1f] text-zinc-600 group-hover:border-zinc-800'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                    ) : (
                      <Circle className="w-3 h-3 fill-current" />
                    )}
                  </div>

                  {/* Node Label */}
                  <div className="mt-3 text-center">
                    <span 
                      className={`text-[12px] font-semibold tracking-wide uppercase transition-colors duration-200 block ${
                        isActive 
                          ? 'text-white font-bold' 
                          : isCompleted 
                          ? 'text-zinc-400' 
                          : 'text-zinc-600 group-hover:text-zinc-500'
                      }`}
                    >
                      PHASE {p.number}: {p.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                      Days {p.days}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dynamic Context Detail Card at bottom */}
        <div className="mt-5 pt-4 border-t border-[#1a1a1f] flex items-center justify-between text-xs text-zinc-400">
          {hoveredPhase ? (
            <div className="w-full flex items-baseline gap-2 animate-forge-msg-enter">
              <span className="font-semibold text-white">Phase {hoveredPhase} Focus:</span>
              <span className="text-zinc-500 leading-normal">{PHASES[hoveredPhase - 1].desc}</span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="leading-relaxed text-zinc-500">
                Active Phase Focus: <span className="text-white font-semibold">{PHASES[currentPhase - 1].label}</span> — {PHASES[currentPhase - 1].desc}
              </span>
              <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full shrink-0">
                Active
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
