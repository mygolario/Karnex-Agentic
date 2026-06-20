'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/hooks/useOnboardingStore'
import { useRouter } from 'next/navigation'
import IdentityStage from '@/components/onboarding/IdentityStage'
import VentureStage from '@/components/onboarding/VentureStage'
import MarketStage from '@/components/onboarding/MarketStage'
import ExecutionStage from '@/components/onboarding/ExecutionStage'
import VoiceStage from '@/components/onboarding/VoiceStage'
import DashboardPreview from '@/components/onboarding/DashboardPreview'
import { Shield, Sparkles, Zap, Award } from 'lucide-react'

interface OnboardingWizardProps {
  initialName: string
  savedStep: number
  savedContext: any
}

export default function OnboardingWizard({ initialName, savedStep, savedContext }: OnboardingWizardProps) {
  const router = useRouter()
  const { currentStep, setStep, profile, updateProfile, loadProgressFromDb, saveProgressToDb } = useOnboardingStore()

  // Explanation sidebar state
  const [whyTitle, setWhyTitle] = useState('Founder Configuration')
  const [whyContent, setWhyContent] = useState('Personalize your workspace to configure AI agents.')
  const [isSyncing, setIsSyncing] = useState(true)

  // Rehydrate state on mount and sync with URL step
  const isFirstMount = React.useRef(true)

  useEffect(() => {
    const init = async () => {
      if (isFirstMount.current) {
        setIsSyncing(true)
        const loaded = await loadProgressFromDb()
        
        // If a step is specified in the URL (savedStep), prioritize it!
        if (savedStep) {
          setStep(savedStep)
        } else if (!loaded && initialName) {
          updateProfile({
            identity: {
              ...profile.identity,
              fullName: initialName,
              displayName: initialName.split(' ')[0]
            } as any
          })
        }
        isFirstMount.current = false
        setIsSyncing(false)
      } else {
        // Subsequent URL changes: just sync store step with URL step
        if (savedStep && savedStep !== currentStep) {
          setStep(savedStep)
        }
      }
    }
    init()
  }, [savedStep, initialName])

  // Sync URL search params with store step
  useEffect(() => {
    if (!isSyncing) {
      router.replace(`?step=${currentStep}`)
      saveProgressToDb()
    }
  }, [currentStep, isSyncing])

  const handleNext = () => {
    if (currentStep < 6) {
      setStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1)
    }
  }

  const updateWhyExplanation = (title: string, content: string) => {
    setWhyTitle(title)
    setWhyContent(content)
  }

  const score = profile.completenessScore || 0

  if (isSyncing) {
    return (
      <div className="w-full h-[400px] flex flex-col justify-center items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-[#6366f1]" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
        </svg>
        <span className="font-mono text-xs text-zinc-500">Rehydrating session state...</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch animate-reveal">
      {/* Left panel: Core interactive form card */}
      <div className="md:col-span-8 bg-[#0c0c0f]/40 backdrop-blur-xl border border-[#1a1a1a] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-[#6366f1]/20 to-transparent pointer-events-none" />

        <div className="flex-1 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <IdentityStage
                onNext={handleNext}
                onUpdateWhy={updateWhyExplanation}
              />
            )}
            {currentStep === 2 && (
              <VentureStage
                onNext={handleNext}
                onPrev={handlePrev}
                onUpdateWhy={updateWhyExplanation}
              />
            )}
            {currentStep === 3 && (
              <MarketStage
                onNext={handleNext}
                onPrev={handlePrev}
                onUpdateWhy={updateWhyExplanation}
              />
            )}
            {currentStep === 4 && (
              <ExecutionStage
                onNext={handleNext}
                onPrev={handlePrev}
                onUpdateWhy={updateWhyExplanation}
              />
            )}
            {currentStep === 5 && (
              <VoiceStage
                onNext={handleNext}
                onPrev={handlePrev}
                onUpdateWhy={updateWhyExplanation}
              />
            )}
            {currentStep === 6 && (
              <DashboardPreview
                onPrev={handlePrev}
                onUpdateWhy={updateWhyExplanation}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right panel: Sidebar context & completeness tracker */}
      <div className="md:col-span-4 bg-[#09090b]/60 border border-[#1a1a1a] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px] md:min-h-[480px]">
        <div className="absolute inset-0 bg-radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.015), transparent 60%) pointer-events-none" />

        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[#1a1a1f] pb-3">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-widest">
              WHY WE ASK THIS
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={whyTitle}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              <h4 className="text-sm font-semibold text-white">{whyTitle}</h4>
              <p className="text-xs text-[#a1a1a1] leading-relaxed">{whyContent}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Profile Completeness Section */}
        <div className="space-y-4 pt-6 border-t border-[#1a1a1f]">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-[#525252] font-bold uppercase tracking-wider">FOUNDER PROFILE COMPLETENESS</span>
            <span className={score >= 70 ? 'text-emerald-400 font-semibold' : 'text-indigo-400'}>
              {score}%
            </span>
          </div>

          <div className="h-1.5 w-full bg-[#161616] rounded-full overflow-hidden relative">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${
                score >= 70 ? 'from-[#6366f1] to-emerald-500' : 'from-indigo-500 to-purple-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-[#525252] leading-none">
            <span>MIN REQ: 70%</span>
            <span>{score >= 70 ? '✓ READY TO LAUNCH' : 'INCOMPLETE'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
