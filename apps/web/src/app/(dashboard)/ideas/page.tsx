'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAgentApiUrl, readAgentError } from '@/lib/agent-service'

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

interface IdeaRecord {
  id: string
  title: string
  pain_description: string
  problem_statement: string
  proposed_solution: string
  pain_intensity_score: number
  market_size_score: number
  buildability_score: number
  overall_score: number
  status: 'hypothesis' | 'exploring' | 'validated' | 'rejected' | 'selected'
  product_brief: {
    title?: string
    problem_statement?: string
    proposed_solution?: string
    target_audience?: string
    market_size_estimate?: string
  } | null
  icp_document: {
    target_audience?: string
    key_risks?: string[]
    next_steps?: string[]
  } | null
  created_at: string
}

export default function IdeasPage() {
  return (
    <ErrorBoundary>
      <IdeasContent />
    </ErrorBoundary>
  )
}

function IdeasContent() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [startupId, setStartupId] = useState('')
  const [painInput, setPainInput] = useState('')
  const [ideas, setIdeas] = useState<IdeaRecord[]>([])
  
  const [generatedHypotheses, setGeneratedHypotheses] = useState<ProductHypothesis[] | null>(null)
  const [recommendedIndex, setRecommendedIndex] = useState<number | null>(null)

  const initPage = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      let activeStartupId = ''
      const { data: startup } = await supabase
        .from('startups')
        .select('id')
        .eq('founder_id', session.user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (startup) {
        activeStartupId = startup.id
        setStartupId(startup.id)
      }

      if (!activeStartupId) return

      const { data: ideasList } = await supabase
        .from('ideas')
        .select('*')
        .eq('startup_id', activeStartupId)
        .order('created_at', { ascending: false })

      if (ideasList) {
        setIdeas(ideasList as IdeaRecord[])
      }
    } catch (err) {
      console.error('Error initializing ideas page:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    initPage()
  }, [initPage])

  const handleExtractWedge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!painInput.trim()) return
    if (!startupId) {
      alert('Startup context is not initialized. Please verify settings.')
      return
    }

    try {
      setGenerating(true)
      setGeneratedHypotheses(null)
      setRecommendedIndex(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      const response = await fetch(getAgentApiUrl('v1/agents/pain-transformer'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pain_description: painInput
        })
      })

      if (!response.ok) {
        throw new Error(await readAgentError(response))
      }

      const result = await response.json()
      if (result && result.hypotheses) {
        setGeneratedHypotheses(result.hypotheses)
        setRecommendedIndex(result.recommended_hypothesis ?? 0)
      }
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to analyze pain inputs: ${message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveHypothesis = async (hyp: ProductHypothesis) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('ideas')
        .insert({
          startup_id: startupId,
          founder_id: session.user.id,
          title: hyp.title,
          pain_description: painInput,
          problem_statement: hyp.problem_statement,
          proposed_solution: hyp.proposed_solution,
          pain_intensity_score: hyp.pain_intensity_score,
          market_size_score: hyp.market_size_score,
          buildability_score: hyp.buildability_score,
          overall_score: hyp.overall_score,
          status: 'validated',
          product_brief: {
            title: hyp.title,
            problem_statement: hyp.problem_statement,
            proposed_solution: hyp.proposed_solution,
            target_audience: hyp.target_audience,
            market_size_estimate: hyp.market_size_estimate
          },
          icp_document: {
            target_audience: hyp.target_audience,
            key_risks: hyp.key_risks,
            next_steps: hyp.next_steps
          }
        })

      if (error) throw error

      setGeneratedHypotheses(null)
      setRecommendedIndex(null)
      setPainInput('')
      initPage()
    } catch (err) {
      console.error(err)
      alert('Failed to save validated idea to database.')
    }
  }

  const handleSelectIdea = async (ideaId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await supabase
        .from('ideas')
        .update({ status: 'validated' })
        .eq('founder_id', session.user.id)
        .eq('status', 'selected')

      const { error } = await supabase
        .from('ideas')
        .update({ status: 'selected' })
        .eq('id', ideaId)

      if (error) throw error

      router.push('/warroom')
    } catch (err) {
      console.error(err)
      alert('Failed to select active idea.')
    }
  }

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return
    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', ideaId)

      if (error) throw error
      initPage()
    } catch (err) {
      console.error(err)
      alert('Failed to delete idea.')
    }
  }

  const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[13px]">
        <span className="text-[#737373]">{label}</span>
        <span className="text-[#a1a1a1] font-medium">{value}%</span>
      </div>
      <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-8">
        <p className="section-label mb-3">Ideation</p>
        <h1 className="font-display font-bold text-[clamp(28px,3.5vw,36px)] leading-[1.15] tracking-[-0.025em] text-white">
          Dream Engine
        </h1>
        <p className="mt-2 text-[15px] leading-[1.7] text-[#737373] max-w-[600px]">
          Transform raw frustrations, daily annoyances, and customer complaints into validated product opportunities.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Pain Transformer Form */}
          <div className="dash-card p-6 space-y-5">
            <div>
              <h2 className="text-[16px] font-semibold text-white">
                Pain-to-Product Transformer
              </h2>
              <p className="text-[14px] text-[#737373] leading-[1.7] mt-1.5">
                Paste customer feedback, App Store complaints, or your own workflow bottlenecks. Our agents will extract software business opportunities.
              </p>
            </div>
            
            <form onSubmit={handleExtractWedge} className="space-y-4">
              <div className="space-y-2">
                <label className="muted-label">Raw Customer Frustrations</label>
                <textarea
                  value={painInput}
                  onChange={(e) => setPainInput(e.target.value)}
                  placeholder="E.g., I spend 2 hours every week mapping client invoices to Stripe payments. It should be automated..."
                  rows={5}
                  className="dash-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={generating || !painInput.trim()}
                className="w-full dash-btn dash-btn-primary py-3"
              >
                {generating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Analyzing frustrations...
                  </>
                ) : (
                  'Extract Product Wedge'
                )}
              </button>
            </form>
          </div>

          {/* AI Generated Candidates */}
          {generatedHypotheses && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#6366f1]" />
                <p className="section-label">Suggested Startup Wedges</p>
              </div>

              <div className="space-y-4">
                {generatedHypotheses.map((hyp, index) => {
                  const isRecommended = index === recommendedIndex
                  return (
                    <div 
                      key={index} 
                      className={`dash-card p-6 space-y-5 ${
                        isRecommended ? 'border-[#6366f1]/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-[16px] font-semibold text-white">{hyp.title}</h3>
                            {isRecommended && (
                              <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded">
                                Recommended
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-3 space-y-2">
                            <p className="text-[14px] text-[#a1a1a1] leading-[1.7]">
                              <span className="text-[#525252] font-medium">Problem —</span>{' '}
                              {hyp.problem_statement}
                            </p>
                            <p className="text-[14px] text-[#a1a1a1] leading-[1.7]">
                              <span className="text-[#525252] font-medium">Solution —</span>{' '}
                              {hyp.proposed_solution}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 font-display font-bold text-[24px] tracking-[-0.03em] text-white">
                          {hyp.overall_score}
                        </span>
                      </div>

                      {/* Score Bars */}
                      <div className="border-y border-[#1a1a1a] py-4 space-y-3">
                        <ScoreBar label="Pain intensity" value={hyp.pain_intensity_score} color="bg-gradient-to-r from-[#6366f1] to-[#a855f7]" />
                        <ScoreBar label="Market potential" value={hyp.market_size_score} color="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]" />
                        <ScoreBar label="Buildability" value={hyp.buildability_score} color="bg-gradient-to-r from-[#10b981] to-[#14b8a6]" />
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[13px] text-[#737373]">
                          <span className="text-[#525252]">Market —</span> {hyp.market_size_estimate}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSaveHypothesis(hyp)}
                          className="dash-btn dash-btn-primary text-[13px] px-4 py-2"
                        >
                          Validate & Save
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Validated Ideas */}
          <div className="space-y-5">
            <p className="section-label">Validated Hypotheses</p>
            
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : ideas.length > 0 ? (
              <div className="space-y-4">
                {ideas.map((idea) => {
                  const isSelected = idea.status === 'selected'
                  return (
                    <div 
                      key={idea.id} 
                      className={`dash-card p-6 space-y-4 ${
                        isSelected ? 'border-emerald-500/25' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-[15px] font-semibold text-white">{idea.title}</h3>
                            {isSelected && (
                              <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-2 space-y-1.5">
                            <p className="text-[14px] text-[#a1a1a1] leading-[1.6]">
                              <span className="text-[#525252]">Pain —</span> {idea.pain_description}
                            </p>
                            <p className="text-[14px] text-[#a1a1a1] leading-[1.6]">
                              <span className="text-[#525252]">Solution —</span> {idea.proposed_solution}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="font-display font-bold text-[20px] tracking-[-0.03em] text-white">
                            {idea.overall_score}
                          </span>
                          <button
                            onClick={() => handleDeleteIdea(idea.id)}
                            className="text-[#525252] hover:text-red-400 text-[13px] transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-[#1a1a1a] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-[13px] text-[#737373]">
                          <span className="text-[#525252]">ICP —</span>{' '}
                          {idea.icp_document?.target_audience || 'Not configured'}
                        </p>
                        
                        {!isSelected ? (
                          <button
                            type="button"
                            onClick={() => handleSelectIdea(idea.id)}
                            className="dash-btn dash-btn-secondary text-[13px] px-4 py-2"
                          >
                            Select for War Room →
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push('/warroom')}
                            className="dash-btn text-[13px] px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15"
                          >
                            Open War Room →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="dash-card p-16 text-center">
                <p className="text-[15px] text-[#525252]">No validated hypotheses yet. Add frustrations above to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Intelligence Score */}
          <div className="dash-card p-6 space-y-4">
            <p className="muted-label">Market Intelligence</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-[36px] tracking-[-0.03em] text-white">{ideas.length}</span>
              <span className="text-[14px] text-[#525252]">validated</span>
            </div>
            <div className="border-t border-[#1a1a1a] pt-4 space-y-3 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">Validation speed</span>
                <span className="text-[#a1a1a1]">Fast (24h)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">Competitive density</span>
                <span className="text-[#a1a1a1]">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">ICP definition</span>
                <span className="text-emerald-400">Complete</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="dash-card p-6 space-y-4">
            <p className="muted-label">Validation Checklist</p>
            <p className="text-[14px] text-[#737373] leading-[1.7]">
              Every hypothesis is evaluated across 4 critical parameters.
            </p>
            <ul className="space-y-3 text-[14px] pt-1">
              {[
                'Who suffers from the bottleneck?',
                'What is the current manual workaround?',
                'What is the unique technological unlock?',
                'What is the monetization engine?',
              ].map((q, i) => (
                <li key={i} className="flex items-start gap-3 text-[#a1a1a1]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#6366f1]/10 text-[#6366f1] text-[11px] font-medium mt-0.5">
                    {i + 1}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
