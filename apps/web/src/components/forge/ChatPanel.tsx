'use client'

import React, { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  sender: 'user' | 'design' | 'database' | 'builder' | 'github' | 'system'
  message: string
  timestamp: Date
  fileCreated?: string
}

interface ChatPanelProps {
  messages: ChatMessage[]
  isBuilding: boolean
  onSendPrompt: (prompt: string) => void
  framework: string
  styling: string
  database: string
  onFrameworkChange: (v: string) => void
  onStylingChange: (v: string) => void
  onDatabaseChange: (v: string) => void
  buildProgress: number
}

const senderConfig: Record<string, { label: string; color: string; iconBg: string }> = {
  user:     { label: 'You',      color: 'text-indigo-300',  iconBg: 'bg-[#6366f1]' },
  design:   { label: 'Design',   color: 'text-purple-400',  iconBg: 'bg-purple-500/20' },
  database: { label: 'Database', color: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
  builder:  { label: 'Builder',  color: 'text-indigo-400',  iconBg: 'bg-indigo-500/15' },
  github:   { label: 'GitHub',   color: 'text-zinc-400',    iconBg: 'bg-zinc-800' },
  system:   { label: 'System',   color: 'text-zinc-500',    iconBg: 'bg-zinc-900' },
}

function SenderIcon({ sender }: { sender: string }) {
  const size = 'h-3 w-3'
  switch (sender) {
    case 'user':
      return <svg className={size} fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
    case 'design':
      return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
    case 'database':
      return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>
    case 'builder':
      return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
    case 'github':
      return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 103 3m-3-3a3 3 0 01-3 3m15-12v6m0 0a3 3 0 11-3 3m3-3a3 3 0 013 3M6 3a3 3 0 00-3 3m3-3a3 3 0 013 3" /></svg>
    default:
      return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>
  }
}

export default function ChatPanel({
  messages,
  isBuilding,
  onSendPrompt,
  framework,
  styling,
  database,
  onFrameworkChange,
  onStylingChange,
  onDatabaseChange,
  buildProgress,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages, isBuilding])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || isBuilding) return
    onSendPrompt(draft.trim())
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!draft.trim() || isBuilding) return
      onSendPrompt(draft.trim())
      setDraft('')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-r border-[#141417]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-[#141417] shrink-0">
        <span className="text-[13px] font-semibold text-zinc-300">Forge</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-[5px] w-[5px] rounded-full ${isBuilding ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[10px] text-zinc-500 font-medium">
            {isBuilding ? 'Building' : 'Online'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={feedRef} className="flex-1 overflow-y-auto forge-scroll p-4 space-y-3 min-h-0">
        {messages.map((msg) => {
          const cfg = senderConfig[msg.sender] || senderConfig.system
          const isUser = msg.sender === 'user'

          return (
            <div
              key={msg.id}
              className={`forge-msg-enter flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                <span className={cfg.color}>
                  <SenderIcon sender={msg.sender} />
                </span>
              </div>

              {/* Content */}
              <div className={`max-w-[85%] min-w-0 ${isUser ? 'items-end' : ''}`}>
                <span className="text-[10px] uppercase tracking-wide text-zinc-600 font-medium block mb-1">
                  {cfg.label}
                </span>
                <div className={`rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                  isUser
                    ? 'bg-indigo-500/8 border border-indigo-500/10 text-zinc-200'
                    : 'bg-white/[0.02] border border-[#141417] text-zinc-300'
                }`}>
                  {msg.message}
                </div>

                {/* File created indicator */}
                {msg.fileCreated && (
                  <div className="mt-1.5 flex items-center gap-1.5 bg-zinc-900/50 rounded-md px-2 py-1 w-fit">
                    <svg className="h-3 w-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-[11px] font-mono text-zinc-500">{msg.fileCreated}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Building indicator */}
        {isBuilding && (
          <div className="forge-msg-enter space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-zinc-900 shrink-0">
                <span className="text-zinc-500">
                  <SenderIcon sender="system" />
                </span>
              </div>
              <div className="forge-dots flex items-center gap-1 py-2">
                <span /><span /><span />
              </div>
            </div>
            {/* Progress bar */}
            <div className="ml-[34px] h-1 bg-zinc-800/60 rounded-full overflow-hidden max-w-[200px]">
              <div
                className="h-full bg-[#6366f1] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${buildProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Config drawer */}
      {showConfig && (
        <div className="px-4 py-3 border-t border-[#141417] bg-[#0a0a0e] space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-zinc-600 font-medium block mb-1">Framework</label>
              <select
                value={framework}
                onChange={(e) => onFrameworkChange(e.target.value)}
                className="dash-input text-[11px] py-1.5 px-2"
              >
                <option value="nextjs">Next.js</option>
                <option value="react">React</option>
                <option value="fastapi">FastAPI</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-zinc-600 font-medium block mb-1">Styling</label>
              <select
                value={styling}
                onChange={(e) => onStylingChange(e.target.value)}
                className="dash-input text-[11px] py-1.5 px-2"
              >
                <option value="tailwind">Tailwind</option>
                <option value="vanilla-css">Vanilla CSS</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-zinc-600 font-medium block mb-1">Database</label>
              <select
                value={database}
                onChange={(e) => onDatabaseChange(e.target.value)}
                className="dash-input text-[11px] py-1.5 px-2"
              >
                <option value="supabase">Supabase</option>
                <option value="postgresql">PostgreSQL</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[#141417] bg-[#0a0a0e] p-3 shrink-0">
        <form onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBuilding}
            rows={2}
            placeholder="Describe what to build..."
            className="w-full resize-none bg-transparent border border-[#1a1a1a] rounded-lg text-[13px] text-zinc-200 placeholder-zinc-700 px-3 py-2 focus:outline-none focus:border-indigo-500/30 transition-colors disabled:opacity-40"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-700 select-none">Ctrl+Enter to send</span>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showConfig ? 'Hide settings' : 'Settings'}
              </button>
            </div>
            <button
              type="submit"
              disabled={isBuilding || !draft.trim()}
              className="bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 text-white text-[11px] font-medium rounded-md px-3 py-1.5 transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
