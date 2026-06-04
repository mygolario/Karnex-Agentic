export type ForgeMode = 'plan' | 'ask' | 'debug' | 'build' | 'auto'
export type ForgeAutonomy = 'founder' | 'developer'
export type ForgeProjectType =
  | 'web_nextjs'
  | 'mobile_expo'
  | 'api_service'
  | 'infra_devops'
  | 'fullstack_monorepo'
  | 'auto'

export interface CatalogModel {
  id: string
  display_name: string
  openrouter_model: string
  tier: string
  max_tokens?: number
  badge?: string
  role?: string
  thinking?: boolean
  best_for?: string
  label?: string
}

export interface ForgeRunPayload {
  task_type: string
  specification: string
  tech_stack: { framework: string; styling: string; database: string }
  github_repo?: string | null
  mode: ForgeMode
  autonomy: ForgeAutonomy
  project_type: ForgeProjectType
  model_id?: string
  auto_model: boolean
  max_mode: boolean
  plan_approved: boolean
  preview_url?: string | null
  task_id?: string
}

export type ForgeEventType =
  | 'mode_detected'
  | 'plan_step'
  | 'subagent_spawn'
  | 'subagent_progress'
  | 'tool_call'
  | 'artifact'
  | 'approval_required'
  | 'error'
  | 'log'

export interface ForgeRunLog {
  sender: string
  message: string
  timestamp: string
  type?: ForgeEventType
  fileCreated?: string
  detected_mode?: string
  project_type?: string
  subagent?: string
  approval_type?: string
}
