'use client'

import React, { useState, useEffect } from 'react'
import type { ForgeMode } from '@/lib/studio/forge-types'
import { Hammer, Compass, HelpCircle, Bug, X, ChevronRight } from 'lucide-react'

interface DetectedModeChipProps {
  detectedMode: Exclude<ForgeMode, 'auto'> | null
  reason?: string
  currentMode: ForgeMode
  onSwitch: (mode: Exclude<ForgeMode, 'auto'>) => void
}

const THEMES: Record<Exclude<ForgeMode, 'auto'>, {
  name: string
  bg: string
  border: string
  text: string
  mutedText: string
  btnBg: string
  btnHoverBg: string
  btnText: string
  glow: string
  icon: React.ReactNode
}> = {
  build: {
    name: 'Build',
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-500/30',
    text: 'text-emerald-200',
    mutedText: 'text-emerald-400/70',
    btnBg: 'bg-emerald-600',
    btnHoverBg: 'hover:bg-emerald-500',
    btnText: 'text-white',
    glow: 'shadow-[0_8px_30px_rgba(16,185,129,0.15)]',
    icon: <Hammer className="w-4 h-4 text-emerald-400 animate-bounce" style={{ animationDuration: '2s' }} />
  },
  plan: {
    name: 'Plan',
    bg: 'bg-amber-950/90',
    border: 'border-amber-500/30',
    text: 'text-amber-200',
    mutedText: 'text-amber-400/70',
    btnBg: 'bg-amber-600',
    btnHoverBg: 'hover:bg-amber-500',
    btnText: 'text-white',
    glow: 'shadow-[0_8px_30px_rgba(245,158,11,0.15)]',
    icon: <Compass className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
  },
  ask: {
    name: 'Ask',
    bg: 'bg-sky-950/90',
    border: 'border-sky-500/30',
    text: 'text-sky-200',
    mutedText: 'text-sky-400/70',
    btnBg: 'bg-sky-600',
    btnHoverBg: 'hover:bg-sky-500',
    btnText: 'text-white',
    glow: 'shadow-[0_8px_30px_rgba(14,165,233,0.15)]',
    icon: <HelpCircle className="w-4 h-4 text-sky-400" />
  },
  debug: {
    name: 'Debug',
    bg: 'bg-rose-950/90',
    border: 'border-rose-500/30',
    text: 'text-rose-200',
    mutedText: 'text-rose-400/70',
    btnBg: 'bg-rose-600',
    btnHoverBg: 'hover:bg-rose-500',
    btnText: 'text-white',
    glow: 'shadow-[0_8px_30px_rgba(244,63,94,0.15)]',
    icon: <Bug className="w-4 h-4 text-rose-400 animate-pulse" />
  }
}

export default function DetectedModeChip({
  detectedMode,
  reason,
  currentMode,
  onSwitch,
}: DetectedModeChipProps) {
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed state whenever a new mode is detected
  useEffect(() => {
    setDismissed(false)
  }, [detectedMode])

  if (currentMode !== 'auto' || !detectedMode || dismissed) return null

  const theme = THEMES[detectedMode]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInBounce {
          0% {
            transform: translate(20px, 100px) scale(0.9);
            opacity: 0;
          }
          60% {
            transform: translate(-10px, -5px) scale(1.02);
            opacity: 0.9;
          }
          85% {
            transform: translate(2px, 2px) scale(0.99);
            opacity: 0.95;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
        }
        .animate-slide-bounce {
          animation: slideInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}} />

      <div className={`fixed bottom-6 right-6 z-50 w-80 max-w-sm rounded-2xl border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-xl p-4 flex flex-col gap-3 animate-slide-bounce shadow-2xl`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
              {theme.icon}
            </div>
            <div>
              <span className={`text-xs font-semibold ${theme.text} tracking-wide block`}>
                Switch to {theme.name} Mode?
              </span>
              <span className={`text-[10px] uppercase font-mono tracking-wider ${theme.mutedText}`}>
                AI Auto-Detected Mode
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {reason && (
          <p className="text-[11px] text-zinc-400 leading-normal bg-black/30 p-2 rounded-lg border border-white/5">
            <span className="text-zinc-500 font-mono text-[10px]">Reason:</span> {reason}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => onSwitch(detectedMode)}
            className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 px-3 rounded-lg ${theme.btnBg} ${theme.btnHoverBg} ${theme.btnText} transition-all duration-200 active:scale-95 cursor-pointer shadow-md`}
          >
            Switch to {theme.name}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 py-2 px-3 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
          >
            Keep Auto
          </button>
        </div>
      </div>
    </>
  )
}
