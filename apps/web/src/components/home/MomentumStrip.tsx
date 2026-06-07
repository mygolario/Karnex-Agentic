'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface MomentumStripProps {
  founderId: string
  initialMomentum: number
  initialStreak: number
  initialCreditsUsed: number
  initialCreditsLimit: number
}

function getMomentumColor(score: number) {
  if (score > 60) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function getMomentumArrow(score: number) {
  if (score > 60) return { symbol: '↑', color: 'text-emerald-400', label: 'Surging' }
  if (score >= 40) return { symbol: '→', color: 'text-amber-400', label: 'Stable' }
  return { symbol: '↓', color: 'text-red-400', label: 'Dropping' }
}

function getCreditsGlowColor(pct: number) {
  if (pct < 0.1) return 'rgba(239, 68, 68, 0.4)'
  if (pct < 0.3) return 'rgba(245, 158, 11, 0.4)'
  return 'rgba(99, 102, 241, 0.4)'
}

export default function MomentumStrip({
  founderId,
  initialMomentum,
  initialStreak,
  initialCreditsUsed,
  initialCreditsLimit,
}: MomentumStripProps) {
  const [momentum, setMomentum] = useState(initialMomentum)
  const [streak, setStreak] = useState(initialStreak)
  const [creditsUsed, setCreditsUsed] = useState(initialCreditsUsed)
  const [creditsLimit, setCreditsLimit] = useState(initialCreditsLimit)
  const [pulse, setPulse] = useState<'momentum' | 'streak' | 'credits' | null>(null)

  const supabase = createSupabaseBrowserClient()
  const creditsRemaining = Math.max(0, creditsLimit - creditsUsed)
  const creditsPercent = creditsLimit > 0 ? (creditsRemaining / creditsLimit) * 100 : 0
  const arrow = getMomentumArrow(momentum)

  // Pulse animation on value change
  const triggerPulse = useCallback((key: 'momentum' | 'streak' | 'credits') => {
    setPulse(key)
    setTimeout(() => setPulse(null), 300)
  }, [])

  // Realtime updates: founders
  useEffect(() => {
    const channel = supabase
      .channel('momentum-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'founders',
          filter: `id=eq.${founderId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          if (typeof payload.new.momentum_score === 'number') {
            setMomentum(payload.new.momentum_score)
            triggerPulse('momentum')
          }
          if (typeof payload.new.streak_days === 'number') {
            setStreak(payload.new.streak_days)
            triggerPulse('streak')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [founderId, supabase, triggerPulse])

  // Realtime updates: subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('credit-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `founder_id=eq.${founderId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          if (typeof payload.new.tasks_used_this_cycle === 'number') {
            setCreditsUsed(payload.new.tasks_used_this_cycle)
            triggerPulse('credits')
          }
          if (typeof payload.new.tasks_limit === 'number') {
            setCreditsLimit(payload.new.tasks_limit)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [founderId, supabase, triggerPulse])

  // SVG parameters for circular dials
  const radius = 32
  const strokeWidth = 5
  const circumference = 2 * Math.PI * radius

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Momentum Radial Dial Card */}
      <div className="forge-glass-card forge-border-glow p-5 flex flex-col justify-between h-44 transition-all duration-300">
        <div className="flex justify-between items-start">
          <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#71717a]">
            Momentum
          </p>
          <span className={`text-[12px] font-semibold uppercase tracking-wider ${arrow.color} bg-black/40 border border-[#1a1a1e] px-2 py-0.5 rounded`}>
            {arrow.label} {arrow.symbol}
          </span>
        </div>

        <div className="flex items-center gap-5 my-2">
          {/* Circular SVG Gauge */}
          <div className="relative w-[76px] h-[76px] shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="38"
                cy="38"
                r={radius}
                stroke="#0e0e11"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="38"
                cy="38"
                r={radius}
                stroke={momentum > 60 ? '#34d399' : momentum >= 40 ? '#fbbf24' : '#f87171'}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (momentum / 100) * circumference}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                style={{
                  filter: `drop-shadow(0 0 6px ${momentum > 60 ? 'rgba(52, 211, 153, 0.4)' : momentum >= 40 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(248, 113, 113, 0.4)'})`
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-[17px] font-mono font-bold text-white transition-transform ${pulse === 'momentum' ? 'scale-125' : 'scale-100'}`}>
                {momentum}
              </span>
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <p className="text-[13px] text-[#a1a1a1] leading-relaxed">
              Founder velocity is determined by daily task approvals and standup streak.
            </p>
            {momentum < 45 && (
              <Link
                href={`/studio?spec=${encodeURIComponent('Build a clean feature or map some pricing targets to rebuild momentum.')}`}
                className="text-[11px] text-[#818cf8] hover:text-white underline block truncate"
              >
                Suggested Task: Deploy Build →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Streak Fire Card */}
      <div className="forge-glass-card forge-border-glow p-5 flex flex-col justify-between h-44 transition-all duration-300">
        <div className="flex justify-between items-start">
          <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#71717a]">
            Active Streak
          </p>
          <span className="text-[11px] font-mono font-bold text-[#a855f7] bg-[#a855f7]/10 px-2 py-0.5 rounded">
            Day Streak
          </span>
        </div>

        <div className="flex items-center gap-5 my-2">
          {/* Animated Streak Fire Icon */}
          <div className="relative w-[76px] h-[76px] shrink-0 flex items-center justify-center bg-[#07070a] border border-[#1a1a1e] rounded-full shadow-inner group">
            <div className="absolute inset-0 rounded-full border border-dashed border-[#a855f7]/10 group-hover:animate-[spin_20s_linear_infinite]" />
            <div className={`text-[32px] transition-transform duration-300 ${pulse === 'streak' ? 'scale-125' : 'scale-100'} group-hover:scale-110`}>
              🔥
            </div>
            {streak > 5 && (
              <div className="absolute -inset-1 rounded-full border border-[#fbbf24]/30 animate-pulse pointer-events-none" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-bold font-mono text-white leading-none">{streak}</span>
              <span className="text-[13px] text-[#737373]">consecutive days</span>
            </div>
            <p className="text-[13px] text-[#a1a1a1] leading-normal">
              You are in the top 12% of founder consistency this week. Keep it up!
            </p>
          </div>
        </div>
      </div>

      {/* Concentric Credit Ring Card */}
      <div className="forge-glass-card forge-border-glow p-5 flex flex-col justify-between h-44 transition-all duration-300">
        <div className="flex justify-between items-start">
          <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#71717a]">
            Tasks & Credits
          </p>
          {creditsRemaining < creditsLimit * 0.15 ? (
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
              Limit Close
            </span>
          ) : (
            <span className="text-[11px] font-mono text-[#a1a1a1]">
              Starter Tier
            </span>
          )}
        </div>

        <div className="flex items-center gap-5 my-2">
          {/* Circular Credits Remaining Gauge */}
          <div className="relative w-[76px] h-[76px] shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="38"
                cy="38"
                r={radius}
                stroke="#0e0e11"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="38"
                cy="38"
                r={radius}
                stroke="var(--color-mode-build, #6366f1)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (creditsPercent / 100) * circumference}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                style={{
                  filter: `drop-shadow(0 0 6px ${getCreditsGlowColor(creditsPercent / 100)})`
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[17px] font-mono font-bold text-white leading-tight transition-transform ${pulse === 'credits' ? 'scale-125' : 'scale-100'}`}>
                {creditsRemaining}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#525252] leading-none">left</span>
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="text-[13px] text-[#e5e5e5] font-mono">
              <span className="text-white font-bold">{creditsUsed}</span> / {creditsLimit} tasks used
            </div>
            <p className="text-[12px] text-[#737373] leading-normal truncate">
              Resets next billing cycle.
            </p>
            {creditsRemaining < creditsLimit * 0.25 && (
              <a
                href="/billing"
                className="text-[11px] text-[#6366f1] hover:text-white underline block"
              >
                Upgrade Plan for Unlimited Tasks →
              </a>
            )}
          </div>
        </div>
      </div>
      
    </div>
  )
}
