'use client'

import React from 'react'
import ModelPicker from './ModelPicker'
import type { ForgeAutonomy, ForgeMode, ForgeProjectType } from '@/lib/studio/forge-types'

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
    <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#141417] bg-[#09090b]/80">
      <div className="flex gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className={`px-2 py-1 rounded text-[11px] font-medium ${
              mode === m.id
                ? 'bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/30'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-[#262626]" />

      <div className="flex gap-1">
        {(['founder', 'developer'] as ForgeAutonomy[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onAutonomyChange(a)}
            className={`px-2 py-1 rounded text-[11px] capitalize ${
              autonomy === a ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <select
        value={projectType}
        onChange={(e) => onProjectTypeChange(e.target.value as ForgeProjectType)}
        className="text-[11px] bg-[#050505] border border-[#141417] rounded px-2 py-1 text-zinc-400"
      >
        {PROJECT_TYPES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

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

      {isDeveloper && onSkipGithubPushChange && (
        <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer">
          <input
            type="checkbox"
            checked={skipGithubPush}
            onChange={(e) => onSkipGithubPushChange(e.target.checked)}
            className="rounded border-zinc-700"
          />
          Local only (no push)
        </label>
      )}

      {onProactiveScan && (
        <button
          type="button"
          disabled={proactiveScanning}
          onClick={onProactiveScan}
          className="text-[10px] px-2 py-1 rounded border border-[#262626] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          {proactiveScanning ? 'Scanning…' : 'Proactive scan'}
        </button>
      )}

      {costEstimate && (
        <span className="text-[10px] text-zinc-600" title="Estimated OpenRouter cost">
          Est. {costEstimate}
        </span>
      )}

      {showPlanApprove && (
        <button
          type="button"
          onClick={onPlanApproved}
          className="ml-auto px-3 py-1 rounded-md bg-[#6366f1] text-white text-[11px] font-medium hover:bg-[#5558e6]"
        >
          Approve plan & build
        </button>
      )}
    </div>
  )
}
