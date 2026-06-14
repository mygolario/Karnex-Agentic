'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'
import { Calendar, Check, CornerDownLeft, Loader2, ArrowRight } from 'lucide-react'

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

  // Keyboard shortcut: Cmd/Ctrl + Enter to proceed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (step === 1 && yesterday.trim()) {
          setStep(2)
        } else if (step === 2 && focus.trim()) {
          setStep(3)
        } else if (step === 3) {
          handleSubmit()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, yesterday, focus, blockers])

  // Already done today
  if (hasStandupToday && !summary) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 font-mono">
          <Check className="h-3.5 w-3.5" />
          STANDUP COMPLETED
        </span>
      </div>
    )
  }

  // After successful submission — show coaching message
  if (step === 'done' && summary) {
    return (
      <div
        className={`border border-[#1a1a1f] bg-[#070709] rounded-2xl p-5 flex gap-4 items-start transition-all duration-500 ${
          slideOut ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm font-semibold font-mono">
          AI
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-zinc-500 font-mono">
            CO-FOUNDER INTELLIGENCE DIRECTIVE
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed font-sans mt-1">
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

      const combinedUpdate = [
        `Yesterday's Work: ${yesterday.trim()}`,
        `Today's Focus: ${focus.trim()}`,
        `Active Blockers: ${blockers.trim() || 'None'}`
      ].join('\n')

      const response = await fetch(getAgentApiUrl('v1/agents/daily-standup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          founder_update: combinedUpdate,
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
        })
        .eq('id', founderId)

      setSummary(feedback)
      setStep('done')
      onStandupComplete?.(feedback)
    } catch (err) {
      console.error('Standup submission error:', err)
      const fallback = `Great work, ${founderName}. Keep pushing forward today!`
      setSummary(fallback)
      setStep('done')
      onStandupComplete?.(fallback)
    }
  }

  // Submitting state
  if (step === 'submitting') {
    return (
      <div className="border border-[#1a1a1f] bg-[#070709] rounded-2xl p-6 space-y-4 flex flex-col items-center justify-center py-10">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm text-zinc-300 font-medium">Analyzing Daily Check-in</p>
          <p className="text-xs text-zinc-500 font-mono">Running sentiment & goal alignment models...</p>
        </div>
      </div>
    )
  }

  // Wizard steps details
  const questions: Record<1 | 2 | 3, { q: string; optional?: boolean; placeholder: string; label: string }> = {
    1: {
      label: '01 / YESTERDAY',
      q: 'What did you get done yesterday?',
      placeholder: 'Refined landing page copy, interviewed 3 freelance designers, mapped competitors...',
    },
    2: {
      label: '02 / TODAY',
      q: "What's your primary focus today?",
      placeholder: 'Deploying the invoicing API schema, finishing design wireframes...',
    },
    3: {
      label: '03 / BLOCKERS',
      q: 'Are there any active blockers?',
      optional: true,
      placeholder: 'None. (or e.g., Waiting on Stripe API webhook keys...)',
    },
  }

  const currentQ = questions[step as 1 | 2 | 3]
  const currentValue = step === 1 ? yesterday : step === 2 ? focus : blockers
  const setCurrentValue = step === 1 ? setYesterday : step === 2 ? setFocus : setBlockers

  return (
    <div className="border border-[#1a1a1f] bg-[#070709] rounded-2xl p-5 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1f]/60">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-[0.06em] uppercase text-zinc-400 font-mono">
            DAILY STANDUP CHECK-IN
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'bg-indigo-500 w-3'
                  : s < (step as number)
                  ? 'bg-zinc-700'
                  : 'bg-zinc-900'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Input Form Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-indigo-400/80 tracking-wider">
            {currentQ.label}
          </span>
          {currentQ.optional && (
            <span className="text-[10px] text-zinc-500 font-mono">OPTIONAL</span>
          )}
        </div>
        <p className="text-sm font-semibold text-white">
          {currentQ.q}
        </p>
        <textarea
          ref={textareaRef}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder={currentQ.placeholder}
          rows={3}
          className="w-full bg-black/40 border border-[#1a1a1f] hover:border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-0 outline-none transition-all resize-none font-sans leading-relaxed"
        />
      </div>

      {/* Errors */}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/50 rounded-lg px-3.5 py-2 font-mono">
          {error}
        </p>
      )}

      {/* Navigation Row */}
      <div className="flex items-center justify-between pt-1">
        <div>
          {(step as number) > 1 ? (
            <button
              type="button"
              onClick={() => setStep(((step as number) - 1) as 1 | 2 | 3)}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors cursor-pointer"
            >
              ← Back
            </button>
          ) : (
            <div className="text-[10px] font-mono text-zinc-600 flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px]">Ctrl+Enter</kbd>
              <span>to send</span>
            </div>
          )}
        </div>

        {(step as number) < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !yesterday.trim()) return
              if (step === 2 && !focus.trim()) return
              setStep(((step as number) + 1) as 1 | 2 | 3)
            }}
            disabled={step === 1 ? !yesterday.trim() : step === 2 ? !focus.trim() : false}
            className="text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-35 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            Next
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
          >
            Submit Standup
            <CornerDownLeft className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}
