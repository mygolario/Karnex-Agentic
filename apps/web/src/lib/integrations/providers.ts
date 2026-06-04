export type IntegrationProviderId =
  | 'github'
  | 'gmail'
  | 'vercel'
  | 'posthog'
  | 'notion'
  | 'calcom'
  | 'zapier'
  | 'resend'

export type ConnectMode = 'oauth' | 'platform' | 'coming_soon' | 'link_github' | 'link_platform'

export interface ProviderDefinition {
  id: IntegrationProviderId
  name: string
  icon: string
  valueProp: string
  connectMode: ConnectMode
  category: 'code' | 'marketing' | 'analytics' | 'vault' | 'platform'
}

export const INTEGRATION_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: '💻',
    valueProp: 'Builder Agent pushes code directly to your repo',
    connectMode: 'oauth',
    category: 'code',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '✉️',
    valueProp: 'Outreach Agent sends campaigns from your address',
    connectMode: 'oauth',
    category: 'marketing',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    valueProp: 'One-click deploy after every build',
    connectMode: 'link_github',
    category: 'code',
  },
  {
    id: 'posthog',
    name: 'PostHog',
    icon: '🦔',
    valueProp: 'Analytics Agent reads your product metrics',
    connectMode: 'coming_soon',
    category: 'analytics',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '📓',
    valueProp: 'Sync your roadmap and notes',
    connectMode: 'coming_soon',
    category: 'vault',
  },
  {
    id: 'calcom',
    name: 'Cal.com',
    icon: '📅',
    valueProp: 'Sales Agent books meetings automatically',
    connectMode: 'coming_soon',
    category: 'marketing',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    icon: '⚡',
    valueProp: "Connect any tool Karnex doesn't support yet",
    connectMode: 'coming_soon',
    category: 'platform',
  },
  {
    id: 'resend',
    name: 'Resend',
    icon: '📧',
    valueProp: 'Karnex sends transactional briefs, alerts, and automation emails on your behalf',
    connectMode: 'link_platform',
    category: 'platform',
  },
]

export const OAUTH_PROVIDERS = new Set<IntegrationProviderId>(['github', 'gmail'])

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString()
}
