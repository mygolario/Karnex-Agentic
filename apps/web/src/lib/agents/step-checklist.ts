export type ChecklistStepState = 'pending' | 'active' | 'done'

export interface ChecklistStep {
  id: string
  label: string
  state: ChecklistStepState
}

export function activeStepIndexFromRun(
  run: Record<string, unknown>,
  stepLabels: string[]
): number {
  if (!stepLabels.length) return 0
  const tools = run.tools_called
  if (Array.isArray(tools) && tools.length > 0) {
    return Math.min(Math.max(0, tools.length - 1), stepLabels.length - 1)
  }
  const status = String(run.status ?? '')
  if (status === 'success') return stepLabels.length - 1
  const builderMap: Record<string, number> = {
    queued: 0,
    decomposing_specifications: 0,
    spawning_db_designer: 1,
    spawning_ui_coder: 3,
    running_linter_validation: 4,
    committing_to_github: 5,
    generating_search_queries: 0,
    searching_web_sources: 1,
    synthesizing_brief: 2,
  }
  if (builderMap[status] !== undefined) {
    return Math.min(builderMap[status], stepLabels.length - 1)
  }
  return 0
}

export function buildChecklistFromLabels(
  stepLabels: string[],
  activeIndex: number,
  runStatus: string
): ChecklistStep[] {
  const done = runStatus === 'success'
  return stepLabels.map((label, i) => {
    let state: ChecklistStepState = 'pending'
    if (done) state = 'done'
    else if (i < activeIndex) state = 'done'
    else if (i === activeIndex) state = 'active'
    return { id: `step-${i}`, label, state }
  })
}

export function stepLabelFromRun(
  run: Record<string, unknown>,
  stepLabels: string[]
): string | null {
  if (!stepLabels.length) return null
  const idx = activeStepIndexFromRun(run, stepLabels)
  return stepLabels[idx] ?? null
}
