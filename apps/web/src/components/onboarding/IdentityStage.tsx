'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/hooks/useOnboardingStore'
import { ArrowRight, ArrowLeft, User, Clock, ShieldAlert, Zap } from 'lucide-react'

const FEEDBACK_STYLES = [
  {
    id: 'gentle',
    title: 'Gentle Support',
    desc: 'Encouraging tone, constructive feedback, focuses on keeping motivation high.',
    badge: 'Mirror Mode: Supportive'
  },
  {
    id: 'direct',
    title: 'Direct Clarity',
    desc: 'Default mode. Straightforward analysis, flags blockers clearly without sugarcoating.',
    badge: 'Mirror Mode: Objective'
  },
  {
    id: 'brutal',
    title: 'Brutal Honesty',
    desc: 'Unfiltered critique. Challenges every assumption, calls out procrastination immediately.',
    badge: 'Mirror Mode: Radical Candor'
  }
]

const TECH_LEVELS = [
  { id: 'technical', title: 'Technical Founder', desc: 'Can code the MVP, manage databases, deploy backend infrastructure.' },
  { id: 'non-technical', title: 'Non-Technical', desc: 'Focused on product, sales, marketing, and operations. Needs code generation.' },
  { id: 'hybrid', title: 'Hybrid Builder', desc: 'Can manage light frontend/no-code tools, understands tech concepts but prefers help.' }
]

const STARTUP_EXPERIENCES = [
  { id: 'first-time', title: 'First-Time Founder', desc: 'This is my first venture. Learning the ropes of validation and shipping.' },
  { id: '1-2 before', title: 'Built 1-2 Startups', desc: 'Have experienced the journey before. Understand MVP shipping cycles.' },
  { id: 'serial', title: 'Serial Founder', desc: 'Multiple ventures launched. Focused on rapid execution, scale, and efficiency.' }
]

interface StageProps {
  onNext: () => void
  onPrev?: () => void
  onUpdateWhy: (title: string, content: string) => void
}

export default function IdentityStage({ onNext, onUpdateWhy, onPrev }: StageProps) {
  const { profile, updateProfile } = useOnboardingStore()
  const [subStep, setSubStep] = useState(0)

  const identity = profile.identity || {
    fullName: '',
    displayName: '',
    timezone: 'America/New_York',
    workingHours: '9am - 5pm',
    feedbackStyle: 'direct',
    technicalLevel: 'intermediate' as any,
    startupExperience: 'first-time'
  }

  // Update floating sidebar explanation when step changes
  React.useEffect(() => {
    switch (subStep) {
      case 0:
        onUpdateWhy(
          'Identity & Addressing',
          'Every email, notification, and task briefing Karnex writes will address you properly. We also use your name to configure outreach signatures later.'
        )
        break
      case 1:
        onUpdateWhy(
          'Availability & Sync',
          'Your timezone ensures daily standups trigger exactly when you start your day. Typical hours feed the Sprint Planner to budget realistic weekly task workloads.'
        )
        break
      case 2:
        onUpdateWhy(
          'Mirror Agent Mode',
          'The Mirror Agent (4.5) reads your progress daily. Feedback mode defines how aggressively it challenges your assumptions and procrastination patterns.'
        )
        break
      case 3:
        onUpdateWhy(
          'Founder Background',
          'We customize the technical complexity of tasks. Technical founders get Git/DB schema specs; non-technical founders get auto-deployment configurations and simplified instructions.'
        )
        break
    }
  }, [subStep])

  const next = () => {
    if (subStep < 3) {
      setSubStep(subStep + 1)
    } else {
      onNext()
    }
  }

  const prev = () => {
    if (subStep > 0) {
      setSubStep(subStep - 1)
    } else if (onPrev) {
      onPrev()
    }
  }

  return (
    <div className="w-full min-h-[400px] flex flex-col justify-between">
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {subStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 1 // Identity // Question 1 of 4
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  What should we call you?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Let&apos;s start by setting up your profile tags.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                    placeholder="e.g. John Doe"
                    value={identity.fullName || ''}
                    onChange={(e) => updateProfile({ identity: { ...identity, fullName: e.target.value } })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Preferred Name / Display Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                    placeholder="e.g. John"
                    value={identity.displayName || ''}
                    onChange={(e) => updateProfile({ identity: { ...identity, displayName: e.target.value } })}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {subStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 1 // Identity // Question 2 of 4
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Where and when do you work?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  This coordinates notifications and budgets sprint expectations.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Your Timezone
                  </label>
                  <select
                    className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm outline-none"
                    value={identity.timezone || 'America/New_York'}
                    onChange={(e) => updateProfile({ identity: { ...identity, timezone: e.target.value } })}
                  >
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Chicago">Central Time (US & Canada)</option>
                    <option value="America/Denver">Mountain Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                    <option value="Europe/London">London / GMT</option>
                    <option value="Europe/Paris">Central European Time (CET)</option>
                    <option value="Asia/Tokyo">Tokyo / JST</option>
                    <option value="Asia/Kolkata">India / IST</option>
                    <option value="Australia/Sydney">Sydney / AEDT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Typical Working Hours
                  </label>
                  <select
                    className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm outline-none"
                    value={identity.workingHours || '9am - 5pm'}
                    onChange={(e) => updateProfile({ identity: { ...identity, workingHours: e.target.value } })}
                  >
                    <option value="9am - 5pm">Traditional Hours (9 AM - 5 PM)</option>
                    <option value="Early Mornings">Early Bird (5 AM - 9 AM)</option>
                    <option value="Nights & Weekends">Nights & Weekends (Part-Time)</option>
                    <option value="Flexible">Highly Flexible (Ad-hoc throughout the day)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {subStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 1 // Identity // Question 3 of 4
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Preferred feedback style?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Select how you want Karnex&apos;s coaching and accountability agent (Mirror 4.5) to interact with you.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 max-w-lg">
                {FEEDBACK_STYLES.map((style) => {
                  const isSelected = identity.feedbackStyle === style.id
                  return (
                    <button
                      key={style.id}
                      onClick={() => updateProfile({ identity: { ...identity, feedbackStyle: style.id as any } })}
                      className={`text-left bg-[#0c0c0f]/40 border rounded-xl p-4 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#6366f1] bg-[#6366f1]/05 shadow-[0_0_15px_rgba(99,102,241,0.08)]'
                          : 'border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#0c0c0f]/60'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="text-sm font-semibold text-white">{style.title}</span>
                        {isSelected && (
                          <span className="text-[9px] font-mono bg-[#6366f1]/20 text-[#c7d2fe] px-2 py-0.5 rounded border border-[#6366f1]/30">
                            {style.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#a1a1a1] mt-1.5 leading-relaxed">{style.desc}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {subStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 1 // Identity // Question 4 of 4
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Tell us about your background.
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  This customizes technical specs and sprint tasks contextually.
                </p>
              </div>

              <div className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Technical Expertise Profile
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {TECH_LEVELS.map((level) => {
                      const isSelected = identity.technicalLevel === level.id
                      return (
                        <button
                          key={level.id}
                          onClick={() => updateProfile({ identity: { ...identity, technicalLevel: level.id as any } })}
                          className={`text-left bg-[#0c0c0f]/40 border rounded-xl p-3.5 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-[#6366f1] bg-[#6366f1]/05'
                              : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                          }`}
                        >
                          <span className="text-xs font-semibold text-white block">{level.title}</span>
                          <span className="text-[11px] text-[#a1a1a1] mt-1 block leading-relaxed">{level.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Prior Startup Ventures
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {STARTUP_EXPERIENCES.map((exp) => {
                      const isSelected = identity.startupExperience === exp.id
                      return (
                        <button
                          key={exp.id}
                          onClick={() => updateProfile({ identity: { ...identity, startupExperience: exp.id as any } })}
                          className={`text-center bg-[#0c0c0f]/40 border rounded-xl p-3 transition-all duration-200 cursor-pointer flex flex-col justify-center items-center h-20 ${
                            isSelected
                              ? 'border-[#6366f1] bg-[#6366f1]/05'
                              : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                          }`}
                        >
                          <span className="text-xs font-semibold text-white">{exp.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
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
          disabled={subStep === 0 && (!identity.fullName || !identity.displayName)}
          className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 disabled:hover:bg-[#6366f1] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-[#6366f1]/10 cursor-pointer"
        >
          CONTINUE
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
