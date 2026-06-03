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
}: CTOChatPanelProps) {
  const [draft, setDraft] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

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
    <div className="flex flex-col h-full bg-[#09090b] border-r border-[#141417] min-h-0">
      {/* Context badge */}
      <div className="shrink-0 px-4 py-3 border-b border-[#141417]">
        {taskContext ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-[#6366f1]/20 bg-[#6366f1]/8 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
            <span className="text-[12px] font-medium text-[#818cf8] truncate max-w-[280px]">
              {taskContext.title}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-zinc-600">
            Karnex Studio
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={feedRef} className="flex-1 overflow-y-auto forge-scroll p-4 space-y-4 min-h-0">
        {showEmptyState && (
          <div className="mb-4">
            <h2 className="text-[18px] font-semibold text-zinc-100">What do you want to build?</h2>
            <p className="text-[13px] text-zinc-500 mt-1">
              Pick a sprint task or describe your feature below.
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {suggestions.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onSuggestionSelect(chip.specification)}
                    disabled={isBuilding}
                    className="text-[12px] px-3 py-1.5 rounded-full border border-[#262626] bg-[#0a0a0e] text-zinc-300 hover:border-[#6366f1]/40 hover:text-[#818cf8] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`forge-msg-enter flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.sender !== 'user' && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center text-[11px] font-bold">
                K
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#6366f1] text-white'
                  : msg.sender === 'system'
                    ? 'bg-[#0a0a0e] border border-[#141417] text-zinc-500 font-mono text-[11px]'
                    : 'bg-[#0a0a0e] border border-[#141417] text-zinc-200'
              }`}
            >
              {msg.sender === 'builder' && (
                <p className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#6366f1] mb-1">
                  Karnex
                </p>
              )}
              {msg.message}
            </div>
          </div>
        ))}

        {isBuilding && (
          <div className="forge-msg-enter flex gap-2.5">
            <div className="h-8 w-8 shrink-0 rounded-full bg-[#6366f1]/10 flex items-center justify-center">
              <div className="forge-dots flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-[#6366f1]" />
                <span className="h-1 w-1 rounded-full bg-[#6366f1]" />
                <span className="h-1 w-1 rounded-full bg-[#6366f1]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-[#141417] p-4 space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add custom instructions..."
            disabled={isBuilding}
            className="w-full bg-[#0a0a0e] border border-[#141417] rounded-lg px-3.5 py-2.5 text-[13px] text-zinc-200 placeholder-zinc-600 focus:border-[#6366f1]/50 outline-none transition-colors disabled:opacity-50"
          />
          {!isBuilding && (
            <button
              type="submit"
              className="w-full bg-[#6366f1] hover:bg-[#5558e6] disabled:bg-[#312e81] text-white font-semibold text-[14px] py-3 rounded-lg transition-colors cursor-pointer"
            >
              Go — build this
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={onToggleAdvanced}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Advanced Mode {advancedOpen ? '▴' : '▾'}
        </button>
      </div>
    </div>
  )
}
