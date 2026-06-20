'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/hooks/useOnboardingStore'
import { ArrowRight, ArrowLeft, MessageSquare, Volume2, Upload, Plus, Trash2 } from 'lucide-react'

const CHANNELS = [
  { id: 'twitter', name: 'Twitter / X', desc: 'Short-form hooks and product threads' },
  { id: 'linkedin', name: 'LinkedIn', desc: 'Professional thought leadership & network essays' },
  { id: 'blog', name: 'Independent Blog', desc: 'Long-form programmatic SEO and documentation' }
]

interface StageProps {
  onNext: () => void
  onPrev: () => void
  onUpdateWhy: (title: string, content: string) => void
}

export default function VoiceStage({ onNext, onUpdateWhy, onPrev }: StageProps) {
  const { profile, updateProfile } = useOnboardingStore()
  const [subStep, setSubStep] = useState(0)

  const voice = profile.voice || {
    writingSamples: [],
    contentChannels: [],
    communicationStyle: ''
  }

  // Local state inputs
  const [samples, setSamples] = useState<string[]>(voice.writingSamples || [])
  const [newSample, setNewSample] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>(voice.contentChannels || [])
  const [commStyle, setCommStyle] = useState(voice.communicationStyle || '')

  // Sync to store
  useEffect(() => {
    updateProfile({
      voice: {
        writingSamples: samples,
        contentChannels: selectedChannels,
        communicationStyle: commStyle
      }
    })
  }, [samples, selectedChannels, commStyle])

  // Update explanation sidebar
  useEffect(() => {
    switch (subStep) {
      case 0:
        onUpdateWhy(
          'Writing Samples (Outreach)',
          'Feeds the Outreach Agent (3.3) tone model. Our agents analyze the sentence length, structural patterns, and vocabulary in these samples to draft emails that sound exactly like you wrote them.'
        )
        break
      case 1:
        onUpdateWhy(
          'Style & Channels',
          'We personalize communications. The communication style prompt lets you instruct Karnex: e.g. "Keep standups extremely brief and bulleted", or "Explain things like a senior engineering mentor".'
        )
        break
    }
  }, [subStep])

  const addSample = () => {
    if (!newSample.trim()) return
    setSamples([...samples, newSample.trim()])
    setNewSample('')
  }

  const removeSample = (idx: number) => {
    setSamples(samples.filter((_, i) => i !== idx))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        setSamples([...samples, text.trim()])
      }
    }
    reader.readAsText(file)
  }

  const toggleChannel = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== channelId))
    } else {
      setSelectedChannels([...selectedChannels, channelId])
    }
  }

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
              key="voice-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 5 // Voice // Question 1 of 2
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Train your voice model
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Upload or paste 2–3 past writing samples (emails, posts, articles) to calibrate the Outreach Agent.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="border border-[#1a1a1a] rounded-xl p-3.5 bg-[#050505]/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider">
                      Paste Writing Sample
                    </label>

                    <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1a1a1a] text-zinc-400 hover:text-white border border-[#2a2a2a] text-[10px] font-mono cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      UPLOAD .TXT
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>

                  <textarea
                    className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-xs placeholder-[#525252] outline-none min-h-[90px] resize-none"
                    placeholder="Paste a past email, tweet thread, or blog post you wrote..."
                    value={newSample}
                    onChange={(e) => setNewSample(e.target.value)}
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={addSample}
                      disabled={!newSample.trim()}
                      className="px-3 py-1.5 bg-[#6366f1]/20 hover:bg-[#6366f1]/30 border border-[#6366f1]/30 text-indigo-400 disabled:opacity-40 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      ADD SAMPLE
                    </button>
                  </div>
                </div>

                {samples.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                      Added Samples ({samples.length} / 3)
                    </label>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {samples.map((sample, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-start gap-3 p-2.5 border border-[#1a1a1a] bg-[#0c0c0f]/20 rounded-xl"
                        >
                          <span className="text-[11px] text-zinc-400 leading-normal line-clamp-2 flex-grow">
                            {sample}
                          </span>
                          <button
                            onClick={() => removeSample(idx)}
                            className="text-zinc-600 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {subStep === 1 && (
            <motion.div
              key="voice-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#737373] tracking-widest uppercase">
                  Stage 5 // Voice // Question 2 of 2
                </span>
                <h2 className="font-display font-bold text-[28px] md:text-[34px] tracking-tight text-white leading-tight">
                  Karnex Communication Style
                </h2>
                <p className="text-sm text-[#a1a1a1] max-w-md">
                  Specify your preferred marketing channels and communication constraints.
                </p>
              </div>

              <div className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Target Content Channels
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {CHANNELS.map((c) => {
                      const isChecked = selectedChannels.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleChannel(c.id)}
                          className={`text-left bg-[#0c0c0f]/40 border rounded-xl p-3.5 transition-all duration-200 cursor-pointer flex justify-between items-center ${
                            isChecked
                              ? 'border-[#6366f1] bg-[#6366f1]/05'
                              : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-semibold text-white block">{c.name}</span>
                            <span className="text-[11px] text-[#a1a1a1] mt-0.5 block leading-normal">{c.desc}</span>
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
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-[#525252] uppercase tracking-wider block">
                    Instruct Karnex (One Sentence Communication Rule)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#050505]/40 border border-[#1a1a1a] focus:border-[#6366f1]/45 transition-colors duration-200 rounded-xl px-4 py-3 text-white text-sm placeholder-[#525252] outline-none"
                    placeholder="e.g. Always keep communication brief, structured in markdown bullet points, and blunt."
                    value={commStyle}
                    onChange={(e) => setCommStyle(e.target.value)}
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
          className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 disabled:hover:bg-[#6366f1] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-[#6366f1]/10 cursor-pointer"
        >
          CONTINUE
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
