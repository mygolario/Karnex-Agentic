'use client'

import React, { useRef, useEffect, useState } from 'react'
import type { ChatMessage, SuggestionChip, StudioTaskContext } from '@/lib/studio/types'

interface CTOChatPanelProps {
  messages: ChatMessage[]
  isBuilding: boolean
  taskContext: StudioTaskContext | null
  suggestions: SuggestionChip[]
  onBuild: (specification: string) => void
  onSuggestionSelect: (spec: string) => void
  onToggleAdvanced: () => void
  advancedOpen: boolean
  activeMode?: string
  hideTechnicalClutter?: boolean
}

const getModeBorderColor = (mode: string) => {
  switch (mode) {
    case 'plan': return 'border-l-[#f59e0b]'
    case 'ask': return 'border-l-[#0ea5e9]'
    case 'debug': return 'border-l-[#f43f5e]'
    case 'build': return 'border-l-[#10b981]'
    default: return 'border-l-[#8b5cf6]'
  }
}

const getModeAvatarColor = (mode: string) => {
  switch (mode) {
    case 'plan': return 'bg-[#f59e0b]/10 text-[#f59e0b]'
    case 'ask': return 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
    case 'debug': return 'bg-[#f43f5e]/10 text-[#f43f5e]'
    case 'build': return 'bg-[#10b981]/10 text-[#10b981]'
    default: return 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
  }
}

const getModeText = (mode: string) => {
  switch (mode) {
    case 'plan': return 'Karnex • Planning'
    case 'ask': return 'Karnex • Consultation'
    case 'debug': return 'Karnex • Diagnostics'
    case 'build': return 'Karnex • Building'
    default: return 'Karnex • Auto Mode'
  }
}

const getModeDotColor = (mode: string) => {
  switch (mode) {
    case 'plan': return 'bg-[#f59e0b]'
    case 'ask': return 'bg-[#0ea5e9]'
    case 'debug': return 'bg-[#f43f5e]'
    case 'build': return 'bg-[#10b981]'
    default: return 'bg-[#8b5cf6]'
  }
}

export default function CTOChatPanel({
  messages,
  isBuilding,
  taskContext,
  suggestions,
  onBuild,
  onSuggestionSelect,
  onToggleAdvanced,
  advancedOpen,
  activeMode = 'auto',
  hideTechnicalClutter = false,
}: CTOChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [placeholder, setPlaceholder] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  const placeholders = [
    'Add custom instructions...',
    'Build a new user profile page...',
    'Integrate Supabase db schema...',
    'Create an API route to handle payments...',
    'Refactor dashboard navigation UI...',
  ]

  useEffect(() => {
    let currentIdx = 0
    let charIdx = 0
    let isDeleting = false
    let timer: NodeJS.Timeout

    const tick = () => {
      const fullText = placeholders[currentIdx]
      if (!isDeleting) {
        setPlaceholder(fullText.substring(0, charIdx + 1))
        charIdx++
        if (charIdx === fullText.length) {
          isDeleting = true
          timer = setTimeout(tick, 2500)
        } else {
          timer = setTimeout(tick, 50)
        }
      } else {
        setPlaceholder(fullText.substring(0, charIdx - 1))
        charIdx--
        if (charIdx === 0) {
          isDeleting = false
          currentIdx = (currentIdx + 1) % placeholders.length
          timer = setTimeout(tick, 600)
        } else {
          timer = setTimeout(tick, 25)
        }
      }
    }

    timer = setTimeout(tick, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages, isBuilding])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isBuilding) return
    const spec = draft.trim()
    if (!spec && !taskContext) return
    onBuild(spec || taskContext?.title || '')
    setDraft('')
  }

  const showEmptyState = !taskContext && messages.length <= 1

  return (
    <div className="flex flex-col h-full bg-[#07070a] border-r border-[#14141d] min-h-0">
      {/* Context badge */}
      <div className="shrink-0 px-4 py-3 border-b border-[#14141d] bg-[#09090d]/50 flex items-center justify-between">
        {taskContext ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-[#6366f1]/20 bg-[#6366f1]/8 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1] animate-ping" />
            <span className="text-[12px] font-medium text-[#818cf8] truncate max-w-[280px]">
              {taskContext.title}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-zinc-500">
            Karnex Studio Workspace
          </span>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${getModeDotColor(activeMode)}`} />
          <span className="font-medium font-mono capitalize">{activeMode} Mode</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={feedRef} className="flex-1 overflow-y-auto forge-scroll p-4 space-y-4 min-h-0 bg-[#07070a]/60">
        {showEmptyState && (
          <div className="mb-6 p-4 rounded-2xl bg-[#09090d]/40 border border-[#14141d] shadow-inner">
            <h2 className="text-[17px] font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              What do you want to build?
            </h2>
            <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
              Select one of the suggested paths below or write a custom feature request using the input below.
            </p>
            {suggestions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                {suggestions.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onSuggestionSelect(chip.specification)}
                    disabled={isBuilding}
                    className="relative group flex flex-col text-left p-4 rounded-xl border border-[#1a1a24] bg-[#0c0c10]/40 hover:bg-[#0f0f15]/80 hover:border-[#6366f1]/40 transition-all duration-300 cursor-pointer disabled:opacity-50 select-none overflow-hidden"
                  >
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#6366f1]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="text-[12px] font-bold text-zinc-200 group-hover:text-[#818cf8] transition-colors duration-300">
                      {chip.label}
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {chip.specification}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages
          .filter((msg) => !hideTechnicalClutter || msg.sender !== 'system')
          .map((msg) => (
            <div
              key={msg.id}
              className={`forge-msg-enter flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.sender !== 'user' && (
                <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold border border-zinc-800/40 shadow-sm ${getModeAvatarColor(activeMode)}`}>
                  K
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-[13px] leading-relaxed shadow-sm transition-all duration-300 ${
                  msg.sender === 'user'
                    ? 'bg-[#1b1b2a] text-zinc-100 border border-[#2d2d3e]/80 shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                    : msg.sender === 'system'
                      ? 'bg-[#050508]/40 backdrop-blur-sm border border-zinc-800/30 text-zinc-500 font-mono text-[11px] border-l-2 border-l-zinc-700'
                      : `bg-[#0c0c12]/60 backdrop-blur-md border border-zinc-800/40 border-l-[3.5px] ${getModeBorderColor(activeMode)} text-zinc-200`
                }`}
              >
                {msg.sender === 'builder' && (
                  <p className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#818cf8] mb-1 font-mono">
                    {getModeText(activeMode)}
                  </p>
                )}
                <div className="whitespace-pre-wrap">{msg.message}</div>
              </div>
            </div>
          ))}

        {isBuilding && (
          <div className="forge-msg-enter flex gap-3">
            <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center border border-zinc-800/40 ${getModeAvatarColor(activeMode)}`}>
              <div className="forge-dots flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '0s' }} />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '0.15s' }} />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-[#14141d]/85 bg-[#09090d]/90 backdrop-blur-md p-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex flex-col bg-[#0c0c12]/80 border border-[#1d1d2b] focus-within:border-[#6366f1]/50 focus-within:ring-1 focus-within:ring-[#6366f1]/20 rounded-xl transition-all duration-300 shadow-md">
            <div className="relative flex-1">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isBuilding}
                className="w-full bg-transparent px-4 py-3.5 pr-12 text-[13px] text-zinc-200 outline-none disabled:opacity-50 placeholder-transparent"
              />
              {!draft && !isFocused && (
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 text-[13px]">
                  <span>{placeholder}</span>
                  <span className="w-1.5 h-3.5 ml-1 bg-[#6366f1] animate-pulse" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-3 py-2 border-t border-[#161622]/40 bg-[#08080c]/50">
              {!hideTechnicalClutter ? (
                <button
                  type="button"
                  onClick={onToggleAdvanced}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0"
                >
                  <span>Advanced Mode</span>
                  <span className="text-[9px] text-zinc-500">{advancedOpen ? '▲' : '▼'}</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={isBuilding || (!draft.trim() && !taskContext)}
                className="inline-flex items-center justify-center gap-1.5 bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#1a2d24] disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold text-[12px] px-3.5 py-1.5 rounded-lg transition-all shadow-[0_2px_8px_rgba(99,102,241,0.2)] cursor-pointer"
              >
                <span>{isBuilding ? 'Building...' : 'Go — build'}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
