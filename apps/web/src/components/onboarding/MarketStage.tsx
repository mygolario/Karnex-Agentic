'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/hooks/useOnboardingStore'
import { ArrowRight, ArrowLeft, Users, Target, ShieldAlert, Award } from 'lucide-react'

interface StageProps {
  onNext: () => void
  onPrev: () => void
  onUpdateWhy: (title: string, content: string) => void
}

export default function MarketStage({ onNext, onUpdateWhy, onPrev }: StageProps) {
  const { profile, updateProfile } = useOnboardingStore()
  const [subStep, setSubStep] = useState(0)

  const market = profile.market || {
    targetCustomer: {
      jobTitle: '',
      companySize: '1-10',
      type: 'B2B'
    },
    competitors: [],
    positioningAdvantage: '',
    hasCustomerConversations: false
  }

  // Local state inputs
  const [jobTitle, setJobTitle] = useState(market.targetCustomer?.jobTitle || '')
  const [companySize, setCompanySize] = useState(market.targetCustomer?.companySize || '1-10')
  const [customerType, setCustomerType] = useState(market.targetCustomer?.type || 'B2B')
  const [competitorsText, setCompetitorsText] = useState(market.competitors?.join(', ') || '')
  const [positioning, setPositioning] = useState(market.positioningAdvantage || '')
  const [conversationsSelect, setConversationsSelect] = useState(market.hasCustomerConversations || false)

  // Sync back to store
  useEffect(() => {
    updateProfile({
      market: {
        targetCustomer: {
          jobTitle,
          companySize,
          type: customerType as any
        },
        competitors: competitorsText ? competitorsText.split(',').map((c) => c.trim()) : [],
        positioningAdvantage: positioning,
        hasCustomerConversations: conversationsSelect
      }
    })
  }, [jobTitle, companySize, customerType, competitorsText, positioning, conversationsSelect])

  // Update explanation sidebar
  useEffect(() => {
    switch (subStep) {
      case 0:
        onUpdateWhy(
          'Target Audience (ICP)',
          'ICP personas are used by downstream marketing and sales agents. Defining the job titles and company scale filters our database searches to find relevant target contacts.'
        )
        break
      case 1:
        onUpdateWhy(
          'Competitive Moats',
          'The Competitive Landscape agent runs in the background using this competitor list to identify features, gaps, and price structures. This defines your entry wedge.'
        )
        break
    }
  }, [subStep])

  const next = () => {
    if (subStep < 1) {
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
              key="market-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 3 // Market // Question 1 of 2
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Who is your target customer?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Define your Ideal Customer Profile (ICP) for outreach and positioning.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                      Market Channel
                    </label>
                    <select
                      className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm outline-none"
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value as any)}
                    >
                      <option value="B2B">B2B (Business-to-Business)</option>
                      <option value="B2C">B2C (Business-to-Consumer)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                      Target Scale / Company Size
                    </label>
                    <select
                      className="w-full bg-[#050505]/60 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm outline-none"
                      disabled={customerType === 'B2C'}
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                    >
                      <option value="Freelancers">Freelancers / Solo Founders</option>
                      <option value="1-10">Micro (1 - 10 employees)</option>
                      <option value="10-50">Small (10 - 50 employees)</option>
                      <option value="50-250">Mid-Market (50 - 250 employees)</option>
                      <option value="250+">Enterprise (250+ employees)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Ideal Customer Job Title / Segment
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                    placeholder="e.g. Agency Owners, Head of Sales, Independent Creators"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasConvos"
                      className="rounded border-[#1a1a1a] text-[#6366f1] focus:ring-[#6366f1] bg-[#050505] h-4 w-4"
                      checked={conversationsSelect}
                      onChange={(e) => setConversationsSelect(e.target.checked)}
                    />
                    <label htmlFor="hasConvos" className="text-xs text-[#a1a1a1] font-medium cursor-pointer">
                      I have already interviewed or spoken with customers
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {subStep === 1 && (
            <motion.div
              key="market-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 3 // Market // Question 2 of 2
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Perceived competitors & moat?
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  List competitors and describe your positioning wedge.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Biggest Competitors (Comma-separated)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                    placeholder="e.g. FreshBooks, HoneyBook, Invoice2go"
                    value={competitorsText}
                    onChange={(e) => setCompetitorsText(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Your Positioning Advantage / Wedge
                  </label>
                  <textarea
                    className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none min-h-[100px] resize-none"
                    placeholder="What does your product do that competitors fail to address? e.g. Our invoices include structured milestone timelines that automate approvals directly on the bill page."
                    value={positioning}
                    onChange={(e) => setPositioning(e.target.value)}
                  />
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
          disabled={subStep === 0 && !jobTitle}
          className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 disabled:hover:bg-[#6366f1] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-[#6366f1]/10 cursor-pointer"
        >
          CONTINUE
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
