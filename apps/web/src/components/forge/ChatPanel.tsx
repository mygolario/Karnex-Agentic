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
    <div className="flex flex-col h-full bg-[#050507] min-w-0">
      
      {/* ── 1. Chat/Logs Feed (Top) ── */}
      <div className="flex-1 overflow-y-auto forge-scroll p-5 space-y-5 min-h-0 bg-[#030303] bg-[radial-gradient(rgba(255,255,255,0.007)_1.5px,transparent_1.5px)] [background-size:20px_20px]">
        {store.chatMessages.map((msg, index) => {
          const cfg = senderConfig[msg.sender] || senderConfig.system
          const isUser = msg.sender === 'user'

          // Render system messages minimally without bubbles
          if (msg.sender === 'system') {
            return (
              <div key={msg.id || index} className="flex justify-center my-2 select-text">
                <span className="text-[10.5px] font-mono text-zinc-650 bg-zinc-950/40 px-3 py-1 rounded-full border border-zinc-900/40">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id || index}
              className={`flex gap-3.5 items-start ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {/* Avatar Icon */}
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-zinc-450 border border-zinc-900 ${cfg.iconBg} shadow-sm`}>
                <span className="scale-[0.8]">
                  {msg.sender === 'user' ? (
                    <User className="h-4 w-4 text-zinc-200" />
                  ) : msg.sender === 'forge' || msg.sender === 'builder' ? (
                    <Hammer className="h-4 w-4 text-indigo-400" />
                  ) : msg.sender === 'design' ? (
                    <Paintbrush className="h-4 w-4 text-purple-400" />
                  ) : msg.sender === 'database' ? (
                    <Cpu className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Cpu className="h-4 w-4 text-zinc-500" />
                  )}
                </span>
              </div>

              {/* Message bubble */}
              <div className={`flex flex-col max-w-[80%] min-w-0 ${isUser ? 'items-end' : ''}`}>
                <span className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-550 mb-1 select-none font-bold">
                  {cfg.label}
                </span>
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed select-text border shadow-sm ${
                    isUser
                      ? 'bg-[#0f0f12] border-zinc-800 text-zinc-105'
                      : 'bg-zinc-950/40 border-zinc-900/80 text-zinc-300'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}

        {store.loading && (
          <div className="flex gap-3.5 items-center animate-pulse">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-zinc-950 border border-zinc-900 shrink-0">
              <Loader2 className="h-3.5 w-3.5 text-zinc-650 animate-spin" />
            </div>
            <div className="flex items-center gap-1 py-1">
              <span className="h-1.5 w-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 bg-zinc-600 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={historyEndRef} />
      </div>

      {/* ── 2. Prompt Controls & Text Area (Bottom) ── */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/30 shrink-0 space-y-4 shadow-lg relative">
        
        {/* Configurations Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Tech Stack selectors */}
          <div className="flex items-center gap-1.5">
            <select
              value={store.framework}
              onChange={(e) => store.setTechStack({ framework: e.target.value })}
              className="bg-zinc-950 border border-zinc-900 text-zinc-450 text-[10.5px] font-semibold font-mono rounded-lg px-2.5 py-1.5 outline-none hover:bg-zinc-900/60 cursor-pointer"
            >
              <option value="nextjs">Next.js</option>
              <option value="react">React</option>
            </select>
            <select
              value={store.styling}
              onChange={(e) => store.setTechStack({ styling: e.target.value })}
              className="bg-zinc-950 border border-zinc-900 text-zinc-450 text-[10.5px] font-semibold font-mono rounded-lg px-2.5 py-1.5 outline-none hover:bg-zinc-900/60 cursor-pointer"
            >
              <option value="tailwind">Tailwind</option>
              <option value="vanilla-css">Vanilla CSS</option>
            </select>
            <select
              value={store.database}
              onChange={(e) => store.setTechStack({ database: e.target.value })}
              className="bg-zinc-950 border border-zinc-900 text-zinc-450 text-[10.5px] font-semibold font-mono rounded-lg px-2.5 py-1.5 outline-none hover:bg-zinc-900/60 cursor-pointer"
            >
              <option value="supabase">Supabase</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>

          {/* Model picker & Autonomy */}
          <div className="flex items-center gap-1.5">
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10.5px] font-semibold font-mono transition-all cursor-pointer ${
                store.autonomy === 'founder'
                  ? 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                  : 'bg-zinc-950 border-zinc-900 text-zinc-450 hover:bg-zinc-900/60'
              }`}
              title={store.autonomy === 'founder' ? 'Autonomous Mode (Forge builds directly)' : 'Developer Mode (Forge stops for plan approvals)'}
            >
              {store.autonomy === 'founder' ? (
                <>
                  <Unlock className="h-3.5 w-3.5 text-purple-400" />
                  Autonomous
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-zinc-550" />
                  Gated
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text Area Prompt Input Box */}
        <div className="relative group rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 focus-within:border-zinc-800 transition-all focus-within:shadow-md">
          <textarea
            value={store.draft}
            onChange={(e) => store.setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={store.loading}
            rows={3}
            placeholder="Spec new features, modifications, design assets or bugs to fix..."
            className="w-full resize-none bg-transparent text-[13px] text-zinc-200 placeholder-zinc-700 outline-none leading-relaxed"
          />

          {imagePreview && (
            <div className="relative mt-2 h-14 w-14 rounded-lg overflow-hidden border border-zinc-800 group/img">
              <img src={imagePreview} alt="Upload preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-zinc-450 opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-900/60">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-zinc-550 hover:text-zinc-300 hover:bg-zinc-900 transition-all cursor-pointer"
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
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9.5px] font-semibold font-mono select-none">
                  <Sparkles className="h-2.5 w-2.5" />
                  {store.forgeMode}
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={store.loading || !store.draft.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-650 disabled:cursor-not-allowed text-black text-[11.5px] font-semibold transition-all cursor-pointer shadow-sm"
            >
              <Send className="h-3 w-3" />
              Build
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleQuickAction('Add user authentication and profiles')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e0e11] hover:bg-zinc-900 border border-zinc-900 text-[10px] text-zinc-450 hover:text-zinc-200 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="h-2.5 w-2.5" /> Add Auth
          </button>
          <button
            onClick={() => handleQuickAction('Fix TypeScript compile errors and bugs')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e0e11] hover:bg-zinc-900 border border-zinc-900 text-[10px] text-zinc-450 hover:text-zinc-200 transition-all cursor-pointer shadow-sm"
          >
            <Bug className="h-2.5 w-2.5" /> Fix Bug
          </button>
          <button
            onClick={() => handleQuickAction('Redesign page visual aesthetics')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e0e11] hover:bg-zinc-900 border border-zinc-900 text-[10px] text-zinc-450 hover:text-zinc-200 transition-all cursor-pointer shadow-sm"
          >
            <Paintbrush className="h-2.5 w-2.5" /> Redesign UI
          </button>
          <button
            onClick={() => handleQuickAction('Scaffold a new Next.js dashboard project')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e0e11] hover:bg-zinc-900 border border-zinc-900 text-[10px] text-zinc-450 hover:text-zinc-200 transition-all cursor-pointer shadow-sm"
          >
            <FileCode2 className="h-2.5 w-2.5" /> New Dashboard
          </button>
        </div>

      </div>
    </div>
  )
}

