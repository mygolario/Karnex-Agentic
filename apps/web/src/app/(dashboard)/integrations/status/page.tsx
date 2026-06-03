'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { INTEGRATION_PROVIDERS } from '@/lib/integrations/providers'
import { formatRelativeTime } from '@/lib/integrations/providers'
import { KARNEX_HUB_PROVIDER } from '@/lib/integrations/recipes'
import {
  getTokenHealth,
  tokenHealthLabel,
  type TokenHealth,
} from '@/lib/integrations/token-health'

interface IntegrationRow {
  id: string
  provider: string
  status: string
  token_expires_at: string | null
  last_used_at: string | null
  access_token_encrypted: string | null
  metadata: Record<string, unknown> | null
}

function healthBadgeClass(health: TokenHealth): string {
  switch (health) {
    case 'valid':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    case 'expiring':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    case 'expired':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    default:
      return 'text-[#525252] bg-white/[0.04] border-[#1a1a1a]'
  }
}

export default function IntegrationsStatusPage() {
  return (
    <ErrorBoundary>
      <StatusContent />
    </ErrorBoundary>
  )
}

function StatusContent() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<IntegrationRow[]>([])
  const [usageByIntegration, setUsageByIntegration] = useState<Record<string, number>>({})
  const [platformResendOk, setPlatformResendOk] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const [integrationsRes, logsRes, resendRes] = await Promise.all([
        supabase
          .from('integrations')
          .select(
            'id, provider, status, token_expires_at, last_used_at, access_token_encrypted, metadata'
          )
          .eq('founder_id', session.user.id)
          .neq('provider', KARNEX_HUB_PROVIDER),
        supabase
          .from('automation_logs')
          .select('integration_id')
          .eq('founder_id', session.user.id)
          .gte('created_at', monthStart.toISOString()),
        fetch('/api/integrations/resend/status'),
      ])

      const list = (integrationsRes.data ?? []) as IntegrationRow[]
      setRows(list.filter((r) => r.status === 'active'))

      const counts: Record<string, number> = {}
      logsRes.data?.forEach((log) => {
        if (log.integration_id) {
          counts[log.integration_id] = (counts[log.integration_id] ?? 0) + 1
        }
      })
      setUsageByIntegration(counts)

      if (resendRes.ok) {
        const body = (await resendRes.json()) as { active?: boolean }
        setPlatformResendOk(Boolean(body.active))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const handleReconnect = (provider: string) => {
    setActing(provider)
    window.location.assign(`/api/integrations/${provider}/connect`)
  }

  const handleDisconnect = async (provider: string) => {
    setActing(provider)
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, { method: 'POST' })
      setRows((prev) => prev.filter((r) => r.provider !== provider))
    } catch (err) {
      console.error(err)
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <p className="text-[13px] text-[#525252] py-8 text-center">Loading status…</p>
    )
  }

  const oauthProviders = new Set(['github', 'gmail'])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-label mb-2">Level 3 — Status</h2>
        <p className="text-[13px] text-[#737373]">
          Token health, usage, and quotas for connected integrations.
        </p>
      </div>

      {platformResendOk && (
        <div className="border border-[#1a1a1a] bg-[#050505] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[20px]">📧</span>
            <div>
              <p className="text-[15px] font-bold text-white">Resend</p>
              <p className="text-[12px] text-[#737373]">Platform transactional email</p>
            </div>
          </div>
          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${healthBadgeClass('valid')}`}
          >
            Active
          </span>
        </div>
      )}

      {rows.length === 0 && !platformResendOk ? (
        <p className="text-[13px] text-[#525252] text-center py-12 border border-[#1a1a1a] rounded-2xl">
          No connected integrations. Connect accounts on the Connect tab.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((row) => {
            const provDef = INTEGRATION_PROVIDERS.find((p) => p.id === row.provider)
            const hasOAuth = oauthProviders.has(row.provider)
            const health = getTokenHealth(
              row.token_expires_at,
              hasOAuth && Boolean(row.access_token_encrypted)
            )
            const gmailMeta = row.metadata as {
              emails_sent_today?: number
            } | null
            const emailsToday = gmailMeta?.emails_sent_today ?? 0
            const usesMonth = usageByIntegration[row.id] ?? 0

            return (
              <div
                key={row.id}
                className="border border-[#1a1a1a] bg-[#050505] rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[20px]">{provDef?.icon ?? '🔗'}</span>
                    <p className="text-[15px] font-bold text-white capitalize">
                      {provDef?.name ?? row.provider}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${healthBadgeClass(health)}`}
                  >
                    {tokenHealthLabel(health)}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <dt className="text-[#525252] uppercase tracking-wide text-[10px]">
                      Last used
                    </dt>
                    <dd className="text-[#e5e5e5] mt-0.5 font-mono">
                      {formatRelativeTime(row.last_used_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#525252] uppercase tracking-wide text-[10px]">
                      Uses this month
                    </dt>
                    <dd className="text-[#e5e5e5] mt-0.5 font-mono">{usesMonth}</dd>
                  </div>
                  {row.provider === 'gmail' && (
                    <div className="col-span-2">
                      <dt className="text-[#525252] uppercase tracking-wide text-[10px]">
                        Quota remaining
                      </dt>
                      <dd className="text-[#e5e5e5] mt-0.5 font-mono">
                        {Math.max(0, 50 - emailsToday)} / 50 emails today
                      </dd>
                    </div>
                  )}
                </dl>

                {hasOAuth && (
                  <div className="flex justify-end gap-3 pt-1">
                    {health === 'expired' && (
                      <button
                        type="button"
                        disabled={acting === row.provider}
                        onClick={() => handleReconnect(row.provider)}
                        className="text-[12px] font-semibold text-[#6366f1] hover:text-[#818cf8] cursor-pointer disabled:opacity-50"
                      >
                        Reconnect
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={acting === row.provider}
                      onClick={() => handleDisconnect(row.provider)}
                      className="text-[12px] font-semibold text-red-400 hover:text-red-300 cursor-pointer disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
