'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import HypothesisStep from '@/components/onboarding/HypothesisStep'
import ProductBriefStep from '@/components/onboarding/ProductBriefStep'
import RoadmapStep from '@/components/onboarding/RoadmapStep'

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

interface PainAnalysis {
  core_pain: string
  pain_intensity: number
  affected_audience: string
  frequency: string
  existing_alternatives: string[]
}

interface PainTransformerOutput {
  pain_analysis: PainAnalysis
  hypotheses: ProductHypothesis[]
  recommended_hypothesis: number
}

interface Phase {
  phase_number: number
  title: string
  theme: string
  weekly_goals: {
    week_number: number
    focus: string
    goals: string[]
    estimated_hours: number
  }[]
}

interface Roadmap {
  title: string
  phases: Phase[]
}

interface OnboardingWizardProps {
  initialName: string
  savedStep: number
  savedContext: { pain_description?: string; industry_context?: string } | null
}

const PLACEHOLDERS = [
  "I spend hours formatting client reports manually in MS Word...",
  "Our sales reps struggle to find high-intent target contacts...",
  "Chasing invoices and managing payments manually takes up all my time...",
  "Running competitive research for new features is tedious and slow..."
]

export default function OnboardingWizard({ initialName, savedStep, savedContext }: OnboardingWizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowserClient()

  // 1. URL Query State Sync
  const urlStep = Number(searchParams.get('step') || '')
  const runId = searchParams.get('run_id') || ''
  const step = urlStep || savedStep || 1

  // Step 1 State
  const [painInput, setPainInput] = useState(savedContext?.pain_description || '')
  const [industryContext, setIndustryContext] = useState(savedContext?.industry_context || '')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [placeholderOpacity, setPlaceholderOpacity] = useState(1)
  const [transforming, setTransforming] = useState(false)
  const [transformLogs, setTransformLogs] = useState<string[]>([])

  // Step 2 State
  const [agentOutput, setAgentOutput] = useState<PainTransformerOutput | null>(null)
  const [loadingOutput, setLoadingOutput] = useState(false)
  const [errorOutput, setErrorOutput] = useState<string | null>(null)
  const [selectedHypIdx, setSelectedHypIdx] = useState<number | null>(null)
  const [customizing, setCustomizing] = useState(false)
  
  // Refined fields
  const [startupName, setStartupName] = useState('')
  const [tagline, setTagline] = useState('')
  const [industry, setIndustry] = useState('SaaS')
  const [targetAudience, setTargetAudience] = useState('')
  const [stage, setStage] = useState<'ideation' | 'validation' | 'building' | 'launching' | 'growing'>('ideation')

  // Step 3 State
  const [displayName, setDisplayName] = useState(initialName)
  const [technicalLevel, setTechnicalLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [weeklyHoursAvailable, setWeeklyHoursAvailable] = useState(20)
  const [communicationTone, setCommunicationTone] = useState<'casual' | 'direct' | 'formal'>('direct')
  const [preferredAgentSpeed, setPreferredAgentSpeed] = useState<'fast' | 'thorough'>('thorough')
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [roadmapLogs, setRoadmapLogs] = useState<string[]>([])

  // Step 4 State
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completeLogs, setCompleteLogs] = useState<string[]>([])

  // 3-Second Placeholder Rotating Animation
  useEffect(() => {
    if (step !== 1) return
    const interval = setInterval(() => {
      setPlaceholderOpacity(0)
      setTimeout(() => {
        setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length)
        setPlaceholderOpacity(1)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [step])

  // Sync URL Params on Load/Change
  useEffect(() => {
    const syncStep = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!urlStep) {
        // Redirect to saved step or step 1
        router.replace(`?step=${step}${runId ? `&run_id=${runId}` : ''}`)
      } else {
        // Save current step to database
        await supabase
          .from('founder_memory')
          .upsert({
            founder_id: user.id,
            namespace: 'onboarding',
            key: 'step',
            value: { step: urlStep, run_id: runId || null }
          }, { onConflict: 'founder_id,namespace,key' })
      }
    }
    syncStep()
  }, [urlStep, step, runId])

  // Step 2: Fetch and Poll Agent Outputs
  useEffect(() => {
    if (step === 2 && runId) {
      let active = true
      let pollCount = 0
      const fetchOutput = async () => {
        try {
          setLoadingOutput(true)
          setErrorOutput(null)

          const { data, error } = await supabase
            .from('agent_outputs')
            .select('output')
            .eq('agent_run_id', runId)
            .maybeSingle()

          if (error) throw error

          if (data?.output) {
            if (active) {
              const out = data.output as PainTransformerOutput
              setAgentOutput(out)
              const recIdx = out.recommended_hypothesis ?? 0
              setSelectedHypIdx(recIdx)
              
              // Populate refined fields
              const hyp = out.hypotheses[recIdx]
              if (hyp) {
                setStartupName(hyp.title || '')
                setTagline(hyp.proposed_solution || '')
                setTargetAudience(hyp.target_audience || '')
              }
              setLoadingOutput(false)
            }
          } else {
            pollCount++
            if (pollCount > 15) {
              if (active) {
                setErrorOutput('Taking longer than usual. Please refresh the page or restart the analysis.')
                setLoadingOutput(false)
              }
              return
            }
            // Retry in 2 seconds
            setTimeout(() => {
              if (active) fetchOutput()
            }, 2000)
          }
        } catch (err) {
          console.error(err)
          if (active) {
            setErrorOutput('Failed to retrieve product hypotheses output.')
            setLoadingOutput(false)
          }
        }
      }
      fetchOutput()
      return () => {
        active = false
      }
    }
  }, [step, runId])

  // Trigger Step 1 Analysis
  const handleTransformPain = async () => {
    if (painInput.length < 30) return

    setTransforming(true)
    setTransformLogs(['Triggering Pain-to-Product Transformer agent...', 'Saving pain context details to workspace memory...'])

    try {
      const response = await fetch('/api/agents/pain-transformer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pain_description: painInput,
          industry_context: industryContext || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to execute agent run.')
      }

      setTransformLogs((prev) => [...prev, 'Agent initialized successfully. Grounding search queries...', 'Synthesizing product hypotheses...'])
      const data = await response.json()
      
      if (data.success && data.run_id) {
        setTransformLogs((prev) => [...prev, 'Success! Redirecting to hypotheses choice page...'])
        setTimeout(() => {
          router.push(`?step=2&run_id=${data.run_id}`)
          setTransforming(false)
        }, 1000)
      } else {
        throw new Error('Invalid run ID response from agent.')
      }
    } catch (err) {
      console.error(err)
      setTransformLogs((prev) => [...prev, 'Fatal Error: Agent execution failed. Check console.'])
      alert('Failed to transform pain inputs. Please retry.')
      setTransforming(false)
    }
  }

  // Handle Hypothesis Selection
  const handleSelectHypothesis = (idx: number) => {
    setSelectedHypIdx(idx)
    const hyp = agentOutput?.hypotheses[idx]
    if (hyp) {
      setStartupName(hyp.title)
      setTagline(hyp.proposed_solution)
      setTargetAudience(hyp.target_audience)
    }
  }

  // Proceed to Step 3
  const handleProceedToSettings = async () => {
    if (selectedHypIdx === null || !agentOutput) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save selected hypothesis context to DB
    const hyp = agentOutput.hypotheses[selectedHypIdx]
    await supabase
      .from('founder_memory')
      .upsert({
        founder_id: user.id,
        namespace: 'onboarding',
        key: 'selected_hypothesis',
        value: {
          hypothesis: hyp,
          startupName,
          tagline,
          industry,
          targetAudience,
          stage
        }
      }, { onConflict: 'founder_id,namespace,key' })

    router.push(`?step=3&run_id=${runId}`)
  }

  // Trigger Step 3 Roadmap Generation
  const handleGenerateRoadmap = async () => {
    setGeneratingRoadmap(true)
    setRoadmapLogs(['Parsing founder parameters & startup profile...', 'Analyzing capacity: ' + weeklyHoursAvailable + ' hours/week...', 'Generating 90-Day Execution Roadmap...'])

    try {
      const response = await fetch('/api/onboarding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Startup name: ${startupName}. Tagline: ${tagline}. Industry: ${industry}. Target Audience: ${targetAudience}. Stage: ${stage}. Description of frustration: ${painInput}`,
          fullName: displayName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate roadmap.')
      }

      const data = await response.json()
      if (data.roadmap) {
        setRoadmap(data.roadmap)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Save roadmap to founder memory
          await supabase
            .from('founder_memory')
            .upsert({
              founder_id: user.id,
              namespace: 'onboarding',
              key: 'roadmap_data',
              value: data.roadmap
            }, { onConflict: 'founder_id,namespace,key' })
            
          // Save preferences
          await supabase
            .from('founder_memory')
            .upsert({
              founder_id: user.id,
              namespace: 'onboarding',
              key: 'founder_preferences',
              value: {
                displayName,
                technicalLevel,
                weeklyHoursAvailable,
                communicationTone,
                preferredAgentSpeed
              }
            }, { onConflict: 'founder_id,namespace,key' })
        }
        
        setRoadmapLogs((prev) => [...prev, 'Roadmap successfully generated! Saving and loading phase views...'])
        setTimeout(() => {
          router.push(`?step=4&run_id=${runId}`)
          setGeneratingRoadmap(false)
        }, 1000)
      } else {
        throw new Error('Invalid roadmap payload format.')
      }
    } catch (err) {
      console.error(err)
      setRoadmapLogs((prev) => [...prev, 'Error generating roadmap plan. Check connection.'])
      alert('Failed to generate roadmap. Please try again.')
      setGeneratingRoadmap(false)
    }
  }

  // Complete Onboarding
  const handleLaunchWorkspace = async () => {
    if (!roadmap) return
    setCompleting(true)
    setCompleteLogs(['Initializing database configuration...', 'Creating active startup row...', 'Provisioning selected idea...', 'Populating sprint logs and tasks...', 'Configuring AI agent parameters...'])

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          technicalLevel,
          weeklyHoursAvailable,
          communicationTone,
          preferredAgentSpeed,
          startupName,
          tagline,
          description: painInput,
          industry,
          targetAudience,
          stage,
          roadmap
        })
      })

      if (!response.ok) {
        throw new Error('Onboarding completion failed.')
      }

      setCompleteLogs((prev) => [...prev, 'Workspace provisioned! Redirecting to Journey HQ...'])
      setTimeout(() => {
        router.push('/dashboard')
        setCompleting(false)
      }, 1500)
    } catch (err) {
      console.error(err)
      setCompleteLogs((prev) => [...prev, 'Failed to complete workspace initialization.'])
      alert('Failed to complete onboarding. Please try again.')
      setCompleting(false)
    }
  }

  return (
    <div className="w-full">
      {/* STEP 1: DEFINE PAIN */}
      {step === 1 && (
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="text-center space-y-3">
            <h1 className="font-display font-extrabold text-[32px] md:text-[40px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#f5f5f5] to-neutral-400 leading-tight">
              Tell me about your frustration.
            </h1>
            <p className="text-[#a3a3a3] text-[15px] max-w-md mx-auto">
              Our Pain-to-Product agent analyzes real-world frustrations, checks competitive gaps, and extracts 3 validated product hypotheses.
            </p>
          </div>

          <div className="dash-card p-6 md:p-8 space-y-6 relative overflow-hidden">
            {/* Input fields */}
            <div className="space-y-4">
              <div>
                <label className="muted-label block mb-2">The Pain Point / Frustration</label>
                <div className="relative">
                  <textarea
                    className="dash-input min-h-[140px] font-sans text-sm focus:ring-1 focus:ring-indigo-500"
                    placeholder="Describe a problem you or your target audience experiences..."
                    value={painInput}
                    onChange={(e) => setPainInput(e.target.value)}
                    disabled={transforming}
                  />
                  {painInput.length === 0 && (
                    <div 
                      className="absolute top-3 left-[15px] right-[15px] pointer-events-none text-neutral-600 text-sm font-sans transition-opacity duration-300 leading-relaxed"
                      style={{ opacity: placeholderOpacity }}
                    >
                      <span className="text-indigo-400/80 mr-1.5 font-mono">e.g.</span>
                      {PLACEHOLDERS[placeholderIdx]}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2 text-[12px]">
                  <span className={painInput.length >= 30 ? 'text-emerald-500' : 'text-neutral-500'}>
                    {painInput.length} / 30 characters minimum
                  </span>
                  <span className="text-neutral-500">Max 5000</span>
                </div>
              </div>

              <div>
                <label className="muted-label block mb-2">Industry Context (Optional)</label>
                <input
                  type="text"
                  className="dash-input"
                  placeholder="e.g. Real Estate, Medical Billing, Legal Tech, Developer Tools"
                  value={industryContext}
                  onChange={(e) => setIndustryContext(e.target.value)}
                  disabled={transforming}
                />
              </div>
            </div>

            {/* Logs when running */}
            {transforming && (
              <div className="mt-4 p-4 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] space-y-2 font-mono text-[12px] text-[#a3a3a3]">
                {transformLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {idx === transformLogs.length - 1 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action CTA */}
            <div className="pt-2 flex justify-end">
              <button
                className="dash-btn dash-btn-primary w-full sm:w-auto px-6 py-2.5 shadow-lg shadow-indigo-500/20"
                onClick={handleTransformPain}
                disabled={painInput.length < 30 || transforming}
              >
                {transforming ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Running Analysis...
                  </>
                ) : (
                  <>
                    Transform Pain
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: HYPOTHESES CHOICES */}
      {step === 2 && (
        <HypothesisStep
          runId={runId}
          onSelect={({ ideaId, crystallizerRunId, icpRunId }) => {
            router.push(`?step=3&run_id=${runId}&idea_id=${ideaId}&crystallizer_run_id=${crystallizerRunId}&icp_run_id=${icpRunId}`)
          }}
        />
      )}

      {/* STEP 3: PRODUCT BRIEF REVEAL */}
      {step === 3 && (
        <ProductBriefStep
          ideaId={searchParams.get('idea_id') || ''}
          crystallizerRunId={searchParams.get('crystallizer_run_id') || ''}
          icpRunId={searchParams.get('icp_run_id') || ''}
          onConfirm={(data) => {
            // Update parent coordinator state with all the customized options returned from brief confirmation
            setStartupName(data.startupName)
            setTagline(data.tagline)
            setIndustry(data.industry)
            setTargetAudience(data.targetAudience)
            setStage(data.stage as any)
            setDisplayName(data.displayName)
            setTechnicalLevel(data.technicalLevel as any)
            setWeeklyHoursAvailable(data.weeklyHoursAvailable)
            setCommunicationTone(data.communicationTone as any)
            setPreferredAgentSpeed(data.preferredAgentSpeed as any)

            router.push(`?step=4&run_id=${runId}&war_room_run_id=${data.warRoomRunId}`)
          }}
        />
      )}

      {/* STEP 4: ACTIONABLE ROADMAP */}
      {step === 4 && (
        <RoadmapStep
          warRoomRunId={searchParams.get('war_room_run_id')}
          displayName={displayName}
          technicalLevel={technicalLevel}
          weeklyHoursAvailable={weeklyHoursAvailable}
          communicationTone={communicationTone}
          preferredAgentSpeed={preferredAgentSpeed}
          primaryGoal={tagline || 'Build startup'}
          startupName={startupName}
          tagline={tagline}
          description={painInput}
          industry={industry}
          targetAudience={targetAudience}
          stage={stage}
        />
      )}
    </div>
  )
}
