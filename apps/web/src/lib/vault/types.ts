export type VaultCategory =
  | 'all'
  | 'code'
  | 'research'
  | 'campaigns'
  | 'documents'
  | 'briefs'

export interface VaultRecord {
  id: string
  agentRunId: string
  outputType: string
  output: Record<string, unknown>
  createdAt: string
  agentId: string
  agentVersion?: string
  runStatus?: string
  durationMs?: number | null
}

export type VaultDownloadFormat = 'markdown' | 'json' | 'zip'

export interface AgentOutputRow {
  id: string
  agent_run_id: string
  output_type: string
  output: Record<string, unknown>
  created_at: string
  agent_runs:
    | {
        agent_id: string
        agent_version: string | null
        status: string
        duration_ms: number | null
      }
    | {
        agent_id: string
        agent_version: string | null
        status: string
        duration_ms: number | null
      }[]
    | null
}
