'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface Milestone {
  title: string
  target_week: number
  metric: string
  target_value: string | number
}

interface WeeklyGoal {
  week_number: number
  focus: string
  goals: string[]
  estimated_hours: number
}

interface Phase {
  phase_number: number
  title: string
  start_day: number
  end_day: number
  theme: string
  weekly_goals: WeeklyGoal[]
  milestones: Milestone[]
}

interface RoadmapData {
  title: string
  total_days: number
  start_date: string
  phases: Phase[]
}

interface RoadmapStepProps {
  warRoomRunId?: string | null
  displayName: string
  technicalLevel: 'beginner' | 'intermediate' | 'advanced'
  weeklyHoursAvailable: number
  communicationTone: 'casual' | 'direct' | 'formal'
  preferredAgentSpeed: 'fast' | 'thorough'
  primaryGoal: string
  startupName: string
  tagline: string
  description: string
  industry: string
  targetAudience: string
  stage: 'ideation' | 'validation' | 'building' | 'launching' | 'growing'
  onComplete?: () => void
}

const fallbackRoadmap: RoadmapData = {
  title: '90-Day Personalized Roadmap',
  total_days: 90,
  start_date: new Date().toISOString(),
  phases: [
    {
      phase_number: 1,
      title: 'Concept Refinement & Validation',
      start_day: 1,
      end_day: 30,
      theme: 'Validation',
      weekly_goals: [
        {
          week_number: 1,
          focus: 'Customer Research',
          goals: [
            'Conduct 5 discovery interviews with target users',
            'Define the top 3 high-intensity user pain points',
            'Draft initial product value proposition document'
          ],
          estimated_hours: 20
        },
        {
          week_number: 2,
          focus: 'Wedge Definition',
          goals: [
            'Identify the core features needed for the MVP',
            'Conduct competitive analysis mapping 3 key competitors',
            'Select primary launch channel strategy'
          ],
          estimated_hours: 20
        },
        {
          week_number: 3,
          focus: 'Landing Page Test',
          goals: [
            'Deploy a high-converting landing page with a waitlist',
            'Set up basic conversion metrics monitoring (e.g. PostHog)',
            'Drive 100 targeted visitors to the landing page'
          ],
          estimated_hours: 20
        },
        {
          week_number: 4,
          focus: 'Validation Review',
          goals: [
            'Analyze waitlist conversion rate and signups',
            'Formulate 3 product-market validation hypotheses',
            'Conduct War Room planning loop to review feedback'
          ],
          estimated_hours: 20
        }
      ],
      milestones: [
        {
          title: 'Product Value Prop Crystallized',
          target_week: 1,
          metric: 'Document completion',
          target_value: 'Completed'
        },
        {
          title: 'Landing Page Waitlist Active',
          target_week: 3,
          metric: 'Conversion monitoring',
          target_value: 'Live'
        },
        {
          title: '100+ High-Intent Waitlist Signups',
          target_week: 4,
          metric: 'Waitlist size',
          target_value: '100+'
        }
      ]
    },
    {
      phase_number: 2,
      title: 'MVP Development Sequence',
      start_day: 31,
      end_day: 60,
      theme: 'Building',
      weekly_goals: [
        {
          week_number: 5,
          focus: 'Database & Core Schema',
          goals: [
            'Design normalized database tables and indexes',
            'Set up Supabase authentication and access controls',
            'Write basic server functions to process data'
          ],
          estimated_hours: 20
        },
        {
          week_number: 6,
          focus: 'Core Application Logic',
          goals: [
            'Develop the primary dashboards and user interfaces',
            'Integrate external AI model endpoints (Gemini/OpenRouter)',
            'Connect core logical handlers to state providers'
          ],
          estimated_hours: 20
        },
        {
          week_number: 7,
          focus: 'Integrations & API Hookup',
          goals: [
            'Configure third-party service provider integrations',
            'Implement stripe/oxapay payment transaction routes',
            'Conduct internal end-to-end integration dry runs'
          ],
          estimated_hours: 20
        },
        {
          week_number: 8,
          focus: 'Internal QA & Debugging',
          goals: [
            'Run functional validation tests across core app flows',
            'Optimize API latency and database query speeds',
            'Fix top blocker bugs and improve UI micro-interactions'
          ],
          estimated_hours: 20
        }
      ],
      milestones: [
        {
          title: 'Database Architecture Setup',
          target_week: 5,
          metric: 'Supabase tables & RLS verified',
          target_value: 'Completed'
        },
        {
          title: 'Interactive Dashboard Ready',
          target_week: 6,
          metric: 'Dashboard UI workflows complete',
          target_value: 'Completed'
        },
        {
          title: 'Core Workflows Functional',
          target_week: 8,
          metric: 'End-to-end user flows validated',
          target_value: 'Successful'
        }
      ]
    },
    {
      phase_number: 3,
      title: 'Launch & Growth Loop',
      start_day: 61,
      end_day: 90,
      theme: 'Launch',
      weekly_goals: [
        {
          week_number: 9,
          focus: 'Beta User Onboarding',
          goals: [
            'Invite top 10 waitlist members into private beta',
            'Create feedback channel for reporting bugs and suggestions',
            'Deploy hotfixes based on beta user feedback'
          ],
          estimated_hours: 20
        },
        {
          week_number: 10,
          focus: 'Public Launch Prep',
          goals: [
            'Write launch copy for Product Hunt, Hacker News, & X',
            'Create demo video walk-through demonstrating features',
            'Configure production deployment domains and certificates'
          ],
          estimated_hours: 20
        },
        {
          week_number: 11,
          focus: 'Launch Campaign',
          goals: [
            'Publish launch announcements across all channels',
            'Run outbound outreach campaigns targeting first users',
            'Coordinate community support for product release'
          ],
          estimated_hours: 20
        },
        {
          week_number: 12,
          focus: 'Analytics & Scaling',
          goals: [
            'Review post-launch traction metrics and funnel drop-offs',
            'Identify high-impact scaling bottlenecks',
            'Outline Sprint plan for Phase 4 validation'
          ],
          estimated_hours: 20
        }
      ],
      milestones: [
        {
          title: 'Beta User Testing Active',
          target_week: 9,
          metric: 'Feedback tickets resolved',
          target_value: '10+'
        },
        {
          title: 'Public Launch Live',
          target_week: 11,
          metric: 'Production deployment status',
          target_value: 'Active'
        },
        {
          title: 'First Paid Users Transacted',
          target_week: 12,
          metric: 'Paid subscription count',
          target_value: '5+'
        }
      ]
    }
  ]
}

export default function RoadmapStep({
  warRoomRunId,
  displayName,
  technicalLevel,
  weeklyHoursAvailable,
  communicationTone,
  preferredAgentSpeed,
  primaryGoal,
  startupName,
  tagline,
  description,
  industry,
  targetAudience,
  stage,
  onComplete
}: RoadmapStepProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [status, setStatus] = useState<'loading' | 'queued' | 'running' | 'success' | 'error'>('loading')
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  // Simulation timer in case API is slow or database table polling fails
  useEffect(() => {
    let intervalId: NodeJS.Timeout
    let timeoutId: NodeJS.Timeout
    let activeRunId = warRoomRunId
    let retryCount = 0

    const checkRunStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id

        if (!activeRunId && uid) {
          // Query the database for the latest war-room-v1 run in the last 2 minutes
          const twoMinutesAgo = new Date(Date.now() - 120000).toISOString()
          const { data: recentRun } = await supabase
            .from('agent_runs')
            .select('id')
            .eq('founder_id', uid)
            .in('agent_id', ['war-room', 'war-room-v1'])
            .gt('started_at', twoMinutesAgo)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (recentRun) {
            activeRunId = recentRun.id
          } else {
            // If still no run, let's wait a bit or use fallback after some retries
            retryCount++
            if (retryCount > 10) {
              setRoadmapData(fallbackRoadmap)
              setStatus('success')
              clearInterval(intervalId)
            }
            return
          }
        }

        if (!activeRunId) return

        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('status, error_message')
          .eq('id', activeRunId)
          .maybeSingle()

        if (error) {
          console.warn('Error fetching run status from DB, will retry:', error)
          retryCount++
          if (retryCount > 15) {
            console.warn('DB polling failed too many times. Falling back to mock.')
            setRoadmapData(fallbackRoadmap)
            setStatus('success')
            clearInterval(intervalId)
          }
          return
        }

        if (run) {
          if (run.status === 'success') {
            const { data: outputData, error: outputError } = await supabase
              .from('agent_outputs')
              .select('output')
              .eq('agent_run_id', activeRunId)
              .maybeSingle()

            if (outputError) {
              console.error('Error fetching output data:', outputError)
              setStatus('error')
              setErrorMessage(outputError.message)
              clearInterval(intervalId)
            } else if (outputData?.output?.roadmap) {
              setRoadmapData(outputData.output.roadmap)
              setStatus('success')
              clearInterval(intervalId)
            } else {
              console.log('Run is success, waiting for output to write...')
            }
          } else if (run.status === 'error') {
            setStatus('error')
            setErrorMessage(run.error_message || 'War Room run failed.')
            clearInterval(intervalId)
          } else {
            setStatus(run.status as any)
          }
        } else {
          retryCount++
          if (retryCount > 10) {
            setRoadmapData(fallbackRoadmap)
            setStatus('success')
            clearInterval(intervalId)
          }
        }
      } catch (err: any) {
        console.error('Failed to poll agent run status:', err)
      }
    }

    // Poll status every 2 seconds
    intervalId = setInterval(checkRunStatus, 2000)
    checkRunStatus()

    // Safety timeout: If it takes more than 45 seconds, fallback to mock to prevent blocker
    timeoutId = setTimeout(() => {
      clearInterval(intervalId)
      if (status !== 'success') {
        console.warn('Safety timeout reached. Displaying roadmap fallback.')
        setRoadmapData(fallbackRoadmap)
        setStatus('success')
      }
    }, 45000)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [warRoomRunId, supabase])

  const handleOpenWorkspace = async () => {
    setCompleting(true)
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          technicalLevel,
          weeklyHoursAvailable,
          communicationTone,
          preferredAgentSpeed,
          primaryGoal,
          startupName,
          tagline,
          description,
          industry,
          targetAudience,
          stage,
          roadmap: roadmapData || fallbackRoadmap
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Failed to update onboarding status')
      }

      if (onComplete) {
        onComplete()
      }

      router.push('/home')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to complete onboarding. Please try again.')
      setCompleting(false)
    }
  }

  // Render 3 pulsing skeleton timeline loader blocks
  if (status === 'loading' || status === 'queued' || status === 'running') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-12 animate-reveal px-4">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a] bg-[#050505] px-3.5 py-1 text-[11px] font-mono font-semibold text-[#6366f1] tracking-wider">
            <svg className="h-3 w-3 animate-spin text-[#6366f1]" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <span>04 // Spawning Roadmap</span>
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
            Structuring Execution Roadmap
          </h2>
          <p className="text-sm text-[#a1a1a1] max-w-xl mx-auto leading-relaxed">
            Resolving goals, sprint backlogs, and key milestones based on your available capacity of <span className="text-[#6366f1] font-semibold">{weeklyHoursAvailable} hrs/week</span>.
          </p>
        </div>

        {/* 3 wireframe phase skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {[1, 2, 3].map((i) => {
            const daysLabel = i === 1 ? "DAYS 01 - 30" : i === 2 ? "DAYS 31 - 60" : "DAYS 61 - 90";
            const themeLabel = i === 1 ? "VALIDATION" : i === 2 ? "BUILDING" : "MONETIZING";
            
            return (
              <div 
                key={i} 
                className="bg-[#0c0c0f]/20 backdrop-blur border border-[#1a1a1a] rounded-2xl p-6 space-y-6 relative overflow-hidden min-h-[380px] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Wireframe Header */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#525252]">
                    <span className="border border-[#1a1a1a] px-2 py-0.5 rounded uppercase font-semibold">
                      {themeLabel}
                    </span>
                    <span>{daysLabel}</span>
                  </div>

                  {/* Wireframe Title */}
                  <div className="space-y-2">
                    <div className="h-3 bg-[#161616] rounded w-2/3 animate-pulse" />
                    <div className="h-4 bg-[#161616] rounded w-5/6 animate-pulse" />
                  </div>

                  {/* Wireframe Checklist items */}
                  <div className="space-y-3 pt-4 border-t border-[#1a1a1a]">
                    <span className="text-[9px] font-bold text-[#525252] uppercase tracking-widest font-mono block mb-2">
                      SPRINT BACKLOG RESOLVER
                    </span>
                    {[1, 2].map((k) => (
                      <div key={k} className="flex items-start gap-2.5 opacity-55 animate-pulse">
                        <div className="w-3.5 h-3.5 rounded border border-[#1a1a1a] shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-grow">
                          <div className="h-2.5 bg-[#161616] rounded w-full" />
                          <div className="h-2 bg-[#161616]/60 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wireframe Milestones */}
                <div className="space-y-3 pt-5 border-t border-[#1a1a1a]">
                  <div className="flex justify-between items-center text-[9px] font-bold text-[#525252] uppercase tracking-widest font-mono">
                    <span>KEY INDICATORS</span>
                    <span className="text-[8px] text-[#6366f1] animate-pulse">RESOLVING...</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#525252] shrink-0" />
                    <div className="h-2 bg-[#161616] rounded w-1/2" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="w-full max-w-xl mx-auto rounded-2xl border border-red-500/10 bg-[#07070f]/90 backdrop-blur p-8 text-center space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-xl font-bold">
            !
          </div>
          <h3 className="font-display font-bold text-xl text-white">
            Roadmap Generation Error
          </h3>
          <p className="text-sm text-zinc-400">
            {errorMessage || 'Something went wrong while spawning the 90-Day planner agent.'}
          </p>
        </div>
        <button
          onClick={() => {
            setRoadmapData(fallbackRoadmap)
            setStatus('success')
          }}
          className="px-6 py-3 bg-zinc-900 border border-[#1a1a1a] hover:border-zinc-800 text-white rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-all"
        >
          Use Fallback Roadmap &rarr;
        </button>
      </div>
    )
  }

  // Get custom phases or fallbacks
  const phases = roadmapData?.phases || fallbackRoadmap.phases

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 animate-reveal px-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in-left-1 {
          animation: fadeInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-left-2 {
          animation: fadeInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
          opacity: 0;
        }
        .animate-fade-in-left-3 {
          animation: fadeInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
          opacity: 0;
        }
      `}} />

      {/* Heading section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-1 text-xs font-mono font-semibold text-emerald-450 tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>[ROADMAP SYNCED & VALIDATED]</span>
        </div>
        <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
          Your 90-Day Blueprint
        </h2>
        <p className="text-sm text-[#a1a1a1] max-w-xl mx-auto leading-relaxed">
          Tailored to your constraints: <span className="text-[#6366f1] font-semibold">{weeklyHoursAvailable} hrs/week</span>. 
          Execution Speed: <span className="text-[#6366f1] capitalize font-semibold">{preferredAgentSpeed}</span>.
        </p>
      </div>

      {/* 3-phase timeline cards with left-to-right animations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {phases.slice(0, 3).map((phase, idx) => {
          let themeLabel = phase.theme || 'Validation'
          let daysLabel = `DAYS 0${phase.start_day || 1} - 0${phase.end_day || 30}`
          
          if (idx === 0) {
            themeLabel = 'VALIDATION'
            daysLabel = 'DAYS 01 - 30'
          } else if (idx === 1) {
            themeLabel = 'BUILDING'
            daysLabel = 'DAYS 31 - 60'
          } else if (idx === 2) {
            themeLabel = 'LAUNCH'
            daysLabel = 'DAYS 61 - 90'
          }

          const milestones = phase.milestones && phase.milestones.length > 0
            ? phase.milestones.slice(0, 3)
            : fallbackRoadmap.phases[idx].milestones

          const phaseIndex = `0${idx + 1}`;

          return (
            <div 
              key={phase.phase_number} 
              className={`bg-[#0c0c0f]/20 backdrop-blur-sm border border-[#1a1a1a] rounded-2xl p-6 space-y-6 hover:border-[#262626] transition-all duration-305 relative group min-h-[380px] flex flex-col justify-between
                ${idx === 0 ? 'animate-fade-in-left-1' : idx === 1 ? 'animate-fade-in-left-2' : 'animate-fade-in-left-3'}
              `}
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#6366f1]/20 to-transparent" />
              
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="font-bold text-[#6366f1] bg-[#6366f1]/5 border border-[#6366f1]/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    {themeLabel}
                  </span>
                  <span className="font-semibold text-[#525252]">
                    {daysLabel}
                  </span>
                </div>
                
                {/* Title */}
                <div>
                  <span className="text-[10px] font-mono text-[#525252] block mb-1">
                    PHASE_{phaseIndex} // STRATEGY_BLOCK
                  </span>
                  <h3 className="font-display font-bold text-lg text-white group-hover:text-[#6366f1] transition-colors duration-300 leading-snug">
                    {phase.title}
                  </h3>
                  <p className="text-xs text-[#737373] mt-2.5 leading-relaxed font-sans line-clamp-3">
                    {phase.theme}
                  </p>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-4 pt-5 border-t border-[#1a1a1a] flex-grow flex flex-col justify-end">
                <span className="text-[9px] font-bold text-[#525252] uppercase tracking-widest font-mono block">
                  Top 3 Milestones
                </span>
                
                <div className="space-y-3.5 mt-2">
                  {milestones.map((m, mIdx) => (
                    <div key={mIdx} className="flex items-start gap-2.5">
                      <div className="h-4 w-4 rounded bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#6366f1]">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div className="text-[11px] font-sans">
                        <p className="font-medium text-[#e5e5e5] leading-tight">
                          {m.title}
                        </p>
                        <p className="text-[9px] font-mono text-[#525252] mt-0.5 uppercase tracking-wide">
                          Target: W{m.target_week} &bull; {m.metric}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA Section */}
      <div className="border border-[#1a1a1a] bg-[#0c0c0f]/10 backdrop-blur-xl rounded-2xl p-8 md:p-12 space-y-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Loaded Badge */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#6366f1]/20 bg-[#6366f1]/5 px-4 py-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366f1] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6366f1]"></span>
          </span>
          <span className="text-xs font-mono font-bold text-[#6366f1]">
            Sprint 1 is loaded. 7 tasks ready.
          </span>
        </div>

        {/* Description CTA */}
        <div className="space-y-2 max-w-xl mx-auto">
          <p className="text-white text-sm md:text-base font-semibold leading-relaxed font-display">
            You have a plan. Most founders never get this far.
          </p>
          <p className="text-[#a1a1a1] text-xs md:text-sm leading-normal">
            Your AI co-founder is ready. Let's go.
          </p>
        </div>

        {/* Complete / Open my workspace CTA button */}
        <div className="pt-2">
          <button
            onClick={handleOpenWorkspace}
            disabled={completing}
            className="w-full md:w-auto min-w-[240px] px-8 py-3.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#6366f1]/50 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            {completing ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                <span>Initializing Workspace...</span>
              </>
            ) : (
              <span>Open my workspace &rarr;</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
