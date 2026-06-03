import type { AgentRunLog, ChatMessage, ChecklistStep, StudioTaskContext } from './types'

const STATUS_ORDER = [
  'queued',
  'decomposing_specifications',
  'spawning_db_designer',
  'spawning_ui_coder',
  'running_linter_validation',
  'committing_to_github',
  'success',
] as const

function statusIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number])
  return idx >= 0 ? idx : -1
}

function parseTableNameFromLogs(logs: AgentRunLog[]): string | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const msg = logs[i]?.message ?? ''
    const match =
      msg.match(/table[s]?\s+['"`]?(\w+)['"`]?/i) ??
      msg.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i)
    if (match?.[1]) return match[1]
  }
  return null
}

export function statusToProgress(status: string): number {
  switch (status) {
    case 'queued':
      return 8
    case 'decomposing_specifications':
      return 25
    case 'spawning_db_designer':
      return 50
    case 'spawning_ui_coder':
      return 70
    case 'running_linter_validation':
      return 88
    case 'committing_to_github':
      return 95
    case 'success':
      return 100
    default:
      return 0
  }
}

export function statusToCtoMessage(status: string): Pick<ChatMessage, 'sender' | 'message'> | null {
  switch (status) {
    case 'queued':
      return {
        sender: 'builder',
        message:
          "I've queued your build. Give me about 60 seconds to scaffold everything and push a preview branch.",
      }
    case 'decomposing_specifications':
      return {
        sender: 'builder',
        message:
          "I've analyzed your requirements and mapped out the files I'll generate.",
      }
    case 'spawning_db_designer':
      return {
        sender: 'builder',
        message:
          "I've designed the Supabase schema and migration scripts for this feature.",
      }
    case 'spawning_ui_coder':
      return {
        sender: 'builder',
        message:
          "I've scaffolded the API routes and started generating UI components.",
      }
    case 'running_linter_validation':
      return {
        sender: 'builder',
        message: "I've run the linter and wrote tests for the critical paths.",
      }
    case 'committing_to_github':
      return {
        sender: 'builder',
        message: "I've pushed the feature branch to GitHub — opening a PR next.",
      }
    case 'success':
      return {
        sender: 'builder',
        message:
          "I've finished the build. Your preview should be live — take a look on the right.",
      }
    default:
      return null
  }
}

export function statusToChecklistSteps(status: string, logs: AgentRunLog[] = []): ChecklistStep[] {
  const currentIdx = statusIndex(status)
  const tableName = parseTableNameFromLogs(logs)
  const tableLabel = tableName ? `Created Supabase table '${tableName}'` : 'Created Supabase tables'

  const stepDefs: { id: string; label: string; order: number }[] = [
    { id: 'analyze', label: 'Analyzed requirements', order: 0 },
    { id: 'schema', label: tableLabel, order: 1 },
    { id: 'api', label: 'Scaffolded API routes', order: 2 },
    { id: 'ui', label: 'Generating UI components...', order: 3 },
    { id: 'tests', label: 'Writing tests', order: 4 },
    { id: 'github', label: 'Pushing to GitHub branch', order: 5 },
    { id: 'vercel', label: 'Triggering Vercel preview', order: 6 },
  ]

  return stepDefs.map((step) => {
    let state: ChecklistStep['state'] = 'pending'

    if (status === 'success') {
      state = 'done'
    } else if (currentIdx < 0) {
      state = 'pending'
    } else if (step.order < currentIdx) {
      state = 'done'
    } else if (step.order === currentIdx) {
      state = step.id === 'ui' && status === 'spawning_ui_coder' ? 'active' : 'active'
      if (step.order < currentIdx) state = 'done'
    } else if (step.order === currentIdx + 1 && currentIdx >= 0) {
      state = 'active'
    }

    if (status === 'success') {
      state = 'done'
    } else if (currentIdx >= 0) {
      if (step.order < currentIdx) {
        state = 'done'
      } else if (step.order === currentIdx) {
        state = 'active'
      } else if (step.order === currentIdx + 1 && step.id === 'ui' && status === 'spawning_db_designer') {
        state = 'pending'
      } else {
        state = 'pending'
      }
    }

    if (status === 'queued' && step.id === 'analyze') state = 'active'
    if (status === 'decomposing_specifications') {
      if (step.id === 'analyze') state = 'done'
      if (step.id === 'schema') state = 'active'
    }
    if (status === 'spawning_db_designer') {
      if (['analyze'].includes(step.id)) state = 'done'
      if (step.id === 'schema') state = 'done'
      if (step.id === 'api') state = 'active'
    }
    if (status === 'spawning_ui_coder') {
      if (['analyze', 'schema', 'api'].includes(step.id)) state = 'done'
      if (step.id === 'ui') state = 'active'
    }
    if (status === 'running_linter_validation') {
      if (['analyze', 'schema', 'api', 'ui'].includes(step.id)) state = 'done'
      if (step.id === 'tests') state = 'active'
    }
    if (status === 'committing_to_github') {
      if (['analyze', 'schema', 'api', 'ui', 'tests'].includes(step.id)) state = 'done'
      if (step.id === 'github') state = 'active'
    }
    if (status === 'success') {
      state = 'done'
    }

    return { id: step.id, label: step.label, state }
  })
}

export function buildCtoGreeting(task: {
  title: string
  agent_config: Record<string, unknown> | null
}): string {
  const config = task.agent_config ?? {}
  const summary = (config.context_summary as string) || ''
  const seconds = (config.estimated_duration_seconds as number) || 60
  const duration =
    seconds < 60 ? `about ${seconds} seconds` : `about ${Math.ceil(seconds / 60)} minutes`

  const preInput = config.pre_populated_input as Record<string, unknown> | undefined
  const spec = (preInput?.specification as string) || task.title

  let message = `I've reviewed your task: ${spec}.`
  if (summary) message += ` ${summary}`
  message += ` Ready to scaffold this — hit Go and I'll push a branch in ${duration}.`
  return message
}

export function buildPayloadFromTask(task: StudioTaskContext): Record<string, unknown> {
  const config = task.agent_config ?? {}
  if (config.pre_populated_input) {
    return config.pre_populated_input as Record<string, unknown>
  }
  return {
    task_type: config.task_type || 'scaffold_feature',
    specification: config.specification || task.title,
    tech_stack: config.tech_stack || { framework: 'nextjs', styling: 'tailwind', database: 'supabase' },
  }
}
