import { getRecordCategory } from './categories'
import type { VaultCategory, VaultRecord, AgentOutputRow } from './types'

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'pain-transformer-v1': 'Pain-to-Product Transformer',
  'idea-crystallizer-v1': 'Idea Crystallizer',
  'competitive-landscape-v1': 'Competitive Landscape',
  'icp-definer-v1': 'ICP Definer',
  'war-room-v1': 'War Room',
  'sprint-planner-v1': 'Sprint Planner',
  'builder-v1': 'Builder',
  'research-v1': 'Research',
  'outreach-v1': 'Outreach',
  'daily-standup-v1': 'Daily Standup',
  'weekly-debrief-v1': 'Weekly Debrief',
}

const CATEGORY_ICONS: Record<VaultCategory, string> = {
  all: '📦',
  code: '💻',
  research: '🔍',
  campaigns: '📣',
  documents: '📄',
  briefs: '💡',
}

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

export function mapAgentOutputRows(rows: AgentOutputRow[]): VaultRecord[] {
  return rows.map((row) => {
    const run = Array.isArray(row.agent_runs)
      ? row.agent_runs[0]
      : row.agent_runs

    return {
      id: row.id,
      agentRunId: row.agent_run_id,
      outputType: row.output_type,
      output: (row.output ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
      agentId: run?.agent_id ?? 'unknown',
      agentVersion: run?.agent_version ?? undefined,
      runStatus: run?.status,
      durationMs: run?.duration_ms ?? null,
    }
  })
}

export function getAgentDisplayName(agentId: string): string {
  return AGENT_DISPLAY_NAMES[agentId] ?? agentId.replace(/-v\d+$/, '').replace(/-/g, ' ')
}

export function getVaultIcon(record: VaultRecord): string {
  return CATEGORY_ICONS[getRecordCategory(record)]
}

export function getVaultTitle(record: VaultRecord): string {
  const { outputType, output } = record

  if (outputType === 'builder_output') {
    return asString(output.summary, 'Code build')
  }

  if (outputType === 'research_brief') {
    const brief = asRecord(output.research_brief)
    const question = asString(output.research_question)
    if (brief) {
      const summary = asString(brief.executive_summary)
      if (summary) return summary.slice(0, 80) + (summary.length > 80 ? '…' : '')
    }
    return question || 'Research brief'
  }

  if (outputType === 'product_hypothesis') {
    const hypotheses = asArray(output.hypotheses)
    const idx = typeof output.recommended_hypothesis === 'number'
      ? output.recommended_hypothesis
      : 0
    const hyp = asRecord(hypotheses[idx]) ?? asRecord(hypotheses[0])
    if (hyp) return asString(hyp.title, 'Product hypothesis')
    const pain = asRecord(output.pain_analysis)
    if (pain) return asString(pain.core_pain, 'Pain analysis').slice(0, 80)
    return 'Product hypothesis'
  }

  if (outputType === 'outreach_campaign') {
    const campaign = asRecord(output.campaign) ?? output
    return asString(campaign.name, asString(campaign.goal, 'Outreach campaign'))
  }

  if (outputType === '90_day_roadmap') {
    return asString(output.title, '90-day roadmap')
  }

  if (outputType === 'weekly_sprint_plan') {
    return asString(output.title, asString(output.sprint_title, 'Weekly sprint plan'))
  }

  if (outputType === 'standup_summary') {
    return asString(output.title, 'Daily standup summary')
  }

  return outputType.replace(/_/g, ' ')
}

export function getSizeLabel(record: VaultRecord): string {
  const { output } = record
  const files = asArray(output.files)

  if (files.length > 0) {
    let bytes = 0
    for (const f of files) {
      const file = asRecord(f)
      if (file && typeof file.content === 'string') {
        bytes += file.content.length
      }
    }
    if (bytes >= 1024) return `${files.length} files · ${Math.round(bytes / 1024)} KB`
    return `${files.length} files · ${bytes} chars`
  }

  const len = JSON.stringify(output).length
  if (len >= 1024) return `${Math.round(len / 1024)} KB`
  return `${len} chars`
}

export function getSearchableText(record: VaultRecord): string {
  return `${getVaultTitle(record)} ${getAgentDisplayName(record.agentId)} ${JSON.stringify(record.output)}`
}

export function slugifyFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'vault-export'
}

export function hasCodeFiles(record: VaultRecord): boolean {
  return asArray(record.output.files).length > 0
}

export function formatOutputAsMarkdown(record: VaultRecord): string {
  const title = getVaultTitle(record)
  const agent = getAgentDisplayName(record.agentId)
  const date = new Date(record.createdAt).toLocaleString()
  const lines: string[] = [
    `# ${title}`,
    '',
    `**Agent:** ${agent}  `,
    `**Type:** ${record.outputType}  `,
    `**Created:** ${date}  `,
    '',
  ]

  const { outputType, output } = record

  if (outputType === 'builder_output') {
    lines.push(asString(output.summary), '')
    const files = asArray(output.files)
    for (const f of files) {
      const file = asRecord(f)
      if (!file) continue
      const path = asString(file.path, 'file')
      const lang = asString(file.language, '')
      lines.push(`## ${path}`, '')
      lines.push('```' + lang, asString(file.content), '```', '')
    }
    const setup = asArray(output.setup_instructions)
    if (setup.length) {
      lines.push('## Setup', '')
      for (const step of setup) lines.push(`- ${String(step)}`)
      lines.push('')
    }
    return lines.join('\n')
  }

  if (outputType === 'research_brief') {
    const brief = asRecord(output.research_brief)
    if (brief) {
      lines.push('## Executive summary', '', asString(brief.executive_summary), '')
      const findings = asArray(brief.key_findings)
      if (findings.length) {
        lines.push('## Key findings', '')
        for (const item of findings) {
          const f = asRecord(item)
          if (!f) continue
          lines.push(`### ${asString(f.title, 'Finding')}`, '', asString(f.description), '')
        }
      }
      const actions = asArray(brief.recommended_actions)
      if (actions.length) {
        lines.push('## Recommended actions', '')
        for (const a of actions) lines.push(`- ${String(a)}`)
        lines.push('')
      }
    }
    return lines.join('\n')
  }

  if (outputType === 'product_hypothesis') {
    const pain = asRecord(output.pain_analysis)
    if (pain) {
      lines.push('## Pain analysis', '', asString(pain.core_pain), '')
    }
    const hypotheses = asArray(output.hypotheses)
    if (hypotheses.length) {
      lines.push('## Hypotheses', '')
      hypotheses.forEach((h, i) => {
        const hyp = asRecord(h)
        if (!hyp) return
        lines.push(`### ${i + 1}. ${asString(hyp.title, 'Hypothesis')}`, '')
        lines.push(`**Problem:** ${asString(hyp.problem_statement)}`, '')
        lines.push(`**Solution:** ${asString(hyp.proposed_solution)}`, '')
        lines.push(`**Score:** ${hyp.overall_score ?? '—'}`, '')
      })
    }
    return lines.join('\n')
  }

  if (outputType === '90_day_roadmap') {
    lines.push(asString(output.title), '')
    const phases = asArray(output.phases)
    for (const p of phases) {
      const phase = asRecord(p)
      if (!phase) continue
      lines.push(`## Phase ${phase.phase_number ?? ''}: ${asString(phase.title)}`, '')
      lines.push(asString(phase.theme), '')
    }
    return lines.join('\n')
  }

  if (outputType === 'outreach_campaign') {
    const campaign = asRecord(output.campaign) ?? output
    lines.push(`**Goal:** ${asString(campaign.goal)}`, '')
    const templates = asArray(campaign.message_templates)
    templates.forEach((t, i) => {
      const tpl = asRecord(t)
      if (!tpl) return
      lines.push(`## Message ${i + 1}`, '', asString(tpl.body, asString(tpl.subject)), '')
    })
    return lines.join('\n')
  }

  lines.push('```json', JSON.stringify(output, null, 2), '```')
  return lines.join('\n')
}
