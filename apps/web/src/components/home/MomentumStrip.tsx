'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Gauge, Flame, Zap, ArrowUpRight, Check } from 'lucide-react'

interface MomentumStripProps {
  founderId: string
  initialMomentum: number
  initialStreak: number
  initialCreditsUsed: number
  initialCreditsLimit: number
}

function getMomentumArrow(score: number) {
  if (score > 60) return { symbol: '↑', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Surging' }
  if (score >= 40) return { symbol: '→', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Stable' }
  return { symbol: '↓', color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Dropping' }
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

  // Mock days of the week check logs for streak
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const completedDays = [true, true, true, streak > 3, streak > 4, false, false]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      
      {/* Redesigned Momentum Card */}
      <div className="border border-[#1a1a1f] bg-[#070709]/60 rounded-2xl p-5 flex flex-col justify-between h-40 transition-all duration-200 hover:border-zinc-800">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-zinc-500" />
            FOUNDER VELOCITY
          </span>
          <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md border ${arrow.color}`}>
            {arrow.label} {arrow.symbol}
          </span>
        </div>

        <div className="space-y-2.5 mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold font-mono text-white transition-transform ${pulse === 'momentum' ? 'scale-110' : ''}`}>
              {momentum}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">/ 100 PTS</span>
          </div>

          {/* Clean Horizontal Meter */}
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
              <div 
                className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${momentum}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-550 leading-relaxed truncate">
              Velocity is computed from standups and task completions.
            </p>
          </div>
        </div>
      </div>

      {/* Redesigned Streak Card */}
      <div className="border border-[#1a1a1f] bg-[#070709]/60 rounded-2xl p-5 flex flex-col justify-between h-40 transition-all duration-200 hover:border-zinc-800">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-zinc-500" />
            CONSISTENCY STREAK
          </span>
          <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
            TOP 12%
          </span>
        </div>

        <div className="space-y-2.5 mt-2">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold font-mono text-white transition-transform ${pulse === 'streak' ? 'scale-110' : ''}`}>
              {streak}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">DAYS ACTIVE</span>
          </div>

          {/* Visual Daily Logging Checkboxes */}
          <div className="flex items-center gap-1.5">
            {daysOfWeek.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div 
                  className={`h-4 w-4 rounded flex items-center justify-center border text-[9px] transition-colors ${
                    completedDays[idx] 
                      ? 'bg-orange-500/10 border-orange-500/35 text-orange-400 font-bold' 
                      : 'bg-zinc-950 border-zinc-900 text-zinc-700'
                  }`}
                >
                  {completedDays[idx] ? <Check className="w-2.5 h-2.5" /> : day}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Redesigned Tasks & Credits Card */}
      <div className="border border-[#1a1a1f] bg-[#070709]/60 rounded-2xl p-5 flex flex-col justify-between h-40 transition-all duration-200 hover:border-zinc-800">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-zinc-500" />
            TELEMETRY CREDITS
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {creditsRemaining < creditsLimit * 0.15 ? 'LIMIT NEAR' : 'STARTER TIER'}
          </span>
        </div>

        <div className="space-y-2.5 mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold font-mono text-white transition-transform ${pulse === 'credits' ? 'scale-110' : ''}`}>
              {creditsRemaining}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">/ {creditsLimit} RUNS LEFT</span>
          </div>

          {/* Clean Linear progress meter */}
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
              <div 
                className="h-full rounded-full bg-indigo-500 transition-all duration-550"
                style={{ width: `${creditsPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-550 leading-relaxed">
              <span>{creditsUsed} RUNS CONSUMED</span>
              {creditsRemaining < creditsLimit * 0.25 ? (
                <a href="/billing" className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-0.5">
                  UPGRADE <ArrowUpRight className="w-2 h-2" />
                </a>
              ) : (
                <span>RESETS IN 18D</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}
