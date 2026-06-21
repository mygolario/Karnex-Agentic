'use client'

import React, { useState, useRef, useEffect, useTransition } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { useForgeContext } from '@/lib/studio/forge-context'
import ModelPicker from '@/components/studio/ModelPicker'
import {
  Send, Sparkles, AlertCircle, RefreshCw, Upload, Image as ImageIcon,
  Cpu, Hammer, User, Settings, Plus, Bug, Paintbrush, FileCode2,
  Lock, Unlock, Loader2
} from 'lucide-react'

// Sender styling config
const senderConfig: Record<string, { label: string; color: string; iconBg: string }> = {
  user:     { label: 'You',      color: 'text-indigo-300',  iconBg: 'bg-[#6366f1]' },
  design:   { label: 'Design',   color: 'text-purple-400',  iconBg: 'bg-purple-500/20' },
  database: { label: 'Database', color: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
  builder:  { label: 'Builder',  color: 'text-indigo-400',  iconBg: 'bg-indigo-500/15' },
  github:   { label: 'GitHub',   color: 'text-zinc-400',    iconBg: 'bg-zinc-800' },
  system:   { label: 'System',   color: 'text-zinc-500',    iconBg: 'bg-zinc-900' },
}

export default function ChatPanel() {
  const store = useForgeStore()
  const { triggerBuild } = useForgeContext()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const historyEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat history
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.chatMessages, store.loading])

  // Detect mode based on text content
  useEffect(() => {
    const text = store.draft.toLowerCase()
    if (!text.trim()) return

    let mode = 'build'
    if (text.includes('plan') || text.includes('architecture') || text.includes('blueprint') || text.includes('how should i')) {
      mode = 'plan'
    } else if (text.includes('ask') || text.includes('explain') || text.includes('why') || text.includes('what is')) {
      mode = 'ask'
    } else if (text.includes('debug') || text.includes('error') || text.includes('fix') || text.includes('bug') || text.includes('crash')) {
      mode = 'debug'
    } else if (text.includes('refine') || text.includes('tweak') || text.includes('change color') || text.includes('modify')) {
      mode = 'refine'
    }
    store.setForgeMode(mode)
  }, [store.draft])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleSend = async () => {
    const text = store.draft.trim()
    if (!text || store.loading) return
    store.setDraft('')
    setImagePreview(null)
    await triggerBuild(text)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleQuickAction = (actionText: string) => {
    store.setDraft(actionText)
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e]/40 border-r border-[#141417]/60 min-w-0">
      {/* ── Prompt Control Panel ── */}
      <div className="p-4 border-b border-[#141417] bg-zinc-950/20 shrink-0 space-y-3.5">
        
        {/* Large Text Area */}
        <div className="relative group rounded-xl border border-white/[0.05] bg-zinc-950/40 p-2.5 focus-within:border-indigo-500/40 transition-colors forge-prompt-glow">
          <textarea
            value={store.draft}
            onChange={(e) => store.setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={store.loading}
            rows={4}
            placeholder="Describe your startup feature or application in detail..."
            className="w-full resize-none bg-transparent text-[13px] text-zinc-200 placeholder-zinc-700 outline-none leading-relaxed"
          />

          {imagePreview && (
            <div className="relative mt-2 h-14 w-14 rounded-lg overflow-hidden border border-white/[0.08] group/img">
              <img src={imagePreview} alt="Upload preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-zinc-400 opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/[0.03]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
                title="Upload screenshot"
              >
                <Upload className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Mode Auto-Detect Chip */}
              {store.draft.trim() && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium font-mono select-none">
                  <Sparkles className="h-2.5 w-2.5" />
                  Mode: {store.forgeMode}
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={store.loading || !store.draft.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 disabled:hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
            >
              <Send className="h-3 w-3" />
              Build
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleQuickAction('Add user authentication and profiles')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Plus className="h-2.5 w-2.5" /> Add Auth
          </button>
          <button
            onClick={() => handleQuickAction('Fix TypeScript compile errors and bugs')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Bug className="h-2.5 w-2.5" /> Fix Bug
          </button>
          <button
            onClick={() => handleQuickAction('Redesign page visual aesthetics')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Paintbrush className="h-2.5 w-2.5" /> Redesign UI
          </button>
          <button
            onClick={() => handleQuickAction('Scaffold a new Next.js dashboard project')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <FileCode2 className="h-2.5 w-2.5" /> New Dashboard
          </button>
        </div>

        {/* Configurations Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-white/[0.03] pt-3.5">
          {/* Tech Stack selectors */}
          <div className="flex items-center gap-2">
            <select
              value={store.framework}
              onChange={(e) => store.setTechStack({ framework: e.target.value })}
              className="bg-zinc-950 border border-white/[0.04] text-zinc-400 text-[10px] font-medium rounded-lg px-2.5 py-1.5 outline-none hover:bg-zinc-900/50"
            >
              <option value="nextjs">Next.js</option>
              <option value="react">React</option>
            </select>
            <select
              value={store.styling}
              onChange={(e) => store.setTechStack({ styling: e.target.value })}
              className="bg-zinc-950 border border-white/[0.04] text-zinc-400 text-[10px] font-medium rounded-lg px-2.5 py-1.5 outline-none hover:bg-zinc-900/50"
            >
              <option value="tailwind">Tailwind</option>
              <option value="vanilla-css">Vanilla CSS</option>
            </select>
            <select
              value={store.database}
              onChange={(e) => store.setTechStack({ database: e.target.value })}
              className="bg-zinc-950 border border-white/[0.04] text-zinc-400 text-[10px] font-medium rounded-lg px-2.5 py-1.5 outline-none hover:bg-zinc-900/50"
            >
              <option value="supabase">Supabase</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>

          {/* Model picker & Autonomy */}
          <div className="flex items-center gap-2">
            <ModelPicker
              modelId={store.selectedModelId || ''}
              autoModel={store.autoModel}
              maxMode={store.maxMode}
              onModelIdChange={(id) => store.setModelConfig({ modelId: id })}
              onAutoModelChange={(v) => store.setModelConfig({ autoModel: v })}
              onMaxModeChange={(v) => store.setModelConfig({ maxMode: v })}
              compact={true}
            />

            {/* Autonomy Toggle */}
            <button
              onClick={() => store.setAutonomy(store.autonomy === 'founder' ? 'developer' : 'founder')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                store.autonomy === 'founder'
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                  : 'bg-zinc-900 border-white/[0.04] text-zinc-400'
              }`}
              title={store.autonomy === 'founder' ? 'Autonomous Mode (Forge builds directly)' : 'Developer Mode (Forge stops for plan approvals)'}
            >
              {store.autonomy === 'founder' ? (
                <>
                  <Unlock className="h-3 w-3 text-purple-400" />
                  Autonomous
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 text-zinc-500" />
                  Gated
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* ── Chat/Logs Feed ── */}
      <div className="flex-1 overflow-y-auto forge-scroll p-4 space-y-4 min-h-0 bg-[#09090c]/20">
        {store.chatMessages.map((msg, index) => {
          const cfg = senderConfig[msg.sender] || senderConfig.system
          const isUser = msg.sender === 'user'

          return (
            <div
              key={msg.id || index}
              className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar Icon */}
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-zinc-400 ${cfg.iconBg}`}>
                <span className="scale-75">
                  {msg.sender === 'user' ? (
                    <User className="h-4.5 w-4.5" />
                  ) : msg.sender === 'forge' || msg.sender === 'builder' ? (
                    <Hammer className="h-4.5 w-4.5 text-indigo-400" />
                  ) : (
                    <Cpu className="h-4.5 w-4.5 text-zinc-400" />
                  )}
                </span>
              </div>

              {/* Message bubble */}
              <div className={`flex flex-col max-w-[80%] min-w-0 ${isUser ? 'items-end' : ''}`}>
                <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">
                  {cfg.label}
                </span>
                <div
                  className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed border ${
                    isUser
                      ? 'bg-indigo-500/5 border-indigo-500/10 text-zinc-200'
                      : 'bg-zinc-950/20 border-white/[0.03] text-zinc-300'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}

        {store.loading && (
          <div className="flex gap-3 items-center">
            <div className="h-6 w-6 rounded-full flex items-center justify-center bg-zinc-900 shrink-0">
              <Loader2 className="h-3 w-3 text-zinc-600 animate-spin" />
            </div>
            <div className="flex items-center gap-1.5 py-1">
              <span className="h-1.5 w-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 bg-zinc-600 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={historyEndRef} />
      </div>
    </div>
  )
}
