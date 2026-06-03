/** Maps registry agent IDs to FastAPI agent HTTP paths. */

const AGENT_ENDPOINT_MAP: Record<string, string> = {
  'builder-v1': 'builder',
  'research-v1': 'research',
  'outreach-v1': 'outreach',
  builder: 'builder',
  research: 'research',
  outreach: 'outreach',
}

export function resolveAgentEndpoint(agentId: string): string | null {
  return AGENT_ENDPOINT_MAP[agentId] ?? null
}

export function getAgentServiceBaseUrl(): string {
  const raw =
    process.env.AGENT_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENT_SERVICE_URL ||
    'http://localhost:8000'
  return raw.replace(/\/$/, '')
}
