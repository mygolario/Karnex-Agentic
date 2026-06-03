'use client'

import React, { useState } from 'react'
import { getRecordCategory } from '@/lib/vault/categories'
import type { VaultRecord } from '@/lib/vault/types'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

interface CodeFile {
  path: string
  content: string
  language: string
}

interface VaultOutputPreviewProps {
  record: VaultRecord
}

export default function VaultOutputPreview({ record }: VaultOutputPreviewProps) {
  const category = getRecordCategory(record)
  const { outputType, output } = record

  if (category === 'code' || outputType === 'builder_output') {
    return <CodePreview output={output} />
  }

  if (outputType === 'research_brief') {
    return <ResearchPreview output={output} />
  }

  if (outputType === 'product_hypothesis') {
    return <HypothesisPreview output={output} />
  }

  if (outputType === 'outreach_campaign') {
    return <CampaignPreview output={output} />
  }

  if (outputType === '90_day_roadmap') {
    return <RoadmapPreview output={output} />
  }

  if (outputType === 'weekly_sprint_plan' || outputType === 'standup_summary') {
    return <DocumentPreview output={output} />
  }

  return <JsonFallback output={output} />
}

function CodePreview({ output }: { output: Record<string, unknown> }) {
  const files: CodeFile[] = asArray(output.files)
    .map((f) => asRecord(f))
    .filter(
      (f): f is Record<string, unknown> =>
        Boolean(f && typeof f.path === 'string' && typeof f.content === 'string')
    )
    .map((f) => ({
      path: f.path as string,
      content: f.content as string,
      language: typeof f.language === 'string' ? f.language : '',
    }))

  const [selectedIdx, setSelectedIdx] = useState(0)
  const summary = asString(output.summary)
  const selected = files[selectedIdx]

  if (!files.length) {
    return <JsonFallback output={output} />
  }

  return (
    <div className="space-y-3">
      {summary ? (
        <p className="text-[13px] text-[#a1a1a1] leading-relaxed">{summary}</p>
      ) : null}
      {files.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {files.map((file, idx) => (
            <button
              key={file.path}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                idx === selectedIdx
                  ? 'border-[#6366f1] text-[#e5e5e5] bg-[#6366f1]/10'
                  : 'border-[#1a1a1a] text-[#525252] hover:text-[#a1a1a1]'
              }`}
            >
              {file.path.split('/').pop() || file.path}
            </button>
          ))}
        </div>
      ) : null}
      {selected ? (
        <pre className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 max-h-80 overflow-auto text-[11px] font-mono text-[#a1a1a1] leading-relaxed whitespace-pre-wrap">
          {selected.content}
        </pre>
      ) : null}
    </div>
  )
}

function ResearchPreview({ output }: { output: Record<string, unknown> }) {
  const brief = asRecord(output.research_brief)
  if (!brief) return <JsonFallback output={output} />

  const findings = asArray(brief.key_findings)

  return (
    <div className="space-y-4 text-[13px]">
      <Section label="Executive summary" body={asString(brief.executive_summary)} />
      {findings.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Key findings</p>
          {findings.map((item, i) => {
            const f = asRecord(item)
            if (!f) return null
            return (
              <div key={i} className="border border-[#1a1a1a] rounded-lg p-3 space-y-1">
                <p className="font-semibold text-white">{asString(f.title, 'Finding')}</p>
                <p className="text-[#737373] leading-relaxed">{asString(f.description)}</p>
              </div>
            )
          })}
        </div>
      ) : null}
      <BulletList label="Recommended actions" items={asArray(brief.recommended_actions)} />
    </div>
  )
}

function HypothesisPreview({ output }: { output: Record<string, unknown> }) {
  const pain = asRecord(output.pain_analysis)
  const hypotheses = asArray(output.hypotheses)
  const recommended =
    typeof output.recommended_hypothesis === 'number' ? output.recommended_hypothesis : 0

  return (
    <div className="space-y-4 text-[13px]">
      {pain ? (
        <Section label="Core pain" body={asString(pain.core_pain)} />
      ) : null}
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Hypotheses</p>
        {hypotheses.map((h, i) => {
          const hyp = asRecord(h)
          if (!hyp) return null
          const isRec = i === recommended
          return (
            <div
              key={i}
              className={`border rounded-lg p-3 space-y-2 ${
                isRec ? 'border-[#6366f1]/40 bg-[#6366f1]/5' : 'border-[#1a1a1a]'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-white">{asString(hyp.title, 'Hypothesis')}</p>
                {isRec ? (
                  <span className="text-[10px] uppercase tracking-wide text-[#6366f1] bg-[#6366f1]/10 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                ) : null}
              </div>
              <p className="text-[#737373] leading-relaxed">{asString(hyp.problem_statement)}</p>
              <p className="text-[#a1a1a1] leading-relaxed">{asString(hyp.proposed_solution)}</p>
              {typeof hyp.overall_score === 'number' ? (
                <p className="text-[11px] text-[#525252]">Overall score: {hyp.overall_score}%</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CampaignPreview({ output }: { output: Record<string, unknown> }) {
  const campaign = asRecord(output.campaign) ?? output
  const templates = asArray(campaign.message_templates)

  return (
    <div className="space-y-4 text-[13px]">
      <Section label="Goal" body={asString(campaign.goal)} />
      {templates.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Messages</p>
          {templates.map((t, i) => {
            const tpl = asRecord(t)
            if (!tpl) return null
            return (
              <div key={i} className="border border-[#1a1a1a] rounded-lg p-3 space-y-1">
                {tpl.subject ? (
                  <p className="font-semibold text-white">{asString(tpl.subject)}</p>
                ) : null}
                <p className="text-[#737373] leading-relaxed whitespace-pre-wrap">
                  {asString(tpl.body, asString(tpl.content))}
                </p>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function RoadmapPreview({ output }: { output: Record<string, unknown> }) {
  const phases = asArray(output.phases)

  return (
    <div className="space-y-4 text-[13px]">
      <Section label="Roadmap" body={asString(output.title, '90-day roadmap')} />
      {phases.map((p, i) => {
        const phase = asRecord(p)
        if (!phase) return null
        return (
          <div key={i} className="border border-[#1a1a1a] rounded-lg p-3 space-y-1">
            <p className="font-semibold text-white">
              Phase {String(phase.phase_number ?? i + 1)}: {asString(phase.title)}
            </p>
            <p className="text-[#737373]">{asString(phase.theme)}</p>
          </div>
        )
      })}
    </div>
  )
}

function DocumentPreview({ output }: { output: Record<string, unknown> }) {
  const title = asString(output.title, asString(output.sprint_title))
  const goals = asArray(output.goals)
  const summary = asString(output.summary, asString(output.executive_summary))

  return (
    <div className="space-y-3 text-[13px]">
      {title ? <p className="font-semibold text-white">{title}</p> : null}
      {summary ? <p className="text-[#737373] leading-relaxed">{summary}</p> : null}
      <BulletList label="Goals" items={goals} />
    </div>
  )
}

function Section({ label, body }: { label: string; body: string }) {
  if (!body) return null
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">{label}</p>
      <p className="text-[#e5e5e5] leading-relaxed">{body}</p>
    </div>
  )
}

function BulletList({ label, items }: { label: string; items: unknown[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">{label}</p>
      <ul className="list-disc list-inside text-[#737373] space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>{String(item)}</li>
        ))}
      </ul>
    </div>
  )
}

function JsonFallback({ output }: { output: Record<string, unknown> }) {
  return (
    <pre className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 max-h-80 overflow-auto text-[11px] font-mono text-[#737373] leading-relaxed">
      {JSON.stringify(output, null, 2)}
    </pre>
  )
}
