'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const STEPS = [
  { number: 1, label: 'Analyze Pain', desc: 'Identify critical frustration' },
  { number: 2, label: 'Hypotheses', desc: 'Distill startup concepts' },
  { number: 3, label: 'Preferences', desc: 'Configure founder profile' },
  { number: 4, label: 'Roadmap', desc: 'Review weekly execution' }
]

function HeaderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentStep = Number(searchParams.get('step') || '1')

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1a1a1a] bg-[#050505]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="group flex items-center gap-2.5">
          <img 
            src="/logo.jpeg" 
            alt="Karnex Logo" 
            className="h-8 w-8 rounded-lg object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-110" 
          />
          <span className="font-display font-semibold text-[17px] tracking-[-0.03em] text-white/95 group-hover:text-white transition-colors duration-300">
            Karnex
          </span>
        </div>

        {/* Progress Tracker */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-12">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.number
            const isCompleted = currentStep > step.number
            return (
              <div key={step.number} className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-bold border transition-all duration-300 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                        : isCompleted
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-[#262626] bg-[#0a0a0a] text-[#737373]'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-[13px] font-medium tracking-tight transition-colors duration-300 ${
                      isActive ? 'text-white font-semibold' : isCompleted ? 'text-[#a3a3a3]' : 'text-[#737373]'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[11px] text-[#525252] leading-none mt-0.5">{step.desc}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="h-px w-6 bg-[#1a1a1a] ml-2" />
                )}
              </div>
            )
          })}
        </nav>

        {/* Action Button */}
        <div>
          <button
            onClick={handleLogout}
            className="text-[13px] text-[#737373] hover:text-white transition-colors duration-200 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
      
      {/* Top Animated Progress Strip */}
      <div className="w-full h-0.5 bg-[#161616] relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>
    </header>
  )
}

export default function OnboardingHeader() {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 w-full border-b border-[#1a1a1a] bg-[#050505]/80 py-4 h-[73px]" />
    }>
      <HeaderContent />
    </Suspense>
  )
}
