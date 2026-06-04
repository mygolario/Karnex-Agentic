'use client'

import React, { useState } from 'react'

interface PlanEditorProps {
  pendingPlan: Record<string, unknown> | null | undefined
  onSaveAndBuild: (editedSpec: string) => void
  disabled?: boolean
}

export default function PlanEditor({ pendingPlan, onSaveAndBuild, disabled }: PlanEditorProps) {
  const filesPlanned = pendingPlan && typeof pendingPlan === 'object' ? (pendingPlan.files_planned as string[] | undefined) : undefined
  const summaryOfApproach = pendingPlan && typeof pendingPlan === 'object' ? (pendingPlan.summary_of_approach as string | undefined) : undefined
  const statusMessage = pendingPlan && typeof pendingPlan === 'object' ? (pendingPlan.status_message as string | undefined) : undefined

  const initial =
    typeof statusMessage === 'string'
      ? statusMessage
      : typeof summaryOfApproach === 'string'
        ? `${summaryOfApproach}\n\nFiles:\n${filesPlanned?.join('\n') || ''}`
        : JSON.stringify(pendingPlan, null, 2)

  const [text, setText] = useState(initial)

  if (!pendingPlan) return null

  return (
    <div className="shrink-0 border-t border-[#1a1a24] bg-[#07070a] p-5 space-y-4">
      {/* Gated Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f59e0b]/8 border border-[#f59e0b]/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-amber-200">Founder/Developer Approval Gate</h4>
            <p className="text-[11px] text-amber-500/80 mt-0.5 leading-relaxed">
              Karnex has proposed a modification plan. Review the impact details and edit the instructions below to proceed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/20">
            Awaiting Approval
          </span>
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Side: Overview */}
        <div className="lg:col-span-2 space-y-3 bg-[#0a0a0f] border border-[#14141d] rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-zinc-500 block mb-1.5">
                Proposed Approach
              </span>
              <p className="text-[12px] text-zinc-300 leading-relaxed font-sans bg-[#0c0c12]/50 border border-[#161622]/40 rounded-lg p-3">
                {summaryOfApproach || statusMessage || "Analyzing repository and constructing targeted patches."}
              </p>
            </div>

            {filesPlanned && filesPlanned.length > 0 && (
              <div>
                <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-zinc-500 block mb-2">
                  Targeted Files ({filesPlanned.length})
                </span>
                <div className="max-h-[140px] overflow-y-auto forge-scroll space-y-1.5 pr-1">
                  {filesPlanned.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-[#0c0c12]/30 px-2 py-1 rounded border border-[#161622]/30">
                      <svg className="w-3.5 h-3.5 text-[#6366f1]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate" title={f}>{f.split('/').pop() || f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#161622]/40 text-[11px] text-zinc-500">
            Verify files and plan specs. You can directly edit the workspace instructions on the right to redirect the builder.
          </div>
        </div>

        {/* Right Side: Code Editor style textarea */}
        <div className="lg:col-span-3 flex flex-col bg-[#0c0c12] border border-[#1a1a28] rounded-xl overflow-hidden shadow-lg">
          {/* Header tab bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#09090d] border-b border-[#161622]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-semibold text-zinc-400 font-mono">workspace_build_plan.md</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Markdown Editor</span>
          </div>

          {/* Editor content */}
          <div className="relative flex-1 flex min-h-[220px]">
            {/* Visual Line Number Gutter */}
            <div className="w-10 bg-[#09090d] border-r border-[#161622] select-none text-[10px] font-mono text-zinc-600/80 text-right pr-2.5 pt-3 leading-relaxed">
              {Array.from({ length: Math.max(8, text.split('\n').length + 1) }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={disabled}
              className="flex-1 bg-transparent px-3 py-3 text-[12px] text-zinc-200 font-mono leading-relaxed outline-none resize-none min-h-[200px]"
            />
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-end gap-3 px-4 py-3 bg-[#09090d] border-t border-[#161622]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSaveAndBuild(text)}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#1a2d24] disabled:text-zinc-600 text-white font-semibold text-[12px] px-4 py-2 rounded-lg transition-all shadow-[0_2px_8px_rgba(16,185,129,0.15)] cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Approve & Scaffold</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
