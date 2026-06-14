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
  const [editedIndustry, setEditedIndustry] = useState('SaaS')
  const [editedStage, setEditedStage] = useState<'ideation' | 'validation' | 'building' | 'launching' | 'growing'>('ideation')

  // Founder preferences states
  const [editedDisplayName, setEditedDisplayName] = useState('')
  const [editedTechnicalLevel, setEditedTechnicalLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [editedWeeklyHoursAvailable, setEditedWeeklyHoursAvailable] = useState(20)
  const [editedCommunicationTone, setEditedCommunicationTone] = useState<'casual' | 'direct' | 'formal'>('direct')
  const [editedPreferredAgentSpeed, setEditedPreferredAgentSpeed] = useState<'fast' | 'thorough'>('thorough')

  // Load founder preferences and active startup on mount
  useEffect(() => {
    const loadFounderPrefsAndStartup = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // 1. Fetch founder preferences
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

          // 2. Fetch active startup record
          const { data: startup, error: startupError } = await supabase
            .from('startups')
            .select('industry, stage')
            .eq('founder_id', user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (!startupError && startup) {
            if (startup.industry) {
              setEditedIndustry(startup.industry)
            }
            if (startup.stage) {
              setEditedStage(startup.stage as any)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load founder preferences or startup details:', err)
      }
    }
    loadFounderPrefsAndStartup()
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
    let active = true

    const checkCrystallizer = async () => {
      try {
        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message')
          .eq('id', crystallizerRunId)
          .maybeSingle()

        if (error) throw error
        if (run && active) {
          const status = run.status as any
          const targetStatus = status === 'partial' ? 'success' : status
          setCrystallizerStatus(targetStatus)
          if (targetStatus === 'success') {
            if (crystallizerInterval) clearInterval(crystallizerInterval)
            await fetchCrystallizerOutput(crystallizerRunId)
            return true
          } else if (targetStatus === 'error') {
            if (crystallizerInterval) clearInterval(crystallizerInterval)
            setCrystallizerError(run.error_message || 'Idea crystallization failed.')
            return true
          }
        }
      } catch (err) {
        console.error('Error polling/checking crystallizer status:', err)
      }
      return false
    }

    const checkIcp = async () => {
      try {
        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message')
          .eq('id', icpRunId)
          .maybeSingle()

        if (error) throw error
        if (run && active) {
          const status = run.status as any
          const targetStatus = status === 'partial' ? 'success' : status
          setIcpStatus(targetStatus)
          if (targetStatus === 'success') {
            if (icpInterval) clearInterval(icpInterval)
            await fetchIcpOutput(icpRunId)
            return true
          } else if (targetStatus === 'error') {
            if (icpInterval) clearInterval(icpInterval)
            setIcpError(run.error_message || 'ICP definition failed.')
            return true
          }
        }
      } catch (err) {
        console.error('Error polling/checking ICP status:', err)
      }
      return false
    }

    if (crystallizerRunId && crystallizerStatus !== 'success' && crystallizerStatus !== 'error') {
      checkCrystallizer().then((done) => {
        if (!done && active) {
          crystallizerInterval = setInterval(checkCrystallizer, 2500)
        }
      })
    }

    if (icpRunId && icpStatus !== 'success' && icpStatus !== 'error') {
      checkIcp().then((done) => {
        if (!done && active) {
          icpInterval = setInterval(checkIcp, 2500)
        }
      })
    }

    return () => {
      active = false
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

      // Update active startup profile with user edits
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: startupUpdateErr } = await supabase
          .from('startups')
          .update({
            name: editedName,
            tagline: editedTagline,
            description: editedPitch.slice(0, 500),
            industry: editedIndustry,
            stage: editedStage
          })
          .eq('founder_id', user.id)
          .eq('is_active', true)

        if (startupUpdateErr) {
          console.warn('Failed to update startup with customized details:', startupUpdateErr)
        }
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
          industry: editedIndustry,
          targetAudience: updatedBriefPayload.value_proposition.for_whom,
          stage: editedStage,
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#050505] border border-[#1a1a1a] text-[#6366f1] text-[11px] font-mono font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          03 // Blueprint Synthesis
        </div>
        <h1 className="text-4xl font-bold tracking-[-0.025em] text-white font-display sm:text-5xl">
          Crystallizing Your Product Blueprint
        </h1>
        <p className="mt-3 text-sm text-[#a1a1a1] max-w-2xl mx-auto leading-relaxed">
          Our co-founding agent network is analyzing market signals, structuring buyer personas, mapping pains to features, and designing monetization tiers.
        </p>
      </div>

      {/* 2. Loading Checklist Interface (Shows when agent pipelines are executing) */}
      {isPolling && (
        <div className="max-w-4xl mx-auto w-full px-4 mb-12 animate-reveal">
          {(() => {
            const briefLogs = [];
            briefLogs.push("[SYS] Pipeline initialized. Establishing session keys...");
            if (crystallizerStatus === 'queued') {
              briefLogs.push("[WAIT] Crystallizer-Agent queued on compute cluster...");
            } else if (crystallizerStatus === 'running') {
              briefLogs.push("[OK] Crystallizer-Agent handoff complete.");
              briefLogs.push("[RUN] Idea Crystallizer: Analyzing user inputs against SaaS benchmarks...");
              briefLogs.push("[RUN] Idea Crystallizer: Extracting core elevator pitch...");
            } else if (crystallizerStatus === 'success') {
              briefLogs.push("[OK] Crystallizer-Agent handoff complete.");
              briefLogs.push("[OK] Idea Crystallizer: Value proposition synthesized.");
              briefLogs.push("[OK] Idea Crystallizer: Must-have feature list structured.");
            } else if (crystallizerStatus === 'error') {
              briefLogs.push("[ERR] Idea Crystallizer: " + (crystallizerError || "Failed to structure idea."));
            }

            if (icpStatus === 'queued') {
              briefLogs.push("[WAIT] ICP-Definer queued. Awaiting upstream token...");
            } else if (icpStatus === 'running') {
              briefLogs.push("[OK] ICP-Definer: Connection open. Seeding demographic parameters...");
              briefLogs.push("[RUN] ICP-Definer: Evaluating job titles and willingess-to-pay threshold...");
              briefLogs.push("[RUN] ICP-Definer: Generating 3 representative buyer personas...");
            } else if (icpStatus === 'success') {
              briefLogs.push("[OK] ICP-Definer: Target demographic mapped.");
              briefLogs.push("[OK] ICP-Definer: Bio, quote, and willingness-to-pay values resolved.");
            } else if (icpStatus === 'error') {
              briefLogs.push("[ERR] ICP-Definer: " + (icpError || "Failed to resolve personas."));
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left Column: Co-Founder Agent Execution Board */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#0c0c0f]/40 backdrop-blur-xl border border-[#1a1a1a] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#6366f1]/20 to-transparent" />
                    
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-xs font-mono font-bold text-[#525252] uppercase tracking-wider">
                          CO-FOUNDER BOARD EXECUTION
                        </h2>
                        <p className="text-[10px] text-[#737373] mt-0.5 font-mono">
                          Multi-Agent pipeline generating startup blueprint
                        </p>
                      </div>
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366f1] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6366f1]"></span>
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {[
                        { name: "Crystallizer Agent", desc: "Synthesizing elevator pitch & value proposition", status: crystallizerStatus },
                        { name: "ICP Definer Agent", desc: "Structuring target audience & persona profiles", status: icpStatus },
                        { name: "Monetization Architect", desc: "Designing monetization tiers & value mappings", status: crystallizerStatus === 'success' && icpStatus === 'success' ? 'success' : (crystallizerStatus === 'running' || icpStatus === 'running' ? 'running' : 'queued') }
                      ].map((agent, aIdx) => (
                        <div key={aIdx} className={`p-4 rounded-xl border transition-colors duration-300 ${
                          agent.status === 'success' ? 'border-emerald-500/10 bg-emerald-500/[0.01]' :
                          agent.status === 'running' ? 'border-[#6366f1]/20 bg-[#6366f1]/[0.02]' :
                          'border-[#1a1a1a] opacity-50 bg-[#050505]/20'
                        }`}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-white font-mono">{agent.name}</span>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                              agent.status === 'success' ? 'bg-emerald-500/10 text-emerald-450' :
                              agent.status === 'running' ? 'bg-[#6366f1]/10 text-[#6366f1] animate-pulse' :
                              'bg-[#1a1a1a] text-[#525252]'
                            }`}>
                              {agent.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#737373] leading-relaxed font-sans">{agent.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Console Stream Logger */}
                <div className="lg:col-span-5 bg-[#0c0c0f]/40 backdrop-blur-xl border border-[#1a1a1a] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[380px] scanline-effect">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#6366f1]/20 to-transparent" />
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-3">
                      <span className="text-[10px] font-bold text-[#525252] uppercase tracking-widest font-mono">
                        TELEMETRY FEED // CONSOLE_02
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1]/60 animate-pulse" />
                    </div>
                    
                    <div className="font-mono text-[10px] space-y-2 leading-relaxed text-[#737373]">
                      {briefLogs.map((log, index) => {
                        const isLast = index === briefLogs.length - 1;
                        const isErr = log.includes("[ERR]");
                        const isOk = log.includes("[OK]");
                        return (
                          <div key={index} className={`flex items-start gap-2.5 transition-all duration-300 ${isLast ? 'text-[#e5e5e5] font-semibold' : ''}`}>
                            <span className="text-[#525252] shrink-0 select-none">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                            <span className={isErr ? 'text-rose-400' : isOk ? 'text-emerald-400/90' : ''}>
                              {log}
                              {isLast && <span className="inline-block w-1.5 h-3 bg-[#6366f1] ml-1 animate-pulse" />}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex justify-between items-center text-[9px] font-mono text-[#525252]">
                    <span>STATUS: ARCHITECTING_STRATEGY</span>
                    <span>AGENT COUNT: 3 ACTIVE</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {isFailed && (
            <div className="mt-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-center max-w-xl mx-auto">
              <p className="text-xs text-rose-400 font-medium leading-normal">
                We encountered an agent runtime failure. Error diagnostics: {crystallizerError || icpError || "Unknown connection drop"}. Please reload or contact support.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Output Dashboard Section (Revealed incrementally when loaded) */}
      {!isPolling && productBrief && icpDocument && (
        <div className="max-w-5xl mx-auto w-full px-4 space-y-12 animate-reveal">
          
          {/* Summary Panel */}
          <div className="flex justify-between items-center bg-[#0c0c0f]/40 backdrop-blur-xl border border-[#1a1a1a] rounded-xl p-4 px-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-[#737373] uppercase tracking-wider">
                Opportunity blueprint generated successfully
              </span>
            </div>
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#050505] border border-[#1a1a1a] hover:border-[#262626] text-xs font-semibold text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
            >
              <PenSquare className="w-3.5 h-3.5" />
              Customize Blueprint
            </button>
          </div>

          {/* Section 1: Name and Pitch */}
          {revealedIndex >= 1 && (
            <div className="transition-all duration-700 transform translate-y-0 opacity-100">
              <div className="bg-[#0c0c0f]/40 backdrop-blur-xl border border-[#1a1a1a] rounded-2xl p-8 relative hover:border-[#262626] transition-all duration-300 group shadow-lg">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#6366f1]/25 to-transparent" />
                
                <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#525252] block mb-1">01 // BRAND IDENTITY</span>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent font-display">
                      {editedName}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-[#6366f1] border border-[#6366f1]/30 bg-[#6366f1]/5 px-2.5 py-0.5 rounded-full font-semibold">
                    "{editedTagline}"
                  </span>
                </div>

                <div className="mt-6 border-t border-[#1a1a1a] pt-4">
                  <h4 className="text-[#525252] font-bold text-[10px] uppercase font-mono tracking-wider mb-2">Elevator Pitch Description</h4>
                  <p className="text-[#a1a1a1] text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {editedPitch}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Target Personas */}
          {revealedIndex >= 2 && (
            <div className="transition-all duration-700 transform translate-y-0 opacity-100 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
                <User className="w-4 h-4 text-[#6366f1]" />
                <h3 className="text-xs font-mono font-bold text-[#525252] uppercase tracking-widest">
                  02 // Target Customer Personas
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {editedPersonas.slice(0, 3).map((persona, idx) => {
                  const personaId = `0${idx + 1}`;
                  return (
                    <div 
                      key={idx} 
                      className="bg-[#0c0c0f]/20 backdrop-blur-sm border border-[#1a1a1a] rounded-xl p-6 relative flex flex-col justify-between hover:border-[#262626] transition-colors duration-205 shadow-md group animate-reveal"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#1a1a1a] flex items-center justify-center text-[#737373] shrink-0 font-mono text-xs font-semibold">
                            P{idx + 1}
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-[#525252] block">PERSONA_{personaId}</span>
                            <h4 className="text-sm font-bold text-white">{persona.name}</h4>
                            <p className="text-[10px] text-[#737373] font-mono mt-0.5">
                              {persona.job_title} • Age {persona.age}
                            </p>
                          </div>
                        </div>
                        
                        <div className="border-l border-[#6366f1]/40 pl-4 py-1.5 my-4 italic text-[#a1a1a1] text-xs leading-relaxed font-sans">
                          "{persona.quote}"
                        </div>
                        
                        <div className="space-y-3.5 pt-2">
                          <div>
                            <span className="text-[9px] uppercase font-mono font-bold text-[#6366f1]/80 block tracking-widest mb-0.5">
                              PRIMARY_PAIN
                            </span>
                            <p className="text-[#a1a1a1] text-xs leading-relaxed line-clamp-3">
                              {persona.primary_pain}
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-mono font-bold text-[#525252] block tracking-widest mb-0.5">
                              BACKGROUND_CONTEXT
                            </span>
                            <p className="text-[#737373] text-xs leading-relaxed line-clamp-3">
                              {persona.bio}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex justify-between items-center text-xs">
                        <span className="text-[#525252] font-mono">WILLINGNESS_TO_PAY:</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#1a1a1a] text-[#737373] text-[10px] font-mono font-semibold">
                          {persona.willingness_to_pay}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Must-Have Features */}
          {revealedIndex >= 3 && (
            <div className="transition-all duration-700 transform translate-y-0 opacity-100 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
                <Layers className="w-4 h-4 text-[#6366f1]" />
                <h3 className="text-xs font-mono font-bold text-[#525252] uppercase tracking-widest">
                  03 // Must-Have MVP Features Backlog
                </h3>
              </div>
              <div className="bg-[#0c0c0f]/20 backdrop-blur-sm border border-[#1a1a1a] rounded-xl p-6 divide-y divide-[#1a1a1a] shadow-md">
                {editedFeatures.map((feat, idx) => (
                  <div key={idx} className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${idx === 0 ? 'pt-0' : ''} ${idx === editedFeatures.length - 1 ? 'pb-0' : ''}`}>
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#6366f1]" />
                        <h4 className="text-sm font-bold text-white font-display">{feat.name}</h4>
                      </div>
                      <p className="text-[#a1a1a1] text-xs mt-1 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                    {feat.mapped_pain && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#1a1a1a] text-[#737373] text-[10px] font-mono max-w-xs truncate">
                          RESOLVES: {feat.mapped_pain}
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
              <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
                <Coins className="w-4 h-4 text-[#6366f1]" />
                <h3 className="text-xs font-mono font-bold text-[#525252] uppercase tracking-widest">
                  04 // Monetization & Pricing Hypothesis
                </h3>
              </div>
              <div className="bg-[#0c0c0f]/20 backdrop-blur-sm border border-[#1a1a1a] rounded-xl p-6 shadow-md mb-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-2">
                  <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#1a1a1a] pb-6 md:pb-0 pr-0 md:pr-6">
                    <span className="text-[9px] uppercase font-mono font-bold text-[#525252] tracking-wider">
                      Pricing Model
                    </span>
                    <h4 className="text-base font-bold text-white mt-1 capitalize font-display">
                      {editedPricingModel}
                    </h4>
                    <p className="text-[#a1a1a1] text-xs mt-2 leading-relaxed">
                      {editedPricingRationale}
                    </p>
                  </div>
                  
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 pl-0 md:pl-6">
                    {editedPricingTiers.map((tier, idx) => (
                      <div key={idx} className="border border-[#1a1a1a] bg-[#050505]/20 rounded-2xl p-6 hover:border-[#262626] transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-[#e5e5e5] font-mono tracking-wider uppercase">{tier.name}</h4>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-white font-display">${tier.price}</span>
                              {tier.interval && <span className="text-[10px] text-[#525252] block font-mono">/{tier.interval}</span>}
                            </div>
                          </div>
                          {tier.description && (
                            <p className="text-[#a1a1a1] text-[11px] mt-2 border-t border-[#1a1a1a] pt-2 mb-3 leading-relaxed">
                              {tier.description}
                            </p>
                          )}
                        </div>
                        <ul className="space-y-1.5 mt-3 border-t border-[#1a1a1a] pt-3">
                          {(tier.features || []).slice(0, 4).map((f, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-1.5 text-[#a1a1a1] text-[10.5px]">
                              <Check className="w-3.5 h-3.5 text-[#6366f1] flex-shrink-0" />
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
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#050505]/95 backdrop-blur-md border-t border-[#1a1a1a] py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 animate-reveal">
          <div className="text-center sm:text-left">
            <span className="text-[9px] text-[#525252] block uppercase font-bold tracking-widest font-mono">
              Onboarding: Product brief confirmation
            </span>
            <span className="text-sm font-bold text-[#e5e5e5] font-display">
              Launch roadmap blueprinting for <span className="text-[#6366f1]">{editedName || 'your startup'}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 border border-[#1a1a1a] rounded-lg bg-[#050505]/60 hover:bg-[#0c0c0f] text-xs font-semibold text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
            >
              Modify Details
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#5558e6] rounded-lg text-xs font-bold text-white transition-all hover:scale-[1.01] shadow-lg shadow-[#6366f1]/10 disabled:opacity-50 cursor-pointer"
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
            <div className="w-screen max-w-2xl bg-[#050505]/95 backdrop-blur-xl border-l border-[#1a1a1a] shadow-2xl flex flex-col h-full">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-[#1a1a1a] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#e5e5e5] flex items-center gap-2 font-display">
                    <PenSquare className="w-5 h-5 text-[#6366f1]" />
                    Customize Product Blueprint
                  </h3>
                  <p className="text-[11px] text-[#525252] mt-0.5">
                    Fine-tune target personas, core feature sets, and pricing layout before executing roadmaps.
                  </p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-900 text-[#737373] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex border-b border-[#1a1a1a] bg-[#050505]/40 px-6">
                {[
                  { id: 'pitch', label: 'PITCH & BRAND' },
                  { id: 'personas', label: 'PERSONAS' },
                  { id: 'features', label: 'FEATURES' },
                  { id: 'pricing', label: 'PRICING' },
                  { id: 'preferences', label: 'MY SETTINGS' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDrawerTab(t.id as any)}
                    className={`py-3.5 px-4 text-[10px] font-mono font-bold border-b-2 transition-all cursor-pointer ${
                      drawerTab === t.id 
                        ? 'border-[#6366f1] text-[#6366f1]' 
                        : 'border-transparent text-[#525252] hover:text-[#a1a1a1]'
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
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Brand Name
                      </label>
                      <input 
                        type="text" 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        One-Line Tagline
                      </label>
                      <input 
                        type="text" 
                        value={editedTagline}
                        onChange={(e) => setEditedTagline(e.target.value)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Elevator Pitch
                      </label>
                      <textarea 
                        rows={6}
                        value={editedPitch}
                        onChange={(e) => setEditedPitch(e.target.value)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors resize-none leading-relaxed font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Industry
                      </label>
                      <input 
                        type="text" 
                        value={editedIndustry}
                        onChange={(e) => setEditedIndustry(e.target.value)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Startup Stage
                      </label>
                      <select 
                        value={editedStage}
                        onChange={(e) => setEditedStage(e.target.value as any)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                      >
                        <option value="ideation" className="bg-[#0c0c0f] text-[#e5e5e5]">Ideation</option>
                        <option value="validation" className="bg-[#0c0c0f] text-[#e5e5e5]">Validation</option>
                        <option value="building" className="bg-[#0c0c0f] text-[#e5e5e5]">Building</option>
                        <option value="launching" className="bg-[#0c0c0f] text-[#e5e5e5]">Launching</option>
                        <option value="growing" className="bg-[#0c0c0f] text-[#e5e5e5]">Growing</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 2: Target Personas */}
                {drawerTab === 'personas' && (
                  <div className="space-y-8 divide-y divide-[#1a1a1a]">
                    {editedPersonas.map((persona, idx) => (
                      <div key={idx} className={`${idx > 0 ? 'pt-8' : ''} space-y-4`}>
                        <h4 className="text-xs font-mono font-bold text-[#6366f1] flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          PERSONA_0{idx + 1} // {persona.name || 'Unnamed Persona'}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                              Name
                            </label>
                            <input 
                              type="text" 
                              value={persona.name}
                              onChange={(e) => updatePersona(idx, 'name', e.target.value)}
                              className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                              Job Title
                            </label>
                            <input 
                              type="text" 
                              value={persona.job_title}
                              onChange={(e) => updatePersona(idx, 'job_title', e.target.value)}
                              className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                              Location
                            </label>
                            <input 
                              type="text" 
                              value={persona.location}
                              onChange={(e) => updatePersona(idx, 'location', e.target.value)}
                              className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                              Willingness to Pay
                            </label>
                            <input 
                              type="text" 
                              value={persona.willingness_to_pay}
                              onChange={(e) => updatePersona(idx, 'willingness_to_pay', e.target.value)}
                              className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                            Primary Pain Point
                          </label>
                          <input 
                            type="text" 
                            value={persona.primary_pain}
                            onChange={(e) => updatePersona(idx, 'primary_pain', e.target.value)}
                            className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                            Direct Quote
                          </label>
                          <textarea 
                            rows={2}
                            value={persona.quote}
                            onChange={(e) => updatePersona(idx, 'quote', e.target.value)}
                            className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none resize-none font-sans leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                            Bio/Context
                          </label>
                          <textarea 
                            rows={3}
                            value={persona.bio}
                            onChange={(e) => updatePersona(idx, 'bio', e.target.value)}
                            className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none resize-none font-sans leading-relaxed"
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
                      <h4 className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider">
                        Must-Have MVP Features Backlog
                      </h4>
                      <button 
                        onClick={addFeature}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6366f1]/10 hover:bg-[#6366f1]/20 border border-[#6366f1]/20 text-xs font-mono font-bold text-[#6366f1] transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Feature
                      </button>
                    </div>

                    <div className="space-y-4">
                      {editedFeatures.map((feat, idx) => (
                        <div key={idx} className="bg-[#050505]/40 border border-[#1a1a1a] rounded-xl p-4 space-y-3 relative group">
                          <button
                            onClick={() => removeFeature(idx)}
                            className="absolute top-4 right-4 p-1 rounded hover:bg-zinc-900 text-[#525252] hover:text-rose-450 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                              Feature Title
                            </label>
                            <input 
                              type="text" 
                              value={feat.name}
                              onChange={(e) => updateFeature(idx, 'name', e.target.value)}
                              className="w-full max-w-md bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                              Value/Description
                            </label>
                            <input 
                              type="text" 
                              value={feat.description}
                              onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                              className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                              Mapped Persona Pain Point
                            </label>
                            <input 
                              type="text" 
                              value={feat.mapped_pain || ''}
                              onChange={(e) => updateFeature(idx, 'mapped_pain', e.target.value)}
                              placeholder="e.g. Inconsistent deployments across developers"
                              className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
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
                        <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                          Pricing Model Title
                        </label>
                        <input 
                          type="text" 
                          value={editedPricingModel}
                          onChange={(e) => setEditedPricingModel(e.target.value)}
                          className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                          Model Rationale / Rationale Statement
                        </label>
                        <textarea 
                          rows={3}
                          value={editedPricingRationale}
                          onChange={(e) => setEditedPricingRationale(e.target.value)}
                          className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2 text-xs focus:outline-none resize-none font-sans leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="border-t border-[#1a1a1a] pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider">
                          Pricing Tiers
                        </h4>
                        <button 
                          onClick={addPricingTier}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6366f1]/10 hover:bg-[#6366f1]/20 border border-[#6366f1]/20 text-xs font-mono font-bold text-[#6366f1] transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Tier
                        </button>
                      </div>

                      <div className="space-y-4">
                        {editedPricingTiers.map((tier, idx) => (
                          <div key={idx} className="bg-[#050505]/40 border border-[#1a1a1a] rounded-xl p-4 space-y-3 relative group">
                            <button
                              onClick={() => removePricingTier(idx)}
                              className="absolute top-4 right-4 p-1 rounded hover:bg-zinc-900 text-[#525252] hover:text-rose-450 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-2">
                                <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                                  Tier Name
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.name}
                                  onChange={(e) => updatePricingTier(idx, 'name', e.target.value)}
                                  className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                                  Price ($)
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.price}
                                  onChange={(e) => updatePricingTier(idx, 'price', e.target.value)}
                                  className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                                  Interval (e.g. month)
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.interval || ''}
                                  onChange={(e) => updatePricingTier(idx, 'interval', e.target.value)}
                                  className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                                  Description
                                </label>
                                <input 
                                  type="text" 
                                  value={tier.description || ''}
                                  onChange={(e) => updatePricingTier(idx, 'description', e.target.value)}
                                  className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1">
                                Features (comma-separated)
                              </label>
                              <input 
                                type="text" 
                                value={(tier.features || []).join(', ')}
                                onChange={(e) => {
                                  const split = e.target.value.split(',').map((f) => f.trim()).filter(Boolean)
                                  updatePricingTier(idx, 'features', split)
                                }}
                                className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
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
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Display Name
                      </label>
                      <input 
                        type="text" 
                        value={editedDisplayName}
                        onChange={(e) => setEditedDisplayName(e.target.value)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Technical Competence
                      </label>
                      <select
                        value={editedTechnicalLevel}
                        onChange={(e) => setEditedTechnicalLevel(e.target.value as any)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="beginner">Beginner (Non-technical / No-code)</option>
                        <option value="intermediate">Intermediate (Can write code with AI assistance)</option>
                        <option value="advanced">Advanced (Experienced Developer)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Weekly Hours Dedicated
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="80"
                          value={editedWeeklyHoursAvailable}
                          onChange={(e) => setEditedWeeklyHoursAvailable(Number(e.target.value))}
                          className="flex-1 accent-[#6366f1] h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-bold text-white text-base min-w-[40px] text-right">
                          {editedWeeklyHoursAvailable}h
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        AI Communication Tone
                      </label>
                      <select
                        value={editedCommunicationTone}
                        onChange={(e) => setEditedCommunicationTone(e.target.value as any)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="casual">Casual (Friendly co-founder / Informal)</option>
                        <option value="direct">Direct (Action-focused / Critical feedback)</option>
                        <option value="formal">Formal (Executive review / Data-driven)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider mb-1.5">
                        Agent Execution Speed
                      </label>
                      <select
                        value={editedPreferredAgentSpeed}
                        onChange={(e) => setEditedPreferredAgentSpeed(e.target.value as any)}
                        className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 text-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="fast">Fast (Quick iterations)</option>
                        <option value="thorough">Thorough (Multi-agent deep validation)</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-[#1a1a1a] bg-zinc-950/20 flex justify-end gap-3">
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 border border-[#1a1a1a] rounded-lg bg-[#050505]/60 hover:bg-[#0c0c0f] text-xs font-semibold text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsDrawerOpen(false)
                  }}
                  className="px-6 py-2 bg-[#6366f1] hover:bg-[#5558e6] rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
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
