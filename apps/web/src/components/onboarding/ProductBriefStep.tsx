'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { 
  CheckCircle, 
  Circle, 
  Loader2, 
  Sparkles, 
  ShieldAlert, 
  DollarSign, 
  Target, 
  Plus, 
  Trash2, 
  User, 
  Check, 
  ChevronRight, 
  PenSquare, 
  X,
  TrendingUp,
  Coins,
  Briefcase,
  Layers,
  Lightbulb,
  FileText
} from 'lucide-react'

interface Feature {
  name: string
  description: string
  mapped_pain?: string
}

interface PricingTier {
  name: string
  price: string | number
  interval?: string
  features: string[]
  description?: string
}

interface ProductBrief {
  selected_name: string
  tagline: string
  elevator_pitch: string
  value_proposition: {
    for_whom: string
    problem: string
    solution: string
    key_benefit: string
    unlike: string
  }
  features: {
    must_have: Feature[]
    nice_to_have?: Feature[]
    future?: Feature[]
  }
  pricing_hypothesis: {
    model: string
    tiers: PricingTier[]
    rationale: string
  }
  go_to_market?: string[]
}

interface Persona {
  name: string
  age: number
  location: string
  job_title: string
  bio: string
  primary_pain: string
  quote: string
  willingness_to_pay: string
  karnex_agents_needed?: string[]
}

interface ICPDocument {
  icp?: {
    demographic?: {
      age_range?: string
      location?: string[]
      job_titles?: string[]
      company_size?: string
      income_range?: string
    }
    psychographic?: {
      motivations?: string[]
      frustrations?: string[]
      values?: string[]
      information_sources?: string[]
      decision_making_style?: string
    }
    behavioral?: {
      buying_triggers?: string[]
      objections?: string[]
      preferred_channels?: string[]
      willingness_to_pay?: string
      tool_stack?: string[]
    }
    pain_ranking?: any[]
    day_in_the_life?: string
  }
  personas: Persona[]
}

interface ProductBriefStepProps {
  ideaId: string
  crystallizerRunId: string
  icpRunId: string
  onConfirm: (data: { 
    warRoomRunId: string
    startupName: string
    tagline: string
    description: string
    industry: string
    targetAudience: string
    stage: string
    displayName: string
    technicalLevel: string
    weeklyHoursAvailable: number
    communicationTone: string
    preferredAgentSpeed: string
  }) => void
}

export default function ProductBriefStep({
  ideaId,
  crystallizerRunId,
  icpRunId,
  onConfirm
}: ProductBriefStepProps) {
  const supabase = createSupabaseBrowserClient()

  // Polling States
  const [crystallizerStatus, setCrystallizerStatus] = useState<'queued' | 'running' | 'success' | 'error'>('queued')
  const [icpStatus, setIcpStatus] = useState<'queued' | 'running' | 'success' | 'error'>('queued')
  const [crystallizerError, setCrystallizerError] = useState<string | null>(null)
  const [icpError, setIcpError] = useState<string | null>(null)

  // Raw Agent Outputs
  const [productBrief, setProductBrief] = useState<ProductBrief | null>(null)
  const [icpDocument, setIcpDocument] = useState<ICPDocument | null>(null)

  // Staggered reveal tracker
  const [revealedIndex, setRevealedIndex] = useState(0)

  // Edit Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'pitch' | 'personas' | 'features' | 'pricing' | 'preferences'>('pitch')

  // Local Editable States (linked to Main UI display and saved to DB on confirmation)
  const [editedName, setEditedName] = useState('')
  const [editedTagline, setEditedTagline] = useState('')
  const [editedPitch, setEditedPitch] = useState('')
  const [editedPersonas, setEditedPersonas] = useState<Persona[]>([])
  const [editedFeatures, setEditedFeatures] = useState<Feature[]>([])
  const [editedPricingTiers, setEditedPricingTiers] = useState<PricingTier[]>([])
  const [editedPricingModel, setEditedPricingModel] = useState('')
  const [editedPricingRationale, setEditedPricingRationale] = useState('')

  // Founder preferences states
  const [editedDisplayName, setEditedDisplayName] = useState('')
  const [editedTechnicalLevel, setEditedTechnicalLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [editedWeeklyHoursAvailable, setEditedWeeklyHoursAvailable] = useState(20)
  const [editedCommunicationTone, setEditedCommunicationTone] = useState<'casual' | 'direct' | 'formal'>('direct')
  const [editedPreferredAgentSpeed, setEditedPreferredAgentSpeed] = useState<'fast' | 'thorough'>('thorough')

  // Load founder preferences on mount
  useEffect(() => {
    const loadFounderPrefs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: founder, error } = await supabase
            .from('founders')
            .select('display_name, technical_level, weekly_hours_available, communication_tone, preferred_agent_speed')
            .eq('id', user.id)
            .maybeSingle()

          if (!error && founder) {
            setEditedDisplayName(founder.display_name || user.user_metadata?.full_name || 'Founder')
            if (founder.technical_level) {
              setEditedTechnicalLevel(founder.technical_level as any)
            }
            if (founder.weekly_hours_available) {
              setEditedWeeklyHoursAvailable(founder.weekly_hours_available)
            }
            if (founder.communication_tone) {
              setEditedCommunicationTone(founder.communication_tone as any)
            }
            if (founder.preferred_agent_speed) {
              setEditedPreferredAgentSpeed(founder.preferred_agent_speed as any)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load founder preferences:', err)
      }
    }
    loadFounderPrefs()
  }, [supabase])

  // Action states
  const [isConfirming, setIsConfirming] = useState(false)

  // Fetch Output helper functions
  const fetchCrystallizerOutput = useCallback(async (runId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()
      if (error) throw error
      if (data?.output) {
        const brief = (data.output.product_brief || data.output) as ProductBrief
        setProductBrief(brief)
        setEditedName(brief.selected_name || '')
        setEditedTagline(brief.tagline || '')
        setEditedPitch(brief.elevator_pitch || '')
        setEditedFeatures(brief.features?.must_have || [])
        setEditedPricingTiers(brief.pricing_hypothesis?.tiers || [])
        setEditedPricingModel(brief.pricing_hypothesis?.model || 'Subscription')
        setEditedPricingRationale(brief.pricing_hypothesis?.rationale || '')
      }
    } catch (err) {
      console.error('Error fetching crystallizer output:', err)
      setCrystallizerError('Failed to fetch product brief data.')
    }
  }, [supabase])

  const fetchIcpOutput = useCallback(async (runId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_outputs')
        .select('output')
        .eq('agent_run_id', runId)
        .maybeSingle()
      if (error) throw error
      if (data?.output) {
        const doc = data.output as ICPDocument
        setIcpDocument(doc)
        setEditedPersonas(doc.personas || [])
      }
    } catch (err) {
      console.error('Error fetching ICP output:', err)
      setIcpError('Failed to fetch target personas data.')
    }
  }, [supabase])

  // Poll Runs Concurrently
  useEffect(() => {
    let crystallizerInterval: NodeJS.Timeout
    let icpInterval: NodeJS.Timeout

    if (crystallizerRunId && crystallizerStatus !== 'success' && crystallizerStatus !== 'error') {
      crystallizerInterval = setInterval(async () => {
        try {
          const { data: run, error } = await supabase
            .from('agent_runs')
            .select('status, error_message')
            .eq('id', crystallizerRunId)
            .maybeSingle()

          if (error) throw error
          if (run) {
            const status = run.status as any
            const targetStatus = status === 'partial' ? 'success' : status
            setCrystallizerStatus(targetStatus)
            if (targetStatus === 'success') {
              clearInterval(crystallizerInterval)
              await fetchCrystallizerOutput(crystallizerRunId)
            } else if (targetStatus === 'error') {
              clearInterval(crystallizerInterval)
              setCrystallizerError(run.error_message || 'Idea crystallization failed.')
            }
          }
        } catch (err) {
          console.error('Error polling crystallizer status:', err)
        }
      }, 2500)
    }

    if (icpRunId && icpStatus !== 'success' && icpStatus !== 'error') {
      icpInterval = setInterval(async () => {
        try {
          const { data: run, error } = await supabase
            .from('agent_runs')
            .select('status, error_message')
            .eq('id', icpRunId)
            .maybeSingle()

          if (error) throw error
          if (run) {
            const status = run.status as any
            const targetStatus = status === 'partial' ? 'success' : status
            setIcpStatus(targetStatus)
            if (targetStatus === 'success') {
              clearInterval(icpInterval)
              await fetchIcpOutput(icpRunId)
            } else if (targetStatus === 'error') {
              clearInterval(icpInterval)
              setIcpError(run.error_message || 'ICP definition failed.')
            }
          }
        } catch (err) {
          console.error('Error polling ICP status:', err)
        }
      }, 2500)
    }

    return () => {
      if (crystallizerInterval) clearInterval(crystallizerInterval)
      if (icpInterval) clearInterval(icpInterval)
    }
  }, [crystallizerRunId, icpRunId, crystallizerStatus, icpStatus, fetchCrystallizerOutput, fetchIcpOutput, supabase])

  // Stagger reveal of completed brief sections
  useEffect(() => {
    if (productBrief && icpDocument) {
      const timer = setInterval(() => {
        setRevealedIndex((prev) => {
          if (prev < 4) return prev + 1
          clearInterval(timer)
          return prev
        })
      }, 300)
      return () => clearInterval(timer)
    }
  }, [productBrief, icpDocument])

  // Checklist computation helper
  const getChecklistStep = (index: number) => {
    if (index === 0) {
      return { label: 'Connecting to agent execution node...', status: 'success' as const }
    }
    if (index === 1) {
      const status = 
        crystallizerStatus === 'success' ? 'success' :
        crystallizerStatus === 'error' ? 'error' :
        crystallizerStatus === 'running' ? 'loading' : 'pending'
      return { label: 'Synthesizing value proposition & market space (Idea Crystallizer)', status }
    }
    if (index === 2) {
      const status = 
        icpStatus === 'success' ? 'success' :
        icpStatus === 'error' ? 'error' :
        icpStatus === 'running' ? 'loading' : 'pending'
      return { label: 'Analyzing target demographics & 3 buyer personas (ICP Definer)', status }
    }
    if (index === 3) {
      const isDone = crystallizerStatus === 'success' && icpStatus === 'success'
      const isErr = crystallizerStatus === 'error' || icpStatus === 'error'
      const isLoading = crystallizerStatus === 'running' || icpStatus === 'running'
      const status = isDone ? 'success' as const : isErr ? 'error' as const : isLoading ? 'loading' as const : 'pending' as const
      return { label: 'Mapping MVP must-have features & monetization tier hypotheses', status }
    }
    return { label: '', status: 'pending' as const }
  }

  // Handle confirming the blueprint and launching the War Room agent
  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const updatedBriefPayload = {
        selected_name: editedName,
        tagline: editedTagline,
        elevator_pitch: editedPitch,
        value_proposition: productBrief?.value_proposition || {
          for_whom: editedPersonas[0]?.job_title || 'Target Customers',
          problem: editedPersonas[0]?.primary_pain || 'Main customer pains',
          solution: editedTagline,
          key_benefit: editedFeatures[0]?.description || 'Premium core features',
          unlike: ''
        },
        features: {
          must_have: editedFeatures,
          nice_to_have: productBrief?.features?.nice_to_have || [],
          future: productBrief?.features?.future || []
        },
        pricing_hypothesis: {
          model: editedPricingModel,
          tiers: editedPricingTiers,
          rationale: editedPricingRationale
        },
        go_to_market: productBrief?.go_to_market || []
      }

      const updatedIcpPayload = {
        icp: icpDocument?.icp || {
          demographic: {
            age_range: '25-50',
            location: editedPersonas.map(p => p.location),
            job_titles: editedPersonas.map(p => p.job_title),
            company_size: '1-100 employees',
            income_range: 'Varies'
          },
          behavioral: {
            willingness_to_pay: editedPricingModel
          }
        },
        personas: editedPersonas
      }

      const res = await fetch('/api/agents/war-room/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ideaId,
          productBrief: updatedBriefPayload,
          icpDocument: updatedIcpPayload,
          displayName: editedDisplayName,
          technicalLevel: editedTechnicalLevel,
          weeklyHours: editedWeeklyHoursAvailable,
          communicationTone: editedCommunicationTone,
          preferredAgentSpeed: editedPreferredAgentSpeed
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to trigger War Room run.')
      }

      const data = await res.json()
      if (data.warRoomRunId) {
        onConfirm({ 
          warRoomRunId: data.warRoomRunId,
          startupName: editedName,
          tagline: editedTagline,
          description: updatedBriefPayload.elevator_pitch,
          industry: 'SaaS',
          targetAudience: updatedBriefPayload.value_proposition.for_whom,
          stage: 'ideation',
          displayName: editedDisplayName,
          technicalLevel: editedTechnicalLevel,
          weeklyHoursAvailable: editedWeeklyHoursAvailable,
          communicationTone: editedCommunicationTone,
          preferredAgentSpeed: editedPreferredAgentSpeed
        })
      } else {
        throw new Error('Run ID missing from API response.')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An unexpected error occurred during confirmation.')
    } finally {
      setIsConfirming(false)
    }
  }

  // Edit Drawer array managers
  const updatePersona = (index: number, key: keyof Persona, value: any) => {
    setEditedPersonas((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }
      return updated
    })
  }

  const updateFeature = (index: number, key: keyof Feature, value: any) => {
    setEditedFeatures((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }
      return updated
    })
  }

  const addFeature = () => {
    setEditedFeatures((prev) => [...prev, { name: 'New Feature', description: 'Describe MVP benefit', mapped_pain: '' }])
  }

  const removeFeature = (index: number) => {
    setEditedFeatures((prev) => prev.filter((_, i) => i !== index))
  }

  const updatePricingTier = (index: number, key: keyof PricingTier, value: any) => {
    setEditedPricingTiers((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }
      return updated
    })
  }

  const addPricingTier = () => {
    setEditedPricingTiers((prev) => [...prev, { name: 'Growth', price: 49, interval: 'month', features: [], description: '' }])
  }

  const removePricingTier = (index: number) => {
    setEditedPricingTiers((prev) => prev.filter((_, i) => i !== index))
  }

  const isPolling = crystallizerStatus !== 'success' || icpStatus !== 'success'
  const isFailed = crystallizerStatus === 'error' || icpStatus === 'error'

  return (
    <div className="relative min-h-[80vh] pb-24 text-zinc-100 flex flex-col justify-start">
      
      {/* 1. Header Hero Panel */}
      <div className="max-w-4xl mx-auto text-center mt-6 mb-12 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Blueprint Synthesis
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-500 bg-clip-text text-transparent sm:text-5xl">
          Crystallizing Your Product Blueprint
        </h1>
        <p className="mt-3 text-lg text-zinc-400 max-w-2xl mx-auto">
          Our co-founding agent network is analyzing market signals, structuring buyer personas, mapping pains to features, and designing monetization tiers.
        </p>
      </div>

      {/* 2. Loading Checklist Interface (Shows when agent pipelines are executing) */}
      {isPolling && (
        <div className="max-w-2xl mx-auto w-full px-4 mb-8">
          <div className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <h2 className="text-lg font-bold text-zinc-200 mb-6 flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              Executing Agent Co-Founders
            </h2>
            <div className="space-y-5">
              {[0, 1, 2, 3].map((stepIdx) => {
                const step = getChecklistStep(stepIdx)
                return (
                  <div 
                    key={stepIdx} 
                    className={`flex items-start gap-4 transition-all duration-500 ${
                      step.status === 'pending' ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {step.status === 'loading' && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                      {step.status === 'error' && <ShieldAlert className="w-5 h-5 text-rose-500" />}
                      {step.status === 'pending' && <Circle className="w-5 h-5 text-zinc-700" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        step.status === 'success' ? 'text-zinc-200' :
                        step.status === 'loading' ? 'text-indigo-400' :
                        step.status === 'error' ? 'text-rose-400' : 'text-zinc-500'
                      }`}>
                        {step.label}
                      </p>
                      {step.status === 'loading' && (
                        <p className="text-xs text-zinc-500 mt-0.5 animate-pulse">
                          Processing context and generating JSON matrices...
                        </p>
                      )}
                      {step.status === 'error' && (
                        <p className="text-xs text-rose-500 mt-0.5">
                          {stepIdx === 1 ? crystallizerError : icpError}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {isFailed && (
              <div className="mt-8 p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-center">
                <p className="text-sm text-rose-400 font-medium">
                  We encountered an execution error. Please review the logs or retry onboarding.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Output Dashboard Section (Revealed incrementally when loaded) */}
      {!isPolling && productBrief && icpDocument && (
        <div className="max-w-5xl mx-auto w-full px-4 space-y-12">
          
          {/* Summary Panel */}
          <div className="flex justify-between items-center bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 px-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-zinc-300">
                Blueprint generated successfully
              </span>
            </div>
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold text-zinc-200 transition-all hover:border-zinc-700"
            >
              <PenSquare className="w-4 h-4" />
              Edit Details
            </button>
          </div>

          {/* Section 1: Name and Pitch */}
          {revealedIndex >= 1 && (
            <div className="transition-all duration-700 transform translate-y-0 opacity-100">
              <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 relative hover:border-zinc-700/60 transition-all duration-300 group shadow-lg">
                <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-zinc-950 border border-zinc-800 text-indigo-400 p-2 rounded-lg group-hover:border-zinc-700 transition-colors shadow-sm">
                  <Lightbulb className="w-5 h-5" />
                </div>
                
                <h3 className="text-zinc-500 font-bold uppercase tracking-wider text-xs mb-1">
                  Brand Hypothesis & Pitch
                </h3>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  {editedName}
                </h2>
                <p className="text-zinc-400 italic text-sm mt-1 border-l-2 border-indigo-500/30 pl-3">
                  "{editedTagline}"
                </p>
                <div className="mt-6">
                  <h4 className="text-zinc-300 font-bold text-sm mb-2">Elevator Pitch</h4>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-900/30 p-4 rounded-xl border border-zinc-900">
                    {editedPitch}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Target Personas */}
          {revealedIndex >= 2 && (
            <div className="transition-all duration-700 transform translate-y-0 opacity-100 space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-zinc-200">
                  Target Customer Personas
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {editedPersonas.slice(0, 3).map((persona, idx) => (
                  <div 
                    key={idx} 
                    className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 relative flex flex-col justify-between hover:border-zinc-700/60 hover:-translate-y-1 transition-all duration-300 shadow-md group"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:border-zinc-700 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-100">{persona.name}</h4>
                          <p className="text-xs text-zinc-500">
                            {persona.job_title} • Age {persona.age}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-900 mb-4 italic text-zinc-400 text-xs relative">
                        "{persona.quote}"
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider mb-0.5">
                            Primary Pain
                          </span>
                          <p className="text-zinc-300 text-xs line-clamp-3">
                            {persona.primary_pain}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider mb-0.5">
                            Background
                          </span>
                          <p className="text-zinc-400 text-xs line-clamp-3">
                            {persona.bio}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center">
                      <span className="text-xs text-zinc-500 font-semibold">Willingness to pay:</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs font-bold shadow-sm">
                        <Coins className="w-3.5 h-3.5" />
                        {persona.willingness_to_pay}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Must-Have Features */}
          {revealedIndex >= 3 && (
            <div className="transition-all duration-700 transform translate-y-0 opacity-100 space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-zinc-200">
                  Must-Have MVP Features Backlog
                </h3>
              </div>
              <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 divide-y divide-zinc-900 shadow-md">
                {editedFeatures.map((feat, idx) => (
                  <div key={idx} className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${idx === 0 ? 'pt-0' : ''} ${idx === editedFeatures.length - 1 ? 'pb-0' : ''}`}>
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <h4 className="text-sm font-bold text-zinc-200">{feat.name}</h4>
                      </div>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                    {feat.mapped_pain && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-medium max-w-xs truncate">
                          <Target className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                          Resolves: {feat.mapped_pain}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Pricing Hypothesis */}
          {revealedIndex >= 4 && (
            <div className="transition-all duration-700 transform translate-y-0 opacity-100 space-y-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-zinc-200">
                  Monetization & Pricing Hypothesis
                </h3>
              </div>
              <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-6 shadow-md mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="md:col-span-1 border-r border-zinc-900 pr-6">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      Pricing Model
                    </span>
                    <h4 className="text-base font-bold text-zinc-200 mt-1 capitalize">
                      {editedPricingModel}
                    </h4>
                    <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                      {editedPricingRationale}
                    </p>
                  </div>
                  
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pl-0 md:pl-2">
                    {editedPricingTiers.map((tier, idx) => (
                      <div key={idx} className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-5 hover:border-zinc-800 transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-zinc-200">{tier.name}</h4>
                            <div className="text-right">
                              <span className="text-lg font-extrabold text-indigo-400">${tier.price}</span>
                              {tier.interval && <span className="text-[10px] text-zinc-500 block">/{tier.interval}</span>}
                            </div>
                          </div>
                          {tier.description && (
                            <p className="text-zinc-400 text-[11px] mt-1 border-t border-zinc-900/50 pt-2 mb-3">
                              {tier.description}
                            </p>
                          )}
                        </div>
                        <ul className="space-y-1.5 mt-3 border-t border-zinc-900/60 pt-3">
                          {tier.features.slice(0, 4).map((f, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. Bottom Sticky Confirmation Bar */}
      {!isPolling && productBrief && icpDocument && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-900/80 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs text-zinc-500 block uppercase font-bold tracking-wider">
              Onboarding: Product brief confirmation
            </span>
            <span className="text-sm font-bold text-zinc-200">
              Launch roadmap blueprinting for <span className="text-indigo-400">{editedName || 'your startup'}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 border border-zinc-800 rounded-xl bg-zinc-900/40 text-sm font-semibold hover:bg-zinc-900 transition-colors"
            >
              Modify Details
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02] shadow-md shadow-indigo-500/10 disabled:opacity-50"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing Roadmap...
                </>
              ) : (
                <>
                  Confirm & Fire War Room
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 5. Custom Slide-Over Edit Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />
          <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-2xl bg-zinc-950 border-l border-zinc-900 shadow-2xl flex flex-col h-full">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-zinc-900 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <PenSquare className="w-5 h-5 text-indigo-400" />
                    Edit Product Blueprint
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Fine-tune target personas, core feature sets, and pricing layout before executing roadmaps.
                  </p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex border-b border-zinc-900 bg-zinc-900/20 px-6">
                {[
                  { id: 'pitch', label: 'Pitch & Brand' },
                  { id: 'personas', label: 'Personas' },
                  { id: 'features', label: 'Features' },
                  { id: 'pricing', label: 'Pricing' },
                  { id: 'preferences', label: 'My Settings' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDrawerTab(t.id as any)}
                    className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all ${
                      drawerTab === t.id 
                        ? 'border-indigo-500 text-indigo-400' 
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* TAB 1: Pitch & Brand */}
                {drawerTab === 'pitch' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Brand Name
                      </label>
                      <input 
                        type="text" 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        One-Line Tagline
                      </label>
                      <input 
                        type="text" 
                        value={editedTagline}
                        onChange={(e) => setEditedTagline(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Elevator Pitch
                      </label>
                      <textarea 
                        rows={6}
                        value={editedPitch}
                        onChange={(e) => setEditedPitch(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: Target Personas */}
                {drawerTab === 'personas' && (
                  <div className="space-y-8 divide-y divide-zinc-900">
                    {editedPersonas.map((persona, idx) => (
                      <div key={idx} className={`${idx > 0 ? 'pt-8' : ''} space-y-4`}>
                        <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Persona {idx + 1}: {persona.name || 'Unnamed Persona'}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                              Name
                            </label>
                            <input 
                              type="text" 
                              value={persona.name}
                              onChange={(e) => updatePersona(idx, 'name', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                              Job Title
                            </label>
                            <input 
                              type="text" 
                              value={persona.job_title}
                              onChange={(e) => updatePersona(idx, 'job_title', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                              Location
                            </label>
                            <input 
                              type="text" 
                              value={persona.location}
                              onChange={(e) => updatePersona(idx, 'location', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                              Willingness to Pay (e.g. $49/mo)
                            </label>
                            <input 
                              type="text" 
                              value={persona.willingness_to_pay}
                              onChange={(e) => updatePersona(idx, 'willingness_to_pay', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Primary Pain Point
                          </label>
                          <input 
                            type="text" 
                            value={persona.primary_pain}
                            onChange={(e) => updatePersona(idx, 'primary_pain', e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Direct Quote
                          </label>
                          <textarea 
                            rows={2}
                            value={persona.quote}
                            onChange={(e) => updatePersona(idx, 'quote', e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Bio/Context
                          </label>
                          <textarea 
                            rows={3}
                            value={persona.bio}
                            onChange={(e) => updatePersona(idx, 'bio', e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: Features */}
                {drawerTab === 'features' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Must-Have MVP Features Backlog
                      </h4>
                      <button 
                        onClick={addFeature}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-650/40 hover:bg-indigo-600/60 border border-indigo-900/60 text-xs font-bold text-indigo-400 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Feature
                      </button>
                    </div>

                    <div className="space-y-4">
                      {editedFeatures.map((feat, idx) => (
                        <div key={idx} className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-4 space-y-3 relative group">
                          <button
                            onClick={() => removeFeature(idx)}
                            className="absolute top-4 right-4 p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Feature Title
                            </label>
                            <input 
                              type="text" 
                              value={feat.name}
                              onChange={(e) => updateFeature(idx, 'name', e.target.value)}
                              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Value/Description
                            </label>
                            <input 
                              type="text" 
                              value={feat.description}
                              onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Mapped Persona Pain Point
                            </label>
                            <input 
                              type="text" 
                              value={feat.mapped_pain || ''}
                              onChange={(e) => updateFeature(idx, 'mapped_pain', e.target.value)}
                              placeholder="e.g. Inconsistent deployments across developers"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: Pricing */}
                {drawerTab === 'pricing' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                          Pricing Model Title
                        </label>
                        <input 
                          type="text" 
                          value={editedPricingModel}
                          onChange={(e) => setEditedPricingModel(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                          Model Rationale / Rationale Statement
                        </label>
                        <textarea 
                          rows={3}
                          value={editedPricingRationale}
                          onChange={(e) => setEditedPricingRationale(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Pricing Tiers
                        </h4>
                        <button 
                          onClick={addPricingTier}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-650/40 hover:bg-indigo-600/60 border border-indigo-900/60 text-xs font-bold text-indigo-400 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Tier
                        </button>
                      </div>

                      <div className="space-y-4">
                        {editedPricingTiers.map((tier, idx) => (
                          <div key={idx} className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-4 space-y-3 relative group">
                            <button
                              onClick={() => removePricingTier(idx)}
                              className="absolute top-4 right-4 p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                  Tier Name
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.name}
                                  onChange={(e) => updatePricingTier(idx, 'name', e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                  Price ($)
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.price}
                                  onChange={(e) => updatePricingTier(idx, 'price', e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                  Interval (e.g. month)
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.interval || ''}
                                  onChange={(e) => updatePricingTier(idx, 'interval', e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                  Description
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.description || ''}
                                  onChange={(e) => updatePricingTier(idx, 'description', e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                Features (comma-separated)
                              </label>
                              <input 
                                type="text" 
                                value={tier.features.join(', ')}
                                onChange={(e) => {
                                  const split = e.target.value.split(',').map((f) => f.trim()).filter(Boolean)
                                  updatePricingTier(idx, 'features', split)
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: Founder Preferences */}
                {drawerTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Display Name
                      </label>
                      <input 
                        type="text" 
                        value={editedDisplayName}
                        onChange={(e) => setEditedDisplayName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Technical Competence
                      </label>
                      <select
                        value={editedTechnicalLevel}
                        onChange={(e) => setEditedTechnicalLevel(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="beginner">Beginner (Non-technical / No-code)</option>
                        <option value="intermediate">Intermediate (Can write code with AI assistance)</option>
                        <option value="advanced">Advanced (Experienced Developer)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Weekly Hours Dedicated
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="80"
                          value={editedWeeklyHoursAvailable}
                          onChange={(e) => setEditedWeeklyHoursAvailable(Number(e.target.value))}
                          className="flex-1 accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-bold text-white text-base min-w-[40px] text-right">
                          {editedWeeklyHoursAvailable}h
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        AI Communication Tone
                      </label>
                      <select
                        value={editedCommunicationTone}
                        onChange={(e) => setEditedCommunicationTone(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="casual">Casual (Friendly co-founder / Informal)</option>
                        <option value="direct">Direct (Action-focused / Critical feedback)</option>
                        <option value="formal">Formal (Executive review / Data-driven)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Agent Execution Speed
                      </label>
                      <select
                        value={editedPreferredAgentSpeed}
                        onChange={(e) => setEditedPreferredAgentSpeed(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="fast">Fast (Quick iterations)</option>
                        <option value="thorough">Thorough (Multi-agent deep validation)</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-zinc-900 bg-zinc-900/10 flex justify-end gap-3">
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 border border-zinc-800 rounded-xl bg-zinc-900/40 text-sm font-semibold hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsDrawerOpen(false)
                  }}
                  className="px-6 py-2 bg-indigo-650 hover:bg-indigo-650/90 bg-indigo-600 rounded-xl text-sm font-bold text-white transition-colors"
                >
                  Save Changes
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
