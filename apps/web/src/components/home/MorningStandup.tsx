'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

interface MorningStandupProps {
  founderId: string
  founderName: string
  hasStandupToday: boolean
  onStandupComplete?: (summary: string) => void
}

type StandupStep = 1 | 2 | 3 | 'submitting' | 'done'

export default function MorningStandup({
  founderId,
  founderName,
  hasStandupToday,
  onStandupComplete,
}: MorningStandupProps) {
  const supabase = createSupabaseBrowserClient()

  const [step, setStep] = useState<StandupStep>(1)
  const [yesterday, setYesterday] = useState('')
  const [focus, setFocus] = useState('')
  const [blockers, setBlockers] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [slideOut, setSlideOut] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Autofocus textarea on step change
  useEffect(() => {
    if (typeof step === 'number' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [step])

  // Already done today
  if (hasStandupToday && !summary) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Standup done
        </span>
      </div>
    )
  }

  // After successful submission — show coaching message
  if (step === 'done' && summary) {
    return (
      <div
        className={`border border-[#1a1a1a] bg-[#050505] rounded-2xl p-5 flex items-start gap-4 transition-all duration-500 ${
          slideOut ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/10 text-[18px]">
          💬
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">
            Karnex says
          </p>
          <p className="text-[14px] text-[#e5e5e5] leading-relaxed">
            {summary}
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setStep('submitting')
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated. Please refresh the page.')
        setStep(3)
        return
      }

      const response = await fetch(getAgentApiUrl('v1/agents/daily-standup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          founder_update: yesterday,
          today_focus: focus,
          blockers: blockers || 'None',
        }),
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      const feedback = result.synthesized_feedback || 'Standup logged. Keep the momentum going!'

      // Update DB
      const todayISO = new Date().toISOString()
      await supabase
        .from('founders')
        .update({
          last_standup_at: todayISO,
          momentum_score: Math.min(100, 58), // Server will compute the real value
        })
        .eq('id', founderId)

      setSummary(feedback)
      setStep('done')
      onStandupComplete?.(feedback)
    } catch (err) {
      console.error('Standup submission error:', err)
      // Graceful fallback
      const fallback = `Great work, ${founderName}. Keep pushing forward today!`
      setSummary(fallback)
      setStep('done')
      onStandupComplete?.(fallback)
    }
  }

  // Submitting state
  if (step === 'submitting') {
    return (
      <div className="border border-[#1a1a1a] border-l-2 border-l-[#6366f1] bg-[#050505] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#a1a1a1]">Karnex is analyzing your update…</p>
        </div>
        <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] animate-pulse w-2/3" />
        </div>
      </div>
    )
  }

  // Wizard steps
  const questions: Record<1 | 2 | 3, { q: string; optional?: boolean; placeholder: string }> = {
    1: {
      q: 'What did you get done yesterday?',
      placeholder: 'e.g., Conducted 3 customer interviews and refined pricing specs...',
    },
    2: {
      q: "What's your focus today?",
      placeholder: 'e.g., Build the invoicing module and map 5 competitors...',
    },
    3: {
      q: 'Any blockers?',
      optional: true,
      placeholder: 'e.g., Waiting on API keys from Stripe...',
    },
  }

  const currentQ = questions[step as 1 | 2 | 3]
  const currentValue = step === 1 ? yesterday : step === 2 ? focus : blockers
  const setCurrentValue = step === 1 ? setYesterday : step === 2 ? setFocus : setBlockers

  return (
    <div className="border border-[#1a1a1a] border-l-2 border-l-[#6366f1] bg-[#050505] rounded-2xl p-6 space-y-5">
      {/* Header + step dots */}
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#6366f1]">
          Today&apos;s Standup
        </h3>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                s <= (step as number)
                  ? 'bg-[#6366f1]'
                  : 'bg-[#1a1a1a]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="space-y-3 transition-all duration-300">
        <p className="text-[15px] text-white font-medium">
          {currentQ.q}
          {currentQ.optional && (
            <span className="text-[13px] text-[#525252] font-normal ml-1.5">(optional)</span>
          )}
        </p>
        <textarea
          ref={textareaRef}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder={currentQ.placeholder}
          rows={3}
          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-[14px] text-[#e5e5e5] placeholder-[#525252] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition-colors resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {(step as number) > 1 ? (
          <button
            type="button"
            onClick={() => setStep(((step as number) - 1) as 1 | 2 | 3)}
            className="text-[13px] text-[#525252] hover:text-[#a1a1a1] transition-colors cursor-pointer"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {(step as number) < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !yesterday.trim()) return
              if (step === 2 && !focus.trim()) return
              setStep(((step as number) + 1) as 1 | 2 | 3)
            }}
            disabled={step === 1 ? !yesterday.trim() : step === 2 ? !focus.trim() : false}
            className="text-[13px] font-medium text-white bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#262626] hover:bg-[#111] disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-xl transition-all cursor-pointer"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="text-[13px] font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] px-5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Submit standup
          </button>
        )}
      </div>
    </div>
  )
}
