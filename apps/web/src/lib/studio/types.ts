export interface GeneratedFile {
  path: string
  content: string
  language: string
  description: string
}

export interface BuilderOutput {
  files: GeneratedFile[]
  summary: string
  setup_instructions: string[]
  tests_included: boolean
  deployment_ready: boolean
  suggested_improvements: string[]
}

export type ChatSender = 'user' | 'builder' | 'system'

export interface ChatMessage {
  id: string
  sender: ChatSender
  message: string
  timestamp: Date
}

export interface AgentRunLog {
  sender: string
  message: string
  timestamp: string
  fileCreated?: string
}

export interface TechStack {
  framework: string
  styling: string
  database: string
}

export interface StudioTaskContext {
  id: string
  title: string
  description: string | null
  agent_config: Record<string, unknown> | null
  category: string
}

export interface SuggestionChip {
  id: string
  label: string
  specification: string
}

export type ChecklistStepState = 'pending' | 'active' | 'done'

export interface ChecklistStep {
  id: string
  label: string
  state: ChecklistStepState
}
