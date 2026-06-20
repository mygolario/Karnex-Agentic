'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/hooks/useOnboardingStore'
import { ArrowRight, ArrowLeft, Mic, MicOff, AlertCircle, Sparkles, RefreshCw, Check } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const VENTURE_STAGES = [
  { id: 'ideation', title: 'Just a Thought', desc: 'An unvalidated idea or spark that needs crystallization.' },
  { id: 'validation', title: 'Validated Problem', desc: 'Spoken to potential customers, confirmed the pain is real.' },
  { id: 'building', title: 'Building MVP', desc: 'Developing the initial version of the product.' },
  { id: 'launching', title: 'Early Users', desc: 'MVP is ready or launched with early non-paying users.' },
  { id: 'growing', title: 'Revenue Generating', desc: 'Have active paying customers, seeking to scale.' }
]

interface StageProps {
  onNext: () => void
  onPrev: () => void
  onUpdateWhy: (title: string, content: string) => void
}

export default function VentureStage({ onNext, onUpdateWhy, onPrev }: StageProps) {
  const { profile, updateProfile } = useOnboardingStore()
  const supabase = createSupabaseBrowserClient()

  // Branching state: 'undecided' | 'standard' | 'pain-dump'
  const [flowBranch, setFlowBranch] = useState<'undecided' | 'standard' | 'pain-dump'>('undecided')
  const [subStep, setSubStep] = useState(0)

  // Local input states
  const [ideaText, setIdeaText] = useState(profile.venture?.idea || '')
  const [painOriginText, setPainOriginText] = useState(profile.venture?.painOrigin || '')
  const [productNameText, setProductNameText] = useState(profile.venture?.productName || '')
  const [hasNameSelect, setHasNameSelect] = useState(profile.venture?.hasName || false)
  const [domainText, setDomainText] = useState(profile.venture?.domain || '')
  const [isListening, setIsListening] = useState(false)
  const [listeningTarget, setListeningTarget] = useState<'idea' | 'pain' | null>(null)

  // Pain Dump States
  const [painDumpText, setPainDumpText] = useState('')
  const [painDumpIndustry, setPainDumpIndustry] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genLogs, setGenLogs] = useState<string[]>([])
  const [generatedOpportunities, setGeneratedOpportunities] = useState<any[]>([])
  const [selectedOppIdx, setSelectedOppIdx] = useState<number | null>(null)
  const [pollingRunId, setPollingRunId] = useState<string | null>(null)

  // Side-effect to update profile state on local changes
  useEffect(() => {
    updateProfile({
      venture: {
        ...profile.venture,
        idea: ideaText,
        painOrigin: painOriginText,
        productName: productNameText,
        hasName: hasNameSelect,
        domain: domainText,
        stage: profile.venture?.stage || 'ideation'
      } as any
    })
  }, [ideaText, painOriginText, productNameText, hasNameSelect, domainText])

  // Update floating sidebar explanation when step changes
  useEffect(() => {
    if (flowBranch === 'undecided') {
      onUpdateWhy(
        'Venture Dream Engine',
        'Karnex adapts to your progress. If you already have a product direction, we capture it. If you only have frustrations, we run the Pain-to-Product Transformer to discover moats.'
      )
    } else if (flowBranch === 'pain-dump') {
      onUpdateWhy(
        'Pain Dump Transformation',
        'Solo founders build best when solving problems they personally understand. Describe a frustration in detail, and our AI analyzes market gaps to output 3 distinct product opportunities.'
      )
    } else {
      switch (subStep) {
        case 0:
          onUpdateWhy(
            'The Concept',
            'Describe the core utility. This feeds the Idea Crystallizer (1.2) to construct your product memo and positioning strategy.'
          )
          break
        case 1:
          onUpdateWhy(
            'Pain Origin',
            'We map the founder-market fit. Understanding the personal friction behind the idea enables our Outreach agents to write highly authentic copy.'
          )
          break
        case 2:
          onUpdateWhy(
            'Stage & Name',
            'Your venture stage sets the start point of your 90-Day War Room roadmap. The name suggestion can be skipped if you want Karnex to suggest one later.'
          )
          break
      }
    }
  }, [flowBranch, subStep])

  // Speech Recognition hook
  const toggleSpeech = (target: 'idea' | 'pain') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Please type your entry.')
      return
    }

    if (isListening) {
      setIsListening(false)
      setListeningTarget(null)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setListeningTarget(target)
    }
    recognition.onend = () => {
      setIsListening(false)
      setListeningTarget(null)
    }
    recognition.onerror = () => {
      setIsListening(false)
      setListeningTarget(null)
    }
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      if (target === 'idea') {
        setIdeaText((prev) => (prev ? `${prev} ${transcript}` : transcript))
      } else if (target === 'pain') {
        setPainDumpText((prev) => (prev ? `${prev} ${transcript}` : transcript))
      }
    }
    recognition.start()
  }

  // Trigger Pain-to-Product agent run
  const handleGenerateOpportunities = async () => {
    if (painDumpText.length < 30) return

    setIsGenerating(true)
    setGeneratedOpportunities([])
    setSelectedOppIdx(null)
    setGenLogs(['Initializing Pain-to-Product agent...', 'Persisting pain context to memory...'])

    try {
      const response = await fetch('/api/agents/pain-transformer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pain_description: painDumpText,
          industry_context: painDumpIndustry || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to run agent')

      const data = await response.json()
      if (data.success && data.run_id) {
        setGenLogs((prev) => [...prev, 'Agent running... Querying market densities...', 'Analyzing competitive workarounds...'])
        setPollingRunId(data.run_id)
      } else {
        throw new Error('Invalid run ID returned')
      }
    } catch (err: any) {
      console.error(err)
      setGenLogs((prev) => [...prev, 'Error: Agent failed to start. Falling back...'])
      setIsGenerating(false)
    }
  }

  // Polling Pain Transformer Run Status
  useEffect(() => {
    if (!pollingRunId) return

    let active = true
    let pollCount = 0

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/agents/runs/${pollingRunId}`)
        if (!response.ok) return

        const data = await response.json()
        if (data.run?.status === 'success') {
          if (active) {
            setPollingRunId(null)
            setIsGenerating(false)
            if (data.output?.hypotheses) {
              setGeneratedOpportunities(data.output.hypotheses)
              setGenLogs((prev) => [...prev, 'Opportunities synthesized successfully! Please select one below.'])
            } else {
              setGenLogs((prev) => [...prev, 'Error: Agent completed but returned no results.'])
            }
          }
        } else if (data.run?.status === 'error') {
          if (active) {
            setPollingRunId(null)
            setIsGenerating(false)
            setGenLogs((prev) => [...prev, `Error: ${data.run.error_message || 'Agent run failed'}`])
          }
        } else {
          pollCount++
          if (pollCount > 25) {
            if (active) {
              setPollingRunId(null)
              setIsGenerating(false)
              setGenLogs((prev) => [...prev, 'Error: Request timed out. Please try again.'])
            }
            return
          }
          setTimeout(checkStatus, 2000)
        }
      } catch (err) {
        console.error(err)
      }
    }

    checkStatus()

    return () => {
      active = false
    }
  }, [pollingRunId])

  const selectOpportunity = (opp: any, idx: number) => {
    setSelectedOppIdx(idx)
    setIdeaText(opp.problem_statement + '\n\nProposed Solution: ' + opp.proposed_solution)
    setProductNameText(opp.title)
    setHasNameSelect(true)
    setDomainText(painDumpIndustry || 'SaaS')
    setPainOriginText(opp.problem_statement)
  }

  const proceedFromOpportunities = () => {
    if (selectedOppIdx === null) return
    // Proceed to Stage 3 directly, bypassing step 0-2 standard venture questions
    onNext()
  }

  const next = () => {
    if (flowBranch === 'standard' && subStep < 2) {
      setSubStep(subStep + 1)
    } else {
      onNext()
    }
  }

  const prev = () => {
    if (flowBranch === 'standard' && subStep > 0) {
      setSubStep(subStep - 1)
    } else if (flowBranch !== 'undecided') {
      setFlowBranch('undecided')
      setSubStep(0)
    } else {
      onPrev()
    }
  }

  return (
    <div className="w-full min-h-[400px] flex flex-col justify-between">
      <div className="flex-grow">
        <AnimatePresence mode="wait">
          {flowBranch === 'undecided' && (
            <motion.div
              key="branch-select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 2 // Dream Engine
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Do you have an idea?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Choose how you want to configure your startup details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl pt-4">
                <button
                  onClick={() => setFlowBranch('standard')}
                  className="text-left bg-[#0c0c0f]/40 hover:bg-[#0c0c0f]/60 border border-[#1a1a1a] hover:border-[#6366f1]/40 rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[180px]"
                >
                  <div>
                    <span className="text-sm font-semibold text-white block mb-1.5">I have a clear idea</span>
                    <span className="text-xs text-[#a1a1a1] leading-relaxed block">
                      I know what problem I am solving and what product I want to build. Take me to the configuration questions.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#6366f1] font-semibold tracking-wider flex items-center gap-1">
                    START STANDARD FLOW <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                <button
                  onClick={() => setFlowBranch('pain-dump')}
                  className="text-left bg-[#0c0c0f]/40 hover:bg-[#0c0c0f]/60 border border-[#1a1a1a] hover:border-violet-500/40 rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[180px] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-24 w-24 bg-violet-500/03 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <span className="text-sm font-semibold text-white block mb-1.5 flex items-center gap-1.5">
                      I don&apos;t have an idea yet <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    </span>
                    <span className="text-xs text-[#a1a1a1] leading-relaxed block">
                      I want to list daily frustrations or industry friction and let Karnex generate validated product hypotheses live.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-violet-400 font-semibold tracking-wider flex items-center gap-1">
                    START PAIN DUMP ENGINE <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {flowBranch === 'standard' && (
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {subStep === 0 && (
                  <motion.div
                    key="standard-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                        Stage 2 // Venture // Question 1 of 3
                      </span>
                      <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                        What is your startup idea?
                      </h2>
                      <p className="text-sm text-[#a1a1a1] max-w-md">
                        Describe what you want to build and the primary domain.
                      </p>
                    </div>

                    <div className="space-y-4 max-w-lg">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider">
                            Startup Concept / Description
                          </label>
                          <button
                            onClick={() => toggleSpeech('idea')}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              isListening && listeningTarget === 'idea'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-[#1a1a1a] text-zinc-400 hover:text-white border border-[#2a2a2a]'
                            }`}
                          >
                            {isListening && listeningTarget === 'idea' ? (
                              <>
                                <MicOff className="w-3 h-3 animate-pulse" /> LISTENING...
                              </>
                            ) : (
                              <>
                                <Mic className="w-3 h-3" /> VOICE INPUT
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none min-h-[120px] resize-none"
                          placeholder="Explain what the product does, who it serves, and how it solves their core pain..."
                          value={ideaText}
                          onChange={(e) => setIdeaText(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                          Primary Domain / Industry
                        </label>
                        <input
                          type="text"
                          className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                          placeholder="e.g. B2B SaaS, Creator Economy, E-Commerce, DevTools"
                          value={domainText}
                          onChange={(e) => setDomainText(e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {subStep === 1 && (
                  <motion.div
                    key="standard-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                        Stage 2 // Venture // Question 2 of 3
                      </span>
                      <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                        What is the pain origin?
                      </h2>
                      <p className="text-sm text-[#a1a1a1] max-w-md">
                        What specific frustration or friction led to this startup idea?
                      </p>
                    </div>

                    <div className="space-y-4 max-w-lg">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                          Pain / Frustration Narrative
                        </label>
                        <textarea
                          className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none min-h-[140px] resize-none"
                          placeholder="e.g. As a founder, chasing payments and manually calculating invoice totals takes up 4 hours a week. Or: Sales reps spend half their day searching for high-intent emails..."
                          value={painOriginText}
                          onChange={(e) => setPainOriginText(e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {subStep === 2 && (
                  <motion.div
                    key="standard-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                        Stage 2 // Venture // Question 3 of 3
                      </span>
                      <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                        Stage & Name
                      </h2>
                      <p className="text-sm text-[#a1a1a1] max-w-md">
                        Configure the name and progress status of your venture.
                      </p>
                    </div>

                    <div className="space-y-5 max-w-lg">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                          Current Stage
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {VENTURE_STAGES.map((vs) => {
                            const isSelected = profile.venture?.stage === vs.id
                            return (
                              <button
                                key={vs.id}
                                onClick={() => updateProfile({ venture: { ...profile.venture, stage: vs.id as any } as any })}
                                className={`text-left bg-[#0c0c0f]/40 border rounded-xl p-3.5 transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'border-[#6366f1] bg-[#6366f1]/05'
                                    : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                                }`}
                              >
                                <span className="text-xs font-semibold text-white block">{vs.title}</span>
                                <span className="text-[11px] text-[#a1a1a1] mt-0.5 block">{vs.desc}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="hasName"
                            className="rounded border-[#1a1a1a] text-[#6366f1] focus:ring-[#6366f1] bg-[#050505] h-4 w-4"
                            checked={hasNameSelect}
                            onChange={(e) => setHasNameSelect(e.target.checked)}
                          />
                          <label htmlFor="hasName" className="text-xs text-[#a1a1a1] font-medium cursor-pointer">
                            I already have a name for the product
                          </label>
                        </div>

                        {hasNameSelect && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1"
                          >
                            <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                              Product Name
                            </label>
                            <input
                              type="text"
                              className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                              placeholder="e.g. Karnex Invoice"
                              value={productNameText}
                              onChange={(e) => setProductNameText(e.target.value)}
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {flowBranch === 'pain-dump' && (
            <motion.div
              key="pain-dump-engine"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 2 // Pain Dump Engine // Opportunity Generator
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Tell us what frustrates you.
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Dump your raw frustrations in plain English or use voice dictation. Our agent maps them to product opportunities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                <div className="md:col-span-6 space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider">
                        Dump Frustration
                      </label>
                      <button
                        onClick={() => toggleSpeech('pain')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          isListening && listeningTarget === 'pain'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-[#1a1a1a] text-zinc-400 hover:text-white border border-[#2a2a2a]'
                        }`}
                      >
                        {isListening && listeningTarget === 'pain' ? (
                          <>
                            <MicOff className="w-3 h-3 animate-pulse" /> LISTENING...
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3" /> VOICE INPUT
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none min-h-[130px] resize-none"
                      placeholder="Describe what daily task or workflow is painful. e.g. Formatting reports manually, chased client invoices, or researching competitive landscape is tedious..."
                      value={painDumpText}
                      onChange={(e) => setPainDumpText(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-1 text-[10px] font-mono text-[#525252]">
                      <span className={painDumpText.length >= 30 ? 'text-emerald-500 font-semibold' : ''}>
                        {painDumpText.length} / 30 characters min
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                      Target Industry Context (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                      placeholder="e.g. Legal Tech, Freelancers, E-commerce, Real Estate"
                      value={painDumpIndustry}
                      onChange={(e) => setPainDumpIndustry(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleGenerateOpportunities}
                    disabled={painDumpText.length < 30 || isGenerating}
                    className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-violet-600/10"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        GENERATING OPPORTUNITIES...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        GENERATE OPPORTUNITIES
                      </>
                    )}
                  </button>

                  {isGenerating && (
                    <div className="p-3 border border-[#1a1a1a] rounded-xl bg-[#050505]/50 space-y-1.5 font-mono text-[10px] text-[#737373]">
                      {genLogs.map((log, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          {idx === genLogs.length - 1 ? (
                            <span className="h-1 w-1 rounded-full bg-violet-500 animate-ping" />
                          ) : (
                            <span className="h-1 w-1 rounded-full bg-[#525252]" />
                          )}
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-6 bg-[#09090b]/40 border border-[#1a1a1a] rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block mb-3">
                      GENERATED OPPORTUNITIES
                    </span>

                    {generatedOpportunities.length === 0 ? (
                      <div className="h-48 border border-dashed border-[#1a1a1a] rounded-xl flex items-center justify-center text-[#525252] text-xs">
                        {isGenerating ? 'Analyzing pain metrics...' : 'Awaiting pain description input...'}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {generatedOpportunities.map((opp, idx) => {
                          const isSelected = selectedOppIdx === idx
                          return (
                            <button
                              key={idx}
                              onClick={() => selectOpportunity(opp, idx)}
                              className={`w-full text-left p-3 border rounded-xl transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'border-violet-500 bg-violet-500/05'
                                  : 'border-[#1a1a1a] hover:border-[#2a2a2a] bg-[#0c0c0f]/20'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-white">{opp.title}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                              </div>
                              <span className="text-[10px] text-[#a1a1a1] mt-1 block leading-relaxed line-clamp-2">
                                {opp.proposed_solution}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={proceedFromOpportunities}
                    disabled={selectedOppIdx === null}
                    className="w-full mt-4 px-4 py-2 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 disabled:hover:bg-[#6366f1] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    CHOOSE OPPORTUNITY & CONTINUE
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Row */}
      {flowBranch !== 'pain-dump' && flowBranch !== 'undecided' && (
        <div className="pt-6 mt-8 border-t border-[#1a1a1a] flex justify-between items-center">
          <button
            onClick={prev}
            className="px-4 py-2 border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#737373] hover:text-white rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK
          </button>

          <button
            onClick={next}
            disabled={
              flowBranch === 'standard' &&
              subStep === 0 &&
              (!ideaText || ideaText.length < 10)
            }
            className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 disabled:hover:bg-[#6366f1] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-[#6366f1]/10 cursor-pointer"
          >
            CONTINUE
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {flowBranch === 'pain-dump' && (
        <div className="pt-6 mt-8 border-t border-[#1a1a1a] flex justify-start">
          <button
            onClick={prev}
            className="px-4 py-2 border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#737373] hover:text-white rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK
          </button>
        </div>
      )}
    </div>
  )
}
