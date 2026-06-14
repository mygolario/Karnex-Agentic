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
  const [openRiskIdx, setOpenRiskIdx] = useState<number | null>(null)

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

      // Retrieve custom industry context from pain description stage (if saved)
      const { data: memoryData } = await supabase
        .from('founder_memory')
        .select('value')
        .eq('founder_id', user.id)
        .eq('namespace', 'onboarding')
        .eq('key', 'pain_context')
        .maybeSingle()

      const industryContext = (memoryData?.value as any)?.industry_context || 'SaaS'

      // 1. Create a startup row in startups table
      const { data: startup, error: startupErr } = await supabase
          .from('startups')
          .insert({
            founder_id: user.id,
            name: hypothesis.title,
            tagline: hypothesis.proposed_solution.slice(0, 100),
            description: hypothesis.problem_statement.slice(0, 500),
            industry: industryContext,
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

      // 4. Save selected hypothesis context to DB
      await supabase
          .from('founder_memory')
          .upsert({
            founder_id: user.id,
            namespace: 'onboarding',
            key: 'selected_hypothesis',
            value: {
              hypothesis: hypothesis,
              startupName: hypothesis.title,
              tagline: hypothesis.proposed_solution,
              industry: industryContext,
              targetAudience: hypothesis.target_audience,
              stage: 'ideation'
            }
          }, { onConflict: 'founder_id,namespace,key' })

      // 4b. Update founder onboarding step in founder_memory (to step 3)
      await supabase
          .from('founder_memory')
          .upsert({
            founder_id: user.id,
            namespace: 'onboarding',
            key: 'step',
            value: { step: 3 }
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
          body: JSON.stringify({ ideaId: idea.id, pre_generated: true })
        }),
        fetch(`/api/agents/icp-definer-v1/run`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ideaId: idea.id, pre_generated: true })
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
    // Generate list of detailed technical logs matching the current message index to show progress
    const mockLogs = [
      "SYS: Initializing secure pipeline to co-founder agent mesh...",
      `SYS: Signal received (Frustration data, length: ${runId ? "64-bit SHA" : "RAW"})...`,
      "AGENT-CORE: Spawning Pain-to-Product vector model node...",
      "AGENT-CORE: Setting dynamic parameters (temperatures: 0.25, threshold: 85%)...",
      "DATA-GRID: Querying market indexes & competitive databases...",
      "DATA-GRID: Evaluating pain intensity index against historic benchmarks...",
      "VALIDATOR: Calculating feasibility metrics (Buildability, Market Size, Pain Value)...",
      "VALIDATOR: Checking constraints (90-day time-to-MVP threshold)...",
      "SYNTHESIZER: Compiling 3 distinctive product hypothesis matrices...",
      "SYNTHESIZER: Calculating overall concept match vector alignment...",
      "SYS: final mappings resolved. serializing hypothesis outputs..."
    ];

    // Show logs up to currentMessageIndex * 2 + 3
    const visibleLogs = mockLogs.slice(0, currentMessageIndex * 2 + 3);

    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 px-4 animate-reveal">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
          .scanline-effect::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100px;
            background: linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.03), transparent);
            animation: scanline 4s linear infinite;
            pointer-events: none;
          }
        `}} />

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a] bg-[#050505] px-3.5 py-1 text-[11px] font-mono font-semibold text-[#6366f1] tracking-wider">
            <svg className="h-3 w-3 animate-spin text-[#6366f1]" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <span>02 // Spawning Hypotheses</span>
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
            Synthesizing Product Hypotheses
          </h2>
          <p className="text-sm text-[#a1a1a1] max-w-xl mx-auto">
            Converting raw frustrations into structured startup ideas by mapping competitive density and buildability metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Left panel: Logs terminal */}
          <div className="md:col-span-7 bg-[#0c0c0f]/40 backdrop-blur-xl border border-[#1a1a1a] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[380px] scanline-effect">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#6366f1]/20 to-transparent" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-3">
                <span className="text-[10px] font-bold text-[#525252] uppercase tracking-widest font-mono">
                  TELEMETRY LOGS // CONSOLE_01
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1]/70 animate-pulse" />
              </div>
              
              <div className="font-mono text-[11px] space-y-2 leading-relaxed text-[#737373]">
                {visibleLogs.map((log, index) => {
                  const isLast = index === visibleLogs.length - 1;
                  const isError = log.includes("ERR") || log.includes("FATAL");
                  const isOk = log.includes("SYS:") || log.includes("[OK]");
                  
                  return (
                    <div key={index} className={`flex items-start gap-2.5 transition-all duration-300 ${isLast ? 'text-[#e5e5e5] font-semibold' : ''}`}>
                      <span className="text-[#525252] shrink-0 select-none">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                      <span className={isError ? 'text-rose-400' : isOk ? 'text-emerald-400/90' : ''}>
                        {log}
                        {isLast && <span className="inline-block w-1.5 h-3 bg-[#6366f1] ml-1 animate-pulse" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex justify-between items-center text-[10px] font-mono text-[#525252]">
              <span>STATUS: PROCESSING_OPPORTUNITY_MATRIX</span>
              <span>INDEX: {currentMessageIndex + 1}/5</span>
            </div>
          </div>

          {/* Right panel: Modern Editorial Process Grid */}
          <div className="md:col-span-5 bg-[#0c0c0f]/40 backdrop-blur-xl border border-[#1a1a1a] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#6366f1]/20 to-transparent" />
            
            <div className="space-y-6">
              <div className="border-b border-[#1a1a1a] pb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#525252] uppercase tracking-widest font-mono">
                  MATRIX PIPELINE
                </span>
                <span className="text-[10px] font-mono text-[#6366f1]">ACTIVE_NODE</span>
              </div>

              <div className="space-y-4">
                {[
                  { name: "Opportunity Scanner", metric: "VECTOR_ALIGN", status: currentMessageIndex >= 1 ? "COMPLETED" : "PROCESSING" },
                  { name: "Market Volume Estimator", metric: "ICP_VOLUME_EST", status: currentMessageIndex >= 3 ? "COMPLETED" : currentMessageIndex >= 1 ? "PROCESSING" : "PENDING" },
                  { name: "Buildability Index Solver", metric: "MVP_TECH_FEAS", status: currentMessageIndex >= 4 ? "COMPLETED" : currentMessageIndex >= 3 ? "PROCESSING" : "PENDING" }
                ].map((node, nIdx) => (
                  <div key={nIdx} className={`p-4 rounded-xl border transition-colors duration-300 ${
                    node.status === "COMPLETED" ? "border-emerald-500/10 bg-emerald-500/[0.02]" :
                    node.status === "PROCESSING" ? "border-[#6366f1]/20 bg-[#6366f1]/[0.02]" :
                    "border-[#1a1a1a] opacity-55"
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-white font-mono tracking-tight">{node.name}</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        node.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
                        node.status === "PROCESSING" ? "bg-[#6366f1]/10 text-[#6366f1] animate-pulse" :
                        "bg-[#1a1a1a] text-[#525252]"
                      }`}>{node.status}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-[#525252]">
                      <span>METRIC: {node.metric}</span>
                      {node.status === "PROCESSING" && (
                        <div className="w-16 h-1 bg-[#161616] rounded-full overflow-hidden shrink-0 ml-2">
                          <div className="h-full bg-[#6366f1] rounded-full animate-pulse w-2/3" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#1a1a1a] text-center">
              <span className="text-[10px] font-mono text-[#525252]">
                RESOLVING VECTOR NODE: <span className="text-[#a1a1a1] font-semibold">{LOADING_MESSAGES[currentMessageIndex].text}</span>
              </span>
            </div>
          </div>
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
    <div className="space-y-8 animate-reveal">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-3xl font-bold tracking-[-0.02em] bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent font-display">
          Select Your Product Concept
        </h2>
        <p className="text-[#a1a1a1] text-sm">
          We analyzed your inputs and synthesized 3 distinct product concepts. Choose the hypothesis you wish to crystallize and build.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {hypotheses.map((hyp, index) => {
          const isRecommended = index === recommendedIndex
          const isSelected = index === selectedCardIndex
          const conceptIndex = `0${index + 1}`;
          const isRiskOpen = openRiskIdx === index;

          return (
            <div
              key={index}
              onClick={() => setSelectedCardIndex(index)}
              className={`relative flex flex-col justify-between p-6 rounded-2xl cursor-pointer transition-all duration-300 border ${
                isSelected
                  ? 'border-[#6366f1] bg-[#0c0c0f]/40 ring-1 ring-[#6366f1]/20 shadow-[0_0_30px_rgba(99,102,241,0.06)]'
                  : 'border-[#1a1a1a] bg-[#050505]/20 backdrop-blur-sm hover:border-[#262626] hover:bg-[#050505]/40'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-4 bg-[#050505] text-[#6366f1] text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border border-[#6366f1]/30 flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-[#6366f1] animate-pulse" />
                  Recommended Config
                </div>
              )}

              <div className="space-y-4">
                {/* Monospace index & Title */}
                <div>
                  <span className="text-[10px] font-mono text-[#525252] block mb-1">
                    CONCEPT_{conceptIndex} // STRATEGY_NODE
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
                    {hyp.title}
                  </h3>
                  <p className="text-[10px] text-[#6366f1] font-mono mt-1 uppercase tracking-wider">
                    TARGET: {hyp.target_audience}
                  </p>
                </div>

                {/* Description and Solution */}
                <div className="border-t border-[#1a1a1a] pt-3.5 mt-3 space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#525252] uppercase tracking-wider block">Problem Context</span>
                    <p className="text-[#a1a1a1] text-xs leading-relaxed font-sans">{hyp.problem_statement}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#6366f1]/90 uppercase tracking-wider block">Proposed Solution</span>
                    <p className="text-[#e5e5e5] text-xs leading-relaxed font-sans">{hyp.proposed_solution}</p>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-3 pt-4 border-t border-[#1a1a1a]">
                  <span className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">Feasibility Metrics</span>
                  
                  {/* Pain Intensity */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-[#a1a1a1]">
                      <span>PAIN_INTENSITY</span>
                      <span>{hyp.pain_intensity_score}%</span>
                    </div>
                    <div className="h-1 w-full bg-[#161616] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.pain_intensity_score}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Market Size */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-[#a1a1a1]">
                      <span>MARKET_SIZE</span>
                      <span>{hyp.market_size_score}%</span>
                    </div>
                    <div className="h-1 w-full bg-[#161616] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.market_size_score}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Buildability */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-[#a1a1a1]">
                      <span>BUILDABILITY</span>
                      <span>{hyp.buildability_score}%</span>
                    </div>
                    <div className="h-1 w-full bg-[#161616] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.buildability_score}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Overall Score */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-mono font-bold text-white">
                      <span>OVERALL_FIT</span>
                      <span className="text-[#6366f1]">{hyp.overall_score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#161616] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6366f1] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: animateBars ? `${hyp.overall_score}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer interactive components */}
              <div className="mt-6 pt-4 border-t border-[#1a1a1a]">
                <div className="flex justify-between items-center text-xs">
                  {/* Risks Disclosure Trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRiskIdx(isRiskOpen ? null : index);
                    }}
                    className="text-xs text-[#a1a1a1] hover:text-[#e5e5e5] flex items-center gap-1.5 transition-colors font-mono font-semibold"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-[#6366f1]/80" />
                    <span>// RISK SPECS</span>
                    <svg
                      width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                      className={`shrink-0 transition-transform duration-200 ${isRiskOpen ? 'rotate-90' : ''}`}
                    >
                      <path d="M6 12l4-4-4-4" />
                    </svg>
                  </button>

                  <div className="text-[#525252] text-[10px] font-mono">
                    MKT: {hyp.market_size_estimate}
                  </div>
                </div>

                {/* Risks expandable items */}
                <div className={`overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] ${isRiskOpen ? 'max-h-[140px] opacity-100 mt-3 pt-3 border-t border-[#1a1a1a]' : 'max-h-0 opacity-0'}`}>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[10px] text-[#737373]">
                    {hyp.key_risks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
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
            className="px-8 py-3.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-50 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2.5 text-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            {isSelecting ? (
              <>Crystallizing Workspace...</>
            ) : (
              <>
                Confirm Concept Selection
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
