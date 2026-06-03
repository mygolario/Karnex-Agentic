'use client'

import React, { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { 
  Lightbulb, 
  Globe, 
  Sparkles, 
  BarChart3, 
  Rocket, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  HelpCircle 
} from 'lucide-react'

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

interface HypothesisStepProps {
  runId: string
  onSelect: (data: { ideaId: string; crystallizerRunId: string; icpRunId: string }) => void
}

const LOADING_MESSAGES = [
  { text: "Analyzing your pain signal...", icon: Lightbulb, color: "text-amber-400 bg-amber-400/10" },
  { text: "Grounding with market indicators...", icon: Globe, color: "text-cyan-400 bg-cyan-400/10" },
  { text: "Synthesizing product hypotheses...", icon: Sparkles, color: "text-violet-400 bg-violet-400/10" },
  { text: "Validating feasibility metrics...", icon: BarChart3, color: "text-emerald-400 bg-emerald-400/10" },
  { text: "Finalizing dream vector mappings...", icon: Rocket, color: "text-rose-400 bg-rose-400/10" }
]

export default function HypothesisStep({ runId, onSelect }: HypothesisStepProps) {
  const supabase = createSupabaseBrowserClient()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading')
  const [hypotheses, setHypotheses] = useState<ProductHypothesis[]>([])
  const [recommendedIndex, setRecommendedIndex] = useState<number>(0)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [animateBars, setAnimateBars] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null)

  // Polling run status
  useEffect(() => {
    if (!runId) return

    setStatus('loading')
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/agents/runs/${runId}`)
        if (!response.ok) {
          throw new Error('Failed to query run status')
        }
        
        const data = await response.json()
        if (data.run.status === 'success') {
          setStatus('success')
          clearInterval(interval)
          if (data.output && data.output.hypotheses) {
            setHypotheses(data.output.hypotheses)
            setRecommendedIndex(data.output.recommended_hypothesis ?? 0)
            setSelectedCardIndex(data.output.recommended_hypothesis ?? 0)
            // Trigger score bar animation slightly after cards mount
            setTimeout(() => setAnimateBars(true), 150)
          } else {
            setStatus('error')
            setError('The agent run completed but returned no hypotheses.')
          }
        } else if (data.run.status === 'error' || data.run.status === 'cancelled') {
          setStatus('error')
          setError(data.run.error_message || 'The AI Agent encountered an issue analyzing your input.')
          clearInterval(interval)
        }
      } catch (err: any) {
        console.warn('Network polling warning:', err)
      }
    }

    checkStatus()
    interval = setInterval(checkStatus, 2000)

    return () => clearInterval(interval)
  }, [runId])

  // Cycle loading messages
  useEffect(() => {
    if (status !== 'loading') return

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [status])

  // Handle selecting hypothesis card
  const handleSelectHypothesis = async (hypothesis: ProductHypothesis, index: number) => {
    setIsSelecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No active session found")
      const user = session.user
      const token = session.access_token

      // 1. Create a startup row in startups table
      const { data: startup, error: startupErr } = await supabase
        .from('startups')
        .insert({
          founder_id: user.id,
          name: hypothesis.title,
          tagline: hypothesis.proposed_solution.slice(0, 100),
          description: hypothesis.problem_statement.slice(0, 500),
          industry: 'SaaS',
          target_audience: hypothesis.target_audience.slice(0, 200),
          stage: 'ideation',
          is_active: true
        })
        .select()
        .single()

      if (startupErr || !startup) {
        throw new Error(`Failed to initialize startup profile: ${startupErr?.message}`)
      }

      // 2. Insert idea to ideas table with status = 'selected'
      const { data: idea, error: ideaErr } = await supabase
        .from('ideas')
        .insert({
          startup_id: startup.id,
          founder_id: user.id,
          title: hypothesis.title,
          pain_description: hypothesis.problem_statement,
          problem_statement: hypothesis.problem_statement,
          proposed_solution: hypothesis.proposed_solution,
          pain_intensity_score: hypothesis.pain_intensity_score,
          market_size_score: hypothesis.market_size_score,
          buildability_score: hypothesis.buildability_score,
          overall_score: hypothesis.overall_score,
          status: 'selected',
          selected_at: new Date().toISOString()
        })
        .select()
        .single()

      if (ideaErr || !idea) {
        throw new Error(`Failed to save selected hypothesis: ${ideaErr?.message}`)
      }

      // 3. Update founder current startup ID
      const { error: founderErr } = await supabase
        .from('founders')
        .update({ current_startup_id: startup.id })
        .eq('id', user.id)

      if (founderErr) {
        console.warn('Could not link startup to founder record:', founderErr)
      }

      // 4. Update founder onboarding step in founder_memory (to step 2)
      await supabase
        .from('founder_memory')
        .upsert({
          founder_id: user.id,
          namespace: 'onboarding',
          key: 'step',
          value: { step: 2 }
        }, { onConflict: 'founder_id,namespace,key' })

      // 5. Trigger crystallizer and icp-definer runs in parallel via BFF
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }

      const [crystallizerRes, icpRes] = await Promise.all([
        fetch(`/api/agents/idea-crystallizer-v1/run`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ideaId: idea.id })
        }),
        fetch(`/api/agents/icp-definer-v1/run`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ideaId: idea.id })
        })
      ])

      if (!crystallizerRes.ok || !icpRes.ok) {
        console.warn('Failed to trigger downstream agent runs in parallel.')
      }

      const crystallizerData = await crystallizerRes.json()
      const icpData = await icpRes.json()

      // 6. Complete selection callback
      onSelect({
        ideaId: idea.id,
        crystallizerRunId: crystallizerData.run_id || '',
        icpRunId: icpData.run_id || ''
      })

    } catch (err: any) {
      console.error('Selection flow failed:', err)
      alert(`Failed to complete selection: ${err.message}`)
    } finally {
      setIsSelecting(false)
    }
  }

  // Render polling loading state
  if (status === 'loading') {
    const CurrentIcon = LOADING_MESSAGES[currentMessageIndex].icon
    const colorClass = LOADING_MESSAGES[currentMessageIndex].color

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-12 px-4 text-center">
        <div className="relative mb-8">
          {/* Subtle glowing ring decoration */}
          <div className="absolute inset-0 bg-violet-600/20 rounded-full blur-xl scale-125 animate-pulse" />
          
          <div className={`relative p-5 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl transition-all duration-500 transform ${colorClass}`}>
            <CurrentIcon className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-slate-100 mb-2 transition-all duration-300">
          Generating Startup Ideas
        </h3>
        
        <p className="text-slate-400 text-sm max-w-sm h-6 transition-all duration-300 font-medium tracking-wide">
          {LOADING_MESSAGES[currentMessageIndex].text}
        </p>

        {/* Dynamic cycling indicators */}
        <div className="flex gap-1.5 mt-8">
          {LOADING_MESSAGES.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentMessageIndex ? 'w-6 bg-violet-500' : 'w-1.5 bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-red-500/20 bg-red-950/10 rounded-2xl backdrop-blur-md max-w-lg mx-auto my-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-100 mb-2">Analysis Failed</h3>
        <p className="text-red-400 text-sm mb-6">{error || 'An unexpected error occurred during processing.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-red-900/50 hover:bg-red-800/60 text-red-200 text-sm font-semibold rounded-xl border border-red-500/30 transition-all active:scale-95"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Render hypotheses list
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Select Your Product Concept
        </h2>
        <p className="text-slate-400 text-sm">
          We analyzed your inputs and synthesized 3 distinct product concepts. Choose the hypothesis you wish to crystallize and build.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {hypotheses.map((hyp, index) => {
          const isRecommended = index === recommendedIndex
          const isSelected = index === selectedCardIndex

          return (
            <div
              key={index}
              onClick={() => setSelectedCardIndex(index)}
              className={`relative flex flex-col justify-between p-6 rounded-2xl cursor-pointer transition-all duration-300 border ${
                isSelected
                  ? 'border-violet-500/50 bg-slate-900/90 ring-2 ring-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.25)]'
                  : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700/80 hover:bg-slate-950/60'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg border border-violet-400/50 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-violet-200 animate-pulse" />
                  RECOMMENDED
                </div>
              )}

              <div className="space-y-4">
                {/* Title and Audience */}
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    {hyp.title}
                  </h3>
                  <p className="text-xs text-violet-400/80 font-medium mt-1 uppercase tracking-wider">
                    Target: {hyp.target_audience}
                  </p>
                </div>

                {/* Description and Solution */}
                <div className="space-y-2.5">
                  <div className="text-xs bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/40">
                    <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wide text-[10px]">Problem Context:</span>
                    <p className="text-slate-300 leading-relaxed text-[11px] line-clamp-3">
                      {hyp.problem_statement}
                    </p>
                  </div>
                  <div className="text-xs bg-violet-950/10 rounded-lg p-2.5 border border-violet-900/20">
                    <span className="font-semibold text-violet-400 block mb-0.5 uppercase tracking-wide text-[10px]">Proposed Solution:</span>
                    <p className="text-slate-300 leading-relaxed text-[11px] line-clamp-3">
                      {hyp.proposed_solution}
                    </p>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-2 pt-2 border-t border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Feasibility Metrics</span>
                  
                  {/* Pain Intensity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Pain Intensity</span>
                      <span className="text-slate-300">{hyp.pain_intensity_score}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.pain_intensity_score}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Market Size */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Market Size</span>
                      <span className="text-slate-300">{hyp.market_size_score}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.market_size_score}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Buildability */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Buildability</span>
                      <span className="text-slate-300">{hyp.buildability_score}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.buildability_score}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Overall Score */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-300 font-bold">
                      <span>Overall Match</span>
                      <span className="text-violet-400">{hyp.overall_score}/100</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.overall_score}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer interactive components */}
              <div className="mt-6 pt-4 border-t border-slate-800/40 flex items-center justify-between">
                {/* Risks Tooltip Trigger */}
                <div
                  className="relative cursor-pointer text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
                  onMouseEnter={() => setActiveTooltip(index)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500/80" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Risks</span>
                  
                  {activeTooltip === index && (
                    <div className="absolute bottom-full left-0 mb-2.5 w-64 bg-slate-950 border border-slate-800 text-white rounded-xl p-3 shadow-2xl z-50 animate-fade-in">
                      <div className="font-bold text-rose-400 text-[10px] uppercase tracking-wider mb-1.5">Key Vulnerabilities & Risks:</div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[10px]">
                        {hyp.key_risks.map((risk, i) => (
                          <li key={i}>{risk}</li>
                        ))}
                      </ul>
                      <div className="absolute top-full left-4 border-8 border-transparent border-t-slate-950" />
                    </div>
                  )}
                </div>

                <div className="text-slate-500 text-[10px]">
                  Market: {hyp.market_size_estimate}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedCardIndex !== null && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => handleSelectHypothesis(hypotheses[selectedCardIndex], selectedCardIndex)}
            disabled={isSelecting}
            className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-300 transform active:scale-95 shadow-[0_4px_25px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2 text-sm"
          >
            {isSelecting ? (
              <>Crystallizing Workspace...</>
            ) : (
              <>
                Select this idea
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
