'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Bell, MessageSquare, Compass, ShieldAlert, Sparkles, Inbox } from 'lucide-react'

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
    "Your hypothesis is only as strong as the evidence behind it. Ship your discovery interview script today.",
    "Competitor research isn't about copying — it's about finding the gap they all missed.",
  ],
  2: [
    "Ship the ugliest version that works. Your first users care about function, not polish.",
    "Every feature you add is a feature you have to maintain. Stay ruthlessly minimal.",
    "Deploy early, deploy often. Feedback from real users beats internal testing every time.",
  ],
  3: [
    "Your first 10 customers are worth more than your next 1,000. Give them white-glove treatment.",
    "Price higher than you think. You can always offer a discount — you can't easily raise prices.",
    "Launch is a beginning, not an ending. The real work starts after Day 90.",
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

  const containerStyle = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
  }

  // Priority 1: Outreach reply
  if (recentReplies.length > 0) {
    const reply = recentReplies[0]
    return (
      <div
        className="border border-[#1a1a1f] bg-[#070709]/60 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-zinc-800"
        style={containerStyle}
      >
        <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500" />
        <div className="flex items-start gap-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Inbox className="w-4 h-4" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 font-mono">
              OUTREACH INTELLIGENCE
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed font-sans">
              <span className="text-white font-semibold">{reply.contact_name}</span> responded to your campaign!
            </p>
            <div className="pt-1">
              <a
                href="/vault"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors"
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
        className="border border-[#1a1a1f] bg-[#070709]/60 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-zinc-800"
        style={containerStyle}
      >
        <div className="absolute top-0 left-0 w-[3px] h-full bg-indigo-500" />
        <div className="flex items-start gap-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-[#6366f1]/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 font-mono">
              CO-FOUNDER MEMO DIRECTIVE
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed font-sans mt-1">
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
      className="border border-[#1a1a1f] bg-[#070709]/60 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-zinc-800"
      style={containerStyle}
    >
      <div className="absolute top-0 left-0 w-[3px] h-full bg-zinc-700" />
      <div className="flex items-start gap-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-950 border border-[#1a1a1f] text-zinc-500">
          <Compass className="w-4 h-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 font-mono">
            PHASE {phase} STRATEGY BRIEF
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed font-sans mt-1">
            {phaseTip}
          </p>
        </div>
      </div>
    </div>
  )
}
