'use client'

import React, { useEffect, useMemo, useState } from 'react'

interface OutreachReply {
  contact_name: string
  campaign_id: string
}

interface CoachingInsightProps {
  phase: 1 | 2 | 3
  lastStandupSummary: string | null
  recentReplies: OutreachReply[]
}

const PHASE_TIPS: Record<1 | 2 | 3, string[]> = {
  1: [
    "Talk to 10 potential customers this week. Validation is about hearing 'I'd pay for this' — not just 'that sounds cool.'",
    'Your hypothesis is only as strong as the evidence behind it. Ship your discovery interview script today.',
    "Competitor research isn't about copying — it's about finding the gap they all missed.",
  ],
  2: [
    'Ship the ugliest version that works. Your first users care about function, not polish.',
    'Every feature you add is a feature you have to maintain. Stay ruthlessly minimal.',
    'Deploy early, deploy often. Feedback from real users beats internal testing every time.',
  ],
  3: [
    'Your first 10 customers are worth more than your next 1,000. Give them white-glove treatment.',
    "Price higher than you think. You can always offer a discount — you can't easily raise prices.",
    'Launch is a beginning, not an ending. The real work starts after Day 90.',
  ],
}

export default function CoachingInsight({
  phase,
  lastStandupSummary,
  recentReplies,
}: CoachingInsightProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Stabilize random tip by seeding with today's date
  const phaseTip = useMemo(() => {
    const tips = PHASE_TIPS[phase]
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    return tips[seed % tips.length]
  }, [phase])

  // Priority 1: Outreach reply
  if (recentReplies.length > 0) {
    const reply = recentReplies[0]
    return (
      <div
        className="forge-glass-card p-5 transition-all duration-500 shadow-2xl relative overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          borderLeft: '2.5px solid #10b981'
        }}
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur pointer-events-none" />
        
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            📬
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#52525c]">
              Outreach Intelligence
            </p>
            <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
              <span className="text-white font-semibold">{reply.contact_name}</span> responded to your campaign!
            </p>
            <div className="pt-1.5">
              <a
                href="/vault"
                className="text-[12px] text-[#6366f1] hover:text-[#818cf8] font-bold inline-flex items-center gap-1 transition-colors"
              >
                Review client reply →
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Priority 2: Last standup coaching message
  if (lastStandupSummary) {
    return (
      <div
        className="forge-glass-card p-5 transition-all duration-500 shadow-2xl relative overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          borderLeft: '2.5px solid #6366f1'
        }}
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-[#6366f1]/20">
            💬
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#52525c]">
              Co-Founder Feedback
            </p>
            <p className="text-[13px] text-[#e5e5e5] leading-relaxed font-sans">
              {lastStandupSummary}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Priority 3: Phase-based contextual tip
  return (
    <div
      className="forge-glass-card p-5 transition-all duration-500 shadow-2xl relative overflow-hidden animate-fade-in"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        borderLeft: '2.5px solid #27272a'
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 border border-[#1a1a1f] text-zinc-400">
          🧭
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#52525c]">
            Phase {phase} Strategy Tip
          </p>
          <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
            {phaseTip}
          </p>
        </div>
      </div>
    </div>
  )
}
