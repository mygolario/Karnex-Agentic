'use client'

import React, { useState } from 'react'

interface PlanEditorProps {
  pendingPlan: Record<string, unknown> | null | undefined
  onSaveAndBuild: (editedSpec: string) => void
  disabled?: boolean
}

export default function PlanEditor({ pendingPlan, onSaveAndBuild, disabled }: PlanEditorProps) {
  const initial =
    typeof pendingPlan?.status_message === 'string'
      ? pendingPlan.status_message
      : typeof pendingPlan?.summary_of_approach === 'string'
        ? `${pendingPlan.summary_of_approach}\n\nFiles:\n${(pendingPlan.files_planned as string[] | undefined)?.join('\n') || ''}`
        : JSON.stringify(pendingPlan, null, 2)

  const [text, setText] = useState(initial)

  if (!pendingPlan) return null

  return (
    <div className="shrink-0 border-t border-[#141417] bg-[#09090b] p-4">
      <p className="text-[11px] text-zinc-500 mb-2">Edit plan before build (Developer mode)</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full bg-[#050505] border border-[#141417] rounded-md p-3 text-[12px] text-zinc-300 font-mono resize-y min-h-[120px]"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSaveAndBuild(text)}
        className="mt-2 px-4 py-2 rounded-md bg-[#6366f1] text-white text-[12px] font-medium hover:bg-[#5558e6] disabled:opacity-50"
      >
        Save plan edits & build
      </button>
    </div>
  )
}
