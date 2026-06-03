'use client'

import React, { useEffect, useState, useCallback } from 'react'
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
  if (score > 60) return { symbol: '↑', color: 'text-emerald-400' }
  if (score >= 40) return { symbol: '→', color: 'text-amber-400' }
  return { symbol: '↓', color: 'text-red-400' }
}

function getMomentumBarColor(score: number) {
  if (score > 60) return 'bg-emerald-400'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

function getCreditsColor(remaining: number, limit: number) {
  const pct = remaining / limit
  if (pct < 0.1) return 'text-red-400'
  if (pct < 0.25) return 'text-amber-400'
  return 'text-white'
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
  const arrow = getMomentumArrow(momentum)

  // Pulse animation on value change
  const triggerPulse = useCallback((key: 'momentum' | 'streak' | 'credits') => {
    setPulse(key)
    setTimeout(() => setPulse(null), 300)
  }, [])

  // Realtime: founders table (momentum + streak)
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

  // Realtime: subscriptions table (credits)
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

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Momentum Score */}
      <div className="flex-1 border border-[#1a1a1a] bg-[#050505] rounded-2xl p-5 space-y-3">
        <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">
          Momentum
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-[28px] font-bold font-mono transition-transform duration-200 ${getMomentumColor(momentum)} ${
              pulse === 'momentum' ? 'scale-110' : 'scale-100'
            }`}
          >
            {momentum}
          </span>
          <span className={`text-[18px] font-semibold ${arrow.color}`}>{arrow.symbol}</span>
        </div>
        <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${getMomentumBarColor(momentum)}`}
            style={{ width: `${Math.min(100, momentum)}%` }}
          />
        </div>
      </div>

      {/* Active Streak */}
      <div className="flex-1 border border-[#1a1a1a] bg-[#050505] rounded-2xl p-5 space-y-3">
        <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">
          Streak
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-[28px] font-bold font-mono text-white transition-transform duration-200 ${
              pulse === 'streak' ? 'scale-110' : 'scale-100'
            }`}
          >
            {streak}
          </span>
          <span className="text-[14px] text-[#525252]">days</span>
          {streak > 7 && <span className="text-[16px]">🔥</span>}
        </div>
        <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, (streak / 90) * 100)}%` }}
          />
        </div>
      </div>

      {/* Credits Remaining */}
      <div className="flex-1 border border-[#1a1a1a] bg-[#050505] rounded-2xl p-5 space-y-3">
        <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">
          Credits
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-[28px] font-bold font-mono transition-transform duration-200 ${getCreditsColor(creditsRemaining, creditsLimit)} ${
              pulse === 'credits' ? 'scale-110' : 'scale-100'
            }`}
          >
            {creditsRemaining}
          </span>
          <span className="text-[14px] text-[#525252]">left</span>
          {creditsRemaining < creditsLimit * 0.1 && (
            <span className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
              Low
            </span>
          )}
        </div>
        <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-700 ease-out"
            style={{ width: `${creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0}%` }}
          />
        </div>
        <p className="text-[11px] text-[#525252] font-mono">
          {creditsUsed} / {creditsLimit} used
        </p>
      </div>
    </div>
  )
}
