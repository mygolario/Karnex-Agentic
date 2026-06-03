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
        className="border border-[#1a1a1a] border-l-2 border-l-emerald-500 bg-[#050505] rounded-2xl p-5 transition-all duration-500"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-[18px] shrink-0 mt-0.5">📬</span>
          <div className="min-w-0 space-y-1">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#525252]">
              New Reply
            </p>
            <p className="text-[14px] text-[#a1a1a1] leading-relaxed line-clamp-2">
              <span className="text-white font-medium">{reply.contact_name}</span> responded to
              your outreach.{' '}
              <a
                href="/vault"
                className="text-[13px] text-[#6366f1] hover:text-[#818cf8] font-medium inline-flex items-center gap-1 transition-colors"
              >
                Open reply →
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Priority 2: Last standup coaching message
  if (lastStandupSummary) {
    return (
      <div
        className="border border-[#1a1a1a] border-l-2 border-l-[#6366f1] bg-[#050505] rounded-2xl p-5 transition-all duration-500"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-[18px] shrink-0 mt-0.5">💬</span>
          <div className="min-w-0 space-y-1">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#525252]">
              Karnex says
            </p>
            <p className="text-[14px] text-[#a1a1a1] leading-relaxed line-clamp-2">
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
      className="border border-[#1a1a1a] border-l-2 border-l-[#333] bg-[#050505] rounded-2xl p-5 transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-[18px] shrink-0 mt-0.5">🧭</span>
        <div className="min-w-0 space-y-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#525252]">
            Phase {phase} Tip
          </p>
          <p className="text-[14px] text-[#a1a1a1] leading-relaxed line-clamp-2">
            {phaseTip}
          </p>
        </div>
      </div>
    </div>
  )
}
