'use client'

import React, { useMemo } from 'react'
import { statusToChecklistSteps } from '@/lib/studio/status-mappers'
import { buildChecklistFromLabels, activeStepIndexFromRun } from '@/lib/agents/step-checklist'
import type { AgentRunLog } from '@/lib/studio/types'
import type { ChecklistStep } from '@/lib/agents/step-checklist'

interface BuildChecklistProps {
  status: string
  logs: AgentRunLog[]
  stepLabels?: string[]
  activeIndex?: number
}

export default function BuildChecklist({
  status,
  logs,
  stepLabels,
  activeIndex,
}: BuildChecklistProps) {
  const steps: ChecklistStep[] = useMemo(() => {
    if (stepLabels && stepLabels.length > 0) {
      const idx =
        activeIndex ??
        activeStepIndexFromRun({ status, tools_called: logs.map((l) => l.message) }, stepLabels)
      return buildChecklistFromLabels(stepLabels, idx, status)
    }
    return statusToChecklistSteps(status, logs)
  }, [status, logs, stepLabels, activeIndex])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#050505]/95 z-10">
      <h4 className="text-[14px] font-semibold text-white mb-6 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#6366f1] animate-pulse" />
        Building...
      </h4>
      <ul className="w-full max-w-sm space-y-3">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-[13px]">
            <span
              className={`checklist-check h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                step.state === 'done'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 checklist-check-done'
                  : step.state === 'active'
                    ? 'border-[#6366f1]/50 bg-[#6366f1]/10 text-[#818cf8]'
                    : 'border-[#262626] text-zinc-600'
              }`}
            >
              {step.state === 'done' ? '✓' : step.state === 'active' ? '→' : '○'}
            </span>
            <span
              className={
                step.state === 'done'
                  ? 'text-zinc-400'
                  : step.state === 'active'
                    ? 'text-zinc-100 animate-pulse'
                    : 'text-zinc-600'
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
