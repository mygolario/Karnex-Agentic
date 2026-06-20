'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/hooks/useOnboardingStore'
import { ArrowRight, ArrowLeft, Briefcase, Zap, GitBranch, Shield, DollarSign } from 'lucide-react'

const BOTTLENECKS = [
  { id: 'unclear-idea', title: 'Unclear Idea direction', desc: 'Struggling to define what features are critical.' },
  { id: 'no-users', title: 'Struggling to find users', desc: 'Need customer discovery pipelines and active channels.' },
  { id: 'no-time-to-build', title: 'No time to write code', desc: 'Need autonomous agents to build, scaffold, and deploy.' },
  { id: 'struggling-to-sell', title: 'Struggling to close deals', desc: 'Need assistance with sales scripts and CRM outreach.' },
  { id: 'need-funding', title: 'Need pre-seed funding', desc: 'Need pitch deck generation and target investor lists.' }
]

const INTEGRATION_TOOLS = [
  { id: 'github', name: 'GitHub', desc: 'Code repository & version control' },
  { id: 'notion', name: 'Notion', desc: 'Project docs & workspace memory' },
  { id: 'stripe', name: 'Stripe', desc: 'Payments & subscription logic' },
  { id: 'gmail', name: 'Gmail / Google Workspace', desc: 'Outbound emails & client outreach' },
  { id: 'linkedin', name: 'LinkedIn', desc: 'Professional network prospecting' }
]

interface StageProps {
  onNext: () => void
  onPrev: () => void
  onUpdateWhy: (title: string, content: string) => void
}

export default function ExecutionStage({ onNext, onUpdateWhy, onPrev }: StageProps) {
  const { profile, updateProfile } = useOnboardingStore()
  const [subStep, setSubStep] = useState(0)

  const execution = profile.execution || {
    cyclePosition: 'pre-validation',
    bottleneck: 'unclear-idea',
    tools: [],
    weeklyAvailability: '5-15 hrs',
    fundingPath: 'bootstrapping'
  }

  // Local state inputs
  const [cycle, setCycle] = useState<'pre-validation' | 'building-mvp' | 'seeking-revenue'>(
    (execution.cyclePosition as any) || 'pre-validation'
  )
  const [bottleneck, setBottleneck] = useState<'unclear-idea' | 'no-users' | 'no-time-to-build' | 'struggling-to-sell' | 'need-funding'>(
    (execution.bottleneck as any) || 'unclear-idea'
  )
  const [selectedTools, setSelectedTools] = useState<string[]>(execution.tools || [])
  const [weeklyHrs, setWeeklyHrs] = useState<'<5 hrs' | '5-15 hrs' | '15+ hrs'>(
    (execution.weeklyAvailability as any) || '5-15 hrs'
  )
  const [funding, setFunding] = useState<'bootstrapping' | 'vc-funding'>(
    (execution.fundingPath as any) || 'bootstrapping'
  )

  // Sync to store
  useEffect(() => {
    updateProfile({
      execution: {
        cyclePosition: cycle as any,
        bottleneck: bottleneck as any,
        tools: selectedTools,
        weeklyAvailability: weeklyHrs as any,
        fundingPath: funding as any
      }
    })
  }, [cycle, bottleneck, selectedTools, weeklyHrs, funding])

  // Update explanation sidebar
  useEffect(() => {
    switch (subStep) {
      case 0:
        onUpdateWhy(
          'Bottlenecks & Stage',
          'Your active roadblock dictates what agent recommends itself first. If code limits you, the Builder agent takes priority. If outreach limits you, Sales campaigns take priority.'
        )
        break
      case 1:
        onUpdateWhy(
          'Capacity & Budget',
          'Solo founders have finite capacity. We structure weekly milestones around your availability (<5 hrs vs 15+ hrs) so you never fall behind.'
        )
        break
      case 2:
        onUpdateWhy(
          'Connected Integrations',
          'Selecting tools pre-configures your Integrations Hub (5.4). We prepare OAuth flow triggers for these apps so they connect to agents during first-week tasks.'
        )
        break
    }
  }, [subStep])

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId))
    } else {
      setSelectedTools([...selectedTools, toolId])
    }
  }

  const next = () => {
    if (subStep < 2) {
      setSubStep(subStep + 1)
    } else {
      onNext()
    }
  }

  const prev = () => {
    if (subStep > 0) {
      setSubStep(subStep - 1)
    } else {
      onPrev()
    }
  }

  return (
    <div className="w-full min-h-[400px] flex flex-col justify-between">
      <div className="flex-grow">
        <AnimatePresence mode="wait">
          {subStep === 0 && (
            <motion.div
              key="exec-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 4 // Execution // Question 1 of 3
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Where are you stuck?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Identify your current project stage and biggest execution bottleneck.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    90-Day Execution Position
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'pre-validation', title: 'Pre-Validation', desc: 'Days 1-30' },
                      { id: 'building-mvp', title: 'Building MVP', desc: 'Days 31-60' },
                      { id: 'seeking-revenue', title: 'Seeking Revenue', desc: 'Days 61-90' }
                    ].map((pos) => {
                      const isSelected = cycle === pos.id
                      return (
                        <button
                          key={pos.id}
                          onClick={() => setCycle(pos.id as any)}
                          className={`text-center bg-[#0c0c0f]/40 border rounded-xl p-3 transition-all duration-200 cursor-pointer flex flex-col justify-center items-center h-20 ${
                            isSelected
                              ? 'border-[#6366f1] bg-[#6366f1]/05 text-white'
                              : 'border-[#1a1a1a] hover:border-[#2a2a2a] text-zinc-400'
                          }`}
                        >
                          <span className="text-xs font-semibold block">{pos.title}</span>
                          <span className="text-[10px] font-mono text-[#737373] mt-1 block">{pos.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Current Bottleneck
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {BOTTLENECKS.map((b) => {
                      const isSelected = bottleneck === b.id
                      return (
                        <button
                          key={b.id}
                          onClick={() => setBottleneck(b.id as any)}
                          className={`text-left bg-[#0c0c0f]/40 border rounded-xl p-3 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-[#6366f1] bg-[#6366f1]/05'
                              : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                          }`}
                        >
                          <span className="text-xs font-semibold text-white block">{b.title}</span>
                          <span className="text-[11px] text-[#a1a1a1] mt-0.5 block leading-relaxed">{b.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {subStep === 1 && (
            <motion.div
              key="exec-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 4 // Execution // Question 2 of 3
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Time & funding structure?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Specify how much weekly bandwidth you have and your backing trajectory.
                </p>
              </div>

              <div className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Weekly Time Available
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: '<5 hrs', title: 'Side Hustle', desc: '<5 hrs/wk' },
                      { id: '5-15 hrs', title: 'Part-Time', desc: '5-15 hrs/wk' },
                      { id: '15+ hrs', title: 'Full Force', desc: '15+ hrs/wk' }
                    ].map((t) => {
                      const isSelected = weeklyHrs === t.id
                      return (
                        <button
                          key={t.id}
                          onClick={() => setWeeklyHrs(t.id as any)}
                          className={`text-center bg-[#0c0c0f]/40 border rounded-xl p-3 transition-all duration-200 cursor-pointer flex flex-col justify-center items-center h-20 ${
                            isSelected
                              ? 'border-[#6366f1] bg-[#6366f1]/05 text-white'
                              : 'border-[#1a1a1a] hover:border-[#2a2a2a] text-zinc-400'
                          }`}
                        >
                          <span className="text-xs font-semibold block">{t.title}</span>
                          <span className="text-[10px] font-mono text-[#737373] mt-1 block">{t.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Funding Path
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'bootstrapping', title: 'Bootstrapping', desc: 'Self-funded, prioritizing fast revenue validation.' },
                      { id: 'vc-funding', title: 'Seeking Venture Capital', desc: 'Building pitch decks, aiming for seed VC backing.' }
                    ].map((f) => {
                      const isSelected = funding === f.id
                      return (
                        <button
                          key={f.id}
                          onClick={() => setFunding(f.id as any)}
                          className={`text-left bg-[#0c0c0f]/40 border rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[100px] ${
                            isSelected
                              ? 'border-[#6366f1] bg-[#6366f1]/05'
                              : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                          }`}
                        >
                          <span className="text-xs font-semibold text-white block">{f.title}</span>
                          <span className="text-[10px] text-[#a1a1a1] mt-1.5 block leading-relaxed">{f.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {subStep === 2 && (
            <motion.div
              key="exec-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 4 // Execution // Question 3 of 3
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Integrations Checklist
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Select the tools you already use. We will pre-configure their OAuth linkages.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-w-lg">
                {INTEGRATION_TOOLS.map((t) => {
                  const isChecked = selectedTools.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTool(t.id)}
                      className={`text-left bg-[#0c0c0f]/40 border rounded-xl p-3.5 transition-all duration-200 cursor-pointer flex justify-between items-center ${
                        isChecked
                          ? 'border-[#6366f1] bg-[#6366f1]/05'
                          : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold text-white block">{t.name}</span>
                        <span className="text-[11px] text-[#a1a1a1] mt-0.5 block">{t.desc}</span>
                      </div>
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-[#6366f1] border-[#6366f1] text-white'
                            : 'border-[#1a1a1a] bg-[#050505]/40 text-transparent'
                        }`}
                      >
                        <svg className="h-3.5 w-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Row */}
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
          className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 disabled:hover:bg-[#6366f1] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-[#6366f1]/10 cursor-pointer"
        >
          CONTINUE
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
