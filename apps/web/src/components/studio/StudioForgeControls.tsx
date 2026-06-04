'use client'

import React from 'react'
import ModelPicker from './ModelPicker'
import type { ForgeAutonomy, ForgeMode, ForgeProjectType } from '@/lib/studio/forge-types'
import { Sparkles, Hammer, Compass, HelpCircle, Bug, ChevronDown, RefreshCw, Check } from 'lucide-react'

const MODES: { id: ForgeMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'build', label: 'Build' },
  { id: 'plan', label: 'Plan' },
  { id: 'ask', label: 'Ask' },
  { id: 'debug', label: 'Debug' },
]

const PROJECT_TYPES: { id: ForgeProjectType; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'web_nextjs', label: 'Web' },
  { id: 'mobile_expo', label: 'Mobile' },
  { id: 'api_service', label: 'API' },
  { id: 'infra_devops', label: 'Infra' },
]

const MODE_DETAILS: Record<ForgeMode, {
  icon: React.ComponentType<any>
  activeClass: string
}> = {
  auto: {
    icon: Sparkles,
    activeClass: 'bg-purple-500/10 text-purple-200 border-purple-500/35 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
  },
  build: {
    icon: Hammer,
    activeClass: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
  },
  plan: {
    icon: Compass,
    activeClass: 'bg-amber-500/10 text-amber-200 border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
  },
  ask: {
    icon: HelpCircle,
    activeClass: 'bg-sky-500/10 text-sky-200 border-sky-500/35 shadow-[0_0_12px_rgba(14,165,233,0.25)]'
  },
  debug: {
    icon: Bug,
    activeClass: 'bg-rose-500/10 text-rose-200 border-rose-500/35 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
  }
}

interface StudioForgeControlsProps {
  mode: ForgeMode
  autonomy: ForgeAutonomy
  projectType: ForgeProjectType
  modelId: string
  autoModel: boolean
  maxMode: boolean
  planApproved: boolean
  showPlanApprove: boolean
  toolsStatus?: 'ok' | 'degraded'
  useAllSteps?: boolean
  skipGithubPush?: boolean
  costEstimate?: string | null
  onModeChange: (m: ForgeMode) => void
  onAutonomyChange: (a: ForgeAutonomy) => void
  onProjectTypeChange: (p: ForgeProjectType) => void
  onModelIdChange: (id: string) => void
  onAutoModelChange: (v: boolean) => void
  onMaxModeChange: (v: boolean) => void
  onPlanApproved: () => void
  onUseAllStepsChange?: (v: boolean) => void
  onSkipGithubPushChange?: (v: boolean) => void
  onProactiveScan?: () => void
  proactiveScanning?: boolean
}

export default function StudioForgeControls({
  mode,
  autonomy,
  projectType,
  modelId,
  autoModel,
  maxMode,
  showPlanApprove,
  toolsStatus = 'ok',
  useAllSteps = false,
  skipGithubPush = false,
  costEstimate,
  onModeChange,
  onAutonomyChange,
  onProjectTypeChange,
  onModelIdChange,
  onAutoModelChange,
  onMaxModeChange,
  onPlanApproved,
  onUseAllStepsChange,
  onSkipGithubPushChange,
  onProactiveScan,
  proactiveScanning,
}: StudioForgeControlsProps) {
  const isDeveloper = autonomy === 'developer'

  return (
    <div className="shrink-0 mx-4 mt-3 mb-2 p-2.5 rounded-2xl border border-white/[0.05] bg-zinc-950/65 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex flex-wrap items-center justify-between gap-3 transition-all duration-300 relative z-30">
      <div className="flex items-center gap-3.5 flex-wrap">
        {/* Mode Selectors */}
        <div className="flex gap-1.5">
          {MODES.map((m) => {
            const isSelected = mode === m.id
            const details = MODE_DETAILS[m.id]
            const Icon = details.icon
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-250 cursor-pointer ${
                  isSelected
                    ? details.activeClass
                    : 'border-transparent text-zinc-450 hover:text-zinc-250 hover:bg-white/[0.02]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>

        <div className="h-5 w-px bg-zinc-800/80 self-center hidden sm:block" />

        {/* Autonomy Selector */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 p-0.5 rounded-lg shrink-0">
          {(['founder', 'developer'] as ForgeAutonomy[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onAutonomyChange(a)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize transition-all duration-150 cursor-pointer ${
                autonomy === a
                  ? 'bg-zinc-800 text-white border border-zinc-700/30 shadow-[0_2px_6px_rgba(0,0,0,0.4)]'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Project Type Selector */}
        <div className="relative flex items-center shrink-0">
          <select
            value={projectType}
            onChange={(e) => onProjectTypeChange(e.target.value as ForgeProjectType)}
            className="text-[11px] bg-zinc-900 border border-zinc-850 rounded-lg pl-3 pr-8 py-1.5 text-zinc-350 hover:text-white transition-all duration-150 cursor-pointer outline-none appearance-none min-w-[95px]"
          >
            {PROJECT_TYPES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 w-3 h-3 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Model Picker */}
        <ModelPicker
          modelId={modelId}
          autoModel={autoModel}
          maxMode={maxMode}
          toolsStatus={toolsStatus}
          useAllSteps={useAllSteps}
          onUseAllStepsChange={onUseAllStepsChange}
          showDeveloperOptions={isDeveloper}
          onModelIdChange={onModelIdChange}
          onAutoModelChange={onAutoModelChange}
          onMaxModeChange={onMaxModeChange}
          compact
        />

        {/* Local Only Flag */}
        {isDeveloper && onSkipGithubPushChange && (
          <label className="flex items-center gap-2 text-[11px] text-zinc-450 hover:text-zinc-250 cursor-pointer select-none transition-colors duration-150 mr-1">
            <input
              type="checkbox"
              checked={skipGithubPush}
              onChange={(e) => onSkipGithubPushChange(e.target.checked)}
              className="rounded border-zinc-800 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/25 w-3.5 h-3.5 cursor-pointer"
            />
            Local only (no push)
          </label>
        )}

        {/* Proactive Scan Button */}
        {onProactiveScan && (
          <button
            type="button"
            disabled={proactiveScanning}
            onClick={onProactiveScan}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-350 hover:text-white hover:bg-zinc-900/80 hover:border-zinc-700 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${proactiveScanning ? 'animate-spin' : ''}`} />
            {proactiveScanning ? 'Scanning…' : 'Proactive scan'}
          </button>
        )}

        {/* Cost Estimate Badge */}
        {costEstimate && (
          <span className="text-[10px] bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded-md shadow-sm shrink-0" title="Estimated OpenRouter cost">
            Est. {costEstimate}
          </span>
        )}

        {/* Approve Plan Call To Action */}
        {showPlanApprove && (
          <button
            type="button"
            onClick={onPlanApproved}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all duration-200 shadow-[0_0_15px_rgba(99,102,241,0.45)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] cursor-pointer active:scale-95 animate-pulse ml-auto sm:ml-0"
          >
            <Check className="w-3.5 h-3.5" />
            Approve plan & build
          </button>
        )}
      </div>
    </div>
  )
}

