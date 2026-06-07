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
  const [visible, setVisible] = useState(false)
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const name = founder.display_name || founder.full_name || 'Founder'
  const greeting = getGreeting()

  // Calculate coordinates for the SVG timeline path
  const svgWidth = 600
  const phase1X = 50
  const phase2X = 300
  const phase3X = 550
  const centerY = 30

  // Calculate the current progress line X position
  let progressX = phase1X
  if (currentPhase === 1) {
    // Days 1-30 mapped to phase1X -> phase2X
    progressX = phase1X + ((dayNumber - 1) / 30) * (phase2X - phase1X)
  } else if (currentPhase === 2) {
    // Days 31-60 mapped to phase2X -> phase3X
    progressX = phase2X + ((dayNumber - 31) / 30) * (phase3X - phase2X)
  } else {
    // Days 61-90 mapped to phase2X -> phase3X
    progressX = phase2X + ((dayNumber - 31) / 60) * (phase3X - phase2X)
  }

  // Ensure bounds
  progressX = Math.max(phase1X, Math.min(phase3X, progressX))

  return (
    <div
      className="border-b border-[#1a1a1a] pb-6 space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {/* Top row: Greeting & Day Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[clamp(24px,3.5vw,32px)] leading-[1.15] tracking-[-0.03em] text-white">
            {greeting}, {name}.
          </h1>
          <p className="text-[13px] text-[#525252] mt-0.5">Let&apos;s build the next startup benchmark today.</p>
        </div>
        <div className="shrink-0 flex items-center gap-3 bg-[#08080a] border border-[#1a1a1a] rounded-full px-5 py-2 w-fit">
          <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-[forgePulseRing_2s_infinite]" />
          <span className="text-[13px] font-mono text-[#a1a1a1]">
            Day <span className="text-white font-bold">{dayNumber}</span> of 90
          </span>
        </div>
      </div>

      {/* SVG-based Premium Visual Timeline */}
      <div className="relative border border-[#1d1d22]/50 bg-[#060608] rounded-2xl p-5 overflow-hidden shadow-inner">
        <div className="absolute inset-0 forge-grid-bg opacity-[0.2] pointer-events-none" />

        <div className="w-full overflow-x-auto scrollbar-none">
          <div className="min-w-[600px] relative">
            <svg viewBox={`0 0 ${svgWidth} 60`} className="w-full h-16 select-none">
              <defs>
                <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background track line */}
              <line
                x1={phase1X}
                y1={centerY}
                x2={phase3X}
                y2={centerY}
                stroke="#121215"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Glowing active track line */}
              <line
                x1={phase1X}
                y1={centerY}
                x2={progressX}
                y2={centerY}
                stroke="url(#timelineGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#glow)"
              />

              {/* Day markers along the path (every 10 days) */}
              {Array.from({ length: 9 }).map((_, idx) => {
                const day = (idx + 1) * 10
                const percent = day / 90
                const tickX = phase1X + percent * (phase3X - phase1X)
                const isPassed = dayNumber >= day

                return (
                  <circle
                    key={day}
                    cx={tickX}
                    cy={centerY}
                    r={isPassed ? '2.5' : '1.5'}
                    fill={isPassed ? '#a855f7' : '#26262a'}
                  />
                )
              })}

              {/* Phase Node 1 */}
              <g
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPhase(1)}
                onMouseLeave={() => setHoveredPhase(null)}
              >
                <circle
                  cx={phase1X}
                  cy={centerY}
                  r={currentPhase >= 1 ? '10' : '8'}
                  fill={currentPhase >= 1 ? '#6366f1' : '#141416'}
                  stroke={currentPhase >= 1 ? 'rgba(255,255,255,0.1)' : '#26262a'}
                  strokeWidth="2"
                  filter={currentPhase === 1 ? 'url(#glow)' : ''}
                />
                <circle cx={phase1X} cy={centerY} r="4" fill="#ffffff" />
              </g>

              {/* Phase Node 2 */}
              <g
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPhase(2)}
                onMouseLeave={() => setHoveredPhase(null)}
              >
                <circle
                  cx={phase2X}
                  cy={centerY}
                  r={currentPhase >= 2 ? '10' : '8'}
                  fill={currentPhase >= 2 ? '#a855f7' : '#141416'}
                  stroke={currentPhase >= 2 ? 'rgba(255,255,255,0.1)' : '#26262a'}
                  strokeWidth="2"
                  filter={currentPhase === 2 ? 'url(#glow)' : ''}
                />
                {currentPhase >= 2 && <circle cx={phase2X} cy={centerY} r="4" fill="#ffffff" />}
              </g>

              {/* Phase Node 3 */}
              <g
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPhase(3)}
                onMouseLeave={() => setHoveredPhase(null)}
              >
                <circle
                  cx={phase3X}
                  cy={centerY}
                  r={currentPhase >= 3 ? '10' : '8'}
                  fill={currentPhase >= 3 ? '#ec4899' : '#141416'}
                  stroke={currentPhase >= 3 ? 'rgba(255,255,255,0.1)' : '#26262a'}
                  strokeWidth="2"
                  filter={currentPhase === 3 ? 'url(#glow)' : ''}
                />
                {currentPhase >= 3 && <circle cx={phase3X} cy={centerY} r="4" fill="#ffffff" />}
              </g>
            </svg>

            {/* Labels under the nodes */}
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#525252] px-2">
              {PHASES.map((p) => {
                const isCurrent = currentPhase === p.number
                const isCompleted = currentPhase > p.number

                return (
                  <div
                    key={p.number}
                    className="flex flex-col items-center w-28 text-center"
                    style={{
                      transform: hoveredPhase === p.number ? 'scale(1.05)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <span
                      className={`text-[12px] font-display transition-colors ${
                        isCurrent
                          ? 'text-[#6366f1] drop-shadow-[0_0_6px_rgba(99,102,241,0.3)]'
                          : isCompleted
                          ? 'text-emerald-400'
                          : 'text-[#404044]'
                      }`}
                    >
                      Phase {p.number}: {p.label}
                    </span>
                    <span className="text-[10px] text-[#404044] font-mono mt-0.5">Days {p.days}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Phase Details Card */}
        <div className="mt-4 pt-3 border-t border-[#131316] min-h-[50px] flex items-center justify-between">
          {hoveredPhase ? (
            <div className="w-full text-[13px] animate-fade-in">
              <span className="font-semibold text-white">Focus in Phase {hoveredPhase}:</span>{' '}
              <span className="text-[#a1a1a1] leading-relaxed">{PHASES[hoveredPhase - 1].desc}</span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between text-[13px] text-[#a1a1a1]">
              <span className="leading-relaxed">
                Active Phase: <span className="text-white font-semibold">{PHASES[currentPhase - 1].label}</span>. {PHASES[currentPhase - 1].desc.slice(0, 70)}...
              </span>
              <span className="font-mono font-bold text-[#a855f7] bg-[#a855f7]/10 px-2.5 py-0.5 rounded-full text-[11px]">
                {progressPercent}% Complete
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
