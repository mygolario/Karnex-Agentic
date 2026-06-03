'use client'

import type { ProviderDefinition } from '@/lib/integrations/providers'
import { formatRelativeTime } from '@/lib/integrations/providers'

interface IntegrationRow {
  provider: string
  status: string
  last_used_at: string | null
  connected_at: string | null
}

interface IntegrationCardProps {
  provider: ProviderDefinition
  integration?: IntegrationRow | null
  platformResendActive?: boolean
  githubConnected?: boolean
  connecting?: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function IntegrationCard({
  provider,
  integration,
  platformResendActive = false,
  githubConnected = false,
  connecting = false,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const isPlatform = provider.connectMode === 'platform'
  const isComingSoon = provider.connectMode === 'coming_soon'
  const isLinkGithub = provider.connectMode === 'link_github'

  const connected = isPlatform
    ? platformResendActive
    : isLinkGithub
      ? Boolean(integration) || githubConnected
      : integration?.status === 'active'

  const showConnect =
    !isPlatform &&
    !isComingSoon &&
    !connected &&
    provider.connectMode === 'oauth'

  const showDisconnect =
    provider.connectMode === 'oauth' && connected && integration

  return (
    <div className="border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl flex flex-col justify-between hover:border-[#262626] transition-colors min-h-[180px]">
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[20px]" aria-hidden>
            {provider.icon}
          </span>
          <h4 className="text-[15px] font-bold text-white">{provider.name}</h4>
          {connected ? (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Connected ✓
            </span>
          ) : isPlatform ? (
            <span className="text-[10px] text-[#737373] bg-white/[0.04] border border-[#1a1a1a] px-2 py-0.5 rounded-full font-medium">
              {platformResendActive ? 'Included with Karnex' : 'Not configured'}
            </span>
          ) : (
            <span className="text-[10px] text-[#525252] bg-white/[0.02] border border-[#1a1a1a] px-2 py-0.5 rounded-full font-medium">
              Not connected
            </span>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-[#737373]">{provider.valueProp}</p>
        {connected && integration?.last_used_at && (
          <p className="text-[11px] text-[#525252] font-mono">
            Last used {formatRelativeTime(integration.last_used_at)}
          </p>
        )}
        {connected && isPlatform && platformResendActive && (
          <p className="text-[11px] text-[#525252]">Platform transactional email</p>
        )}
        {isLinkGithub && !integration && githubConnected && (
          <p className="text-[11px] text-[#525252]">Link via GitHub connection</p>
        )}
      </div>

      <div className="pt-4 flex justify-end gap-3">
        {isComingSoon && (
          <span className="text-[12px] text-[#525252] font-medium">Coming soon</span>
        )}
        {showDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={connecting}
            className="text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            Disconnect
          </button>
        )}
        {showConnect && (
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting}
            className="text-[12px] font-semibold text-[#6366f1] hover:text-[#818cf8] transition-colors cursor-pointer disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : 'Connect →'}
          </button>
        )}
        {isLinkGithub && !connected && (
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting || !githubConnected}
            className="text-[12px] font-semibold text-[#6366f1] hover:text-[#818cf8] transition-colors cursor-pointer disabled:opacity-50"
            title={githubConnected ? undefined : 'Connect GitHub first'}
          >
            {githubConnected ? 'Enable preview →' : 'Connect GitHub first'}
          </button>
        )}
      </div>
    </div>
  )
}
