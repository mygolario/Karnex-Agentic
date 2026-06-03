'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface ProductHypothesis {
  title: string
  problem_statement: string
  proposed_solution: string
  target_audience: string
  market_size_estimate: string
  pain_intensity_score: number
  market_size_score: number
  buildability_score: number
  overall_score: number
  key_risks: string[]
  next_steps: string[]
}

interface PainTransformerOutput {
  hypotheses: ProductHypothesis[]
  recommended_hypothesis: number
}

interface NewIdeaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type ModalStep = 'form' | 'running' | 'pick' | 'error'

export default function NewIdeaModal({ open, onClose, onSuccess }: NewIdeaModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [painInput, setPainInput] = useState('')
  const [industryContext, setIndustryContext] = useState('')
  const [step, setStep] = useState<ModalStep>('form')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [hypotheses, setHypotheses] = useState<ProductHypothesis[]>([])
  const [recommendedIndex, setRecommendedIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [startupId, setStartupId] = useState('')

  const reset = useCallback(() => {
    setPainInput('')
    setIndustryContext('')
    setStep('form')
    setErrorMessage(null)
    setRunId(null)
    setHypotheses([])
    setRecommendedIndex(0)
    setSelectedIndex(null)
    setSaving(false)
  }, [])

  useEffect(() => {
    if (!open) return

    async function loadStartup() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: startup } = await supabase
        .from('startups')
        .select('id')
        .eq('founder_id', session.user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (startup) setStartupId(startup.id)
    }

    loadStartup()
  }, [open, supabase])

  const handleClose = () => {
    if (step === 'running' || saving) return
    reset()
    onClose()
  }

  const pollRun = useCallback(
    async (id: string): Promise<PainTransformerOutput> => {
      const maxAttempts = 60
      for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`/api/agents/runs/${id}`)
        if (!response.ok) {
          throw new Error('Failed to check agent run status')
        }

        const data = await response.json()
        if (data.run?.status === 'success') {
          if (data.output?.hypotheses?.length) {
            return data.output as PainTransformerOutput
          }
          throw new Error('Agent completed but returned no hypotheses.')
        }

        if (data.run?.status === 'error' || data.run?.status === 'cancelled') {
          throw new Error(data.run?.error_message || 'Dream Engine run failed.')
        }

        await new Promise((r) => setTimeout(r, 2000))
      }
      throw new Error('Timed out waiting for Dream Engine results.')
    },
    []
  )

  const handleSubmitPain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (painInput.trim().length < 30) {
      setErrorMessage('Please enter at least 30 characters describing the pain.')
      setStep('error')
      return
    }
    if (!startupId) {
      setErrorMessage('No active startup found. Complete onboarding or create a startup in Settings.')
      setStep('error')
      return
    }

    setStep('running')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/agents/pain-transformer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pain_description: painInput.trim(),
          industry_context: industryContext.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to start Dream Engine.')
      }

      const data = await response.json()
      if (!data.run_id) throw new Error('No run ID returned from agent.')

      setRunId(data.run_id)
      const output = await pollRun(data.run_id)
      setHypotheses(output.hypotheses)
      const rec = output.recommended_hypothesis ?? 0
      setRecommendedIndex(rec)
      setSelectedIndex(rec)
      setStep('pick')
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('error')
    }
  }

  const handleSaveHypothesis = async () => {
    if (selectedIndex === null || !hypotheses[selectedIndex]) return

    setSaving(true)
    setErrorMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in.')

      const hyp = hypotheses[selectedIndex]

      const { error } = await supabase.from('ideas').insert({
        startup_id: startupId,
        founder_id: session.user.id,
        title: hyp.title,
        pain_description: painInput.trim(),
        problem_statement: hyp.problem_statement,
        proposed_solution: hyp.proposed_solution,
        pain_intensity_score: hyp.pain_intensity_score,
        market_size_score: hyp.market_size_score,
        buildability_score: hyp.buildability_score,
        overall_score: hyp.overall_score,
        status: 'hypothesis',
        generated_by: 'pain-transformer-v1',
        agent_run_id: runId,
        product_brief: {
          title: hyp.title,
          problem_statement: hyp.problem_statement,
          proposed_solution: hyp.proposed_solution,
          target_audience: hyp.target_audience,
          market_size_estimate: hyp.market_size_estimate,
        },
        icp_document: {
          target_audience: hyp.target_audience,
          key_risks: hyp.key_risks,
          next_steps: hyp.next_steps,
        },
      })

      if (error) throw error

      reset()
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save idea.')
      setStep('error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#1a1a1a] bg-[#050505] p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={handleClose}
          disabled={step === 'running' || saving}
          className="absolute top-4 right-4 text-[#525252] hover:text-[#a1a1a1] text-sm cursor-pointer disabled:opacity-40"
        >
          ✕
        </button>

        <div className="space-y-1 pr-8">
          <h3 className="font-display font-bold text-xl text-white">New Idea</h3>
          <p className="text-xs text-[#737373]">
            Run the Dream Engine on a new pain signal — saved as a hypothesis in your workspace.
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmitPain} className="space-y-4">
            <div className="space-y-2">
              <label className="muted-label">Raw customer frustrations</label>
              <textarea
                value={painInput}
                onChange={(e) => setPainInput(e.target.value)}
                placeholder="E.g., I spend 2 hours every week mapping client invoices to Stripe payments..."
                rows={5}
                className="dash-input"
                required
                minLength={30}
              />
            </div>
            <div className="space-y-2">
              <label className="muted-label">Industry context (optional)</label>
              <input
                type="text"
                value={industryContext}
                onChange={(e) => setIndustryContext(e.target.value)}
                placeholder="E.g., B2B SaaS, Fintech"
                className="dash-input"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleClose} className="dash-btn dash-btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={painInput.trim().length < 30}
                className="dash-btn dash-btn-primary"
              >
                Extract product wedge
              </button>
            </div>
          </form>
        ) : null}

        {step === 'running' ? (
          <div className="py-8 text-center space-y-3">
            <svg className="h-8 w-8 animate-spin text-[#6366f1] mx-auto" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <p className="text-[14px] text-[#a1a1a1]">Analyzing frustrations…</p>
            <p className="text-[12px] text-[#525252]">Dream Engine is generating hypotheses.</p>
          </div>
        ) : null}

        {step === 'pick' && hypotheses.length > 0 ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[#737373]">Choose a hypothesis to save:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {hypotheses.map((hyp, index) => {
                const isRec = index === recommendedIndex
                const selected = selectedIndex === index
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full text-left border rounded-xl p-3 transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#6366f1] bg-[#6366f1]/10'
                        : 'border-[#1a1a1a] hover:border-[#262626]'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-white">{hyp.title}</span>
                      {isRec ? (
                        <span className="text-[10px] uppercase text-[#6366f1] bg-[#6366f1]/10 px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[12px] text-[#525252] mt-1 line-clamp-2">{hyp.problem_statement}</p>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={handleClose} className="dash-btn dash-btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHypothesis}
                disabled={selectedIndex === null || saving}
                className="dash-btn dash-btn-primary"
              >
                {saving ? 'Saving…' : 'Save as hypothesis'}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'error' && errorMessage ? (
          <div className="space-y-4">
            <p className="text-[13px] text-red-400/90">{errorMessage}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={handleClose} className="dash-btn dash-btn-secondary">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('form')
                  setErrorMessage(null)
                }}
                className="dash-btn dash-btn-primary"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
