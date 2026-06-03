'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { IntegrationCard } from '@/components/integrations/IntegrationCard'
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProviderId,
} from '@/lib/integrations/providers'
import { KARNEX_HUB_PROVIDER } from '@/lib/integrations/recipes'

interface Integration {
  id: string
  provider: string
  status: string
  connected_at: string | null
  last_used_at: string | null
  metadata: Record<string, unknown> | null
}

export default function IntegrationsConnectPage() {
  return (
    <ErrorBoundary>
      <IntegrationsConnectContent />
    </ErrorBoundary>
  )
}

function IntegrationsConnectContent() {
  const supabase = createSupabaseBrowserClient()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [platformResendActive, setPlatformResendActive] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const [{ data: list }, resendRes] = await Promise.all([
        supabase
          .from('integrations')
          .select('id, provider, status, connected_at, last_used_at, metadata')
          .eq('founder_id', session.user.id)
          .neq('provider', KARNEX_HUB_PROVIDER),
        fetch('/api/integrations/resend/status'),
      ])

      if (list) setIntegrations(list as Integration[])
      if (resendRes.ok) {
        const body = (await resendRes.json()) as { active?: boolean }
        setPlatformResendActive(Boolean(body.active))
      }
    } catch (err) {
      console.error('Error fetching integrations:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      setBanner({ type: 'success', message: `${connected} connected successfully.` })
      loadData()
    } else if (error) {
      setBanner({ type: 'error', message: `Connection failed: ${error}` })
    }
  }, [searchParams, loadData])

  const githubConnected = integrations.some(
    (i) => i.provider === 'github' && i.status === 'active'
  )

  const handleConnect = async (providerId: IntegrationProviderId) => {
    if (providerId === 'vercel') {
      setConnectingProvider('vercel')
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        if (!githubConnected) {
          setBanner({ type: 'error', message: 'Connect GitHub before enabling Vercel preview.' })
          return
        }
        await supabase.from('integrations').upsert({
          founder_id: session.user.id,
          provider: 'vercel',
          status: 'active',
          metadata: { linked_via: 'github' },
        })
        const res = await fetch('/api/integrations/vercel/deploy', { method: 'POST' })
        if (!res.ok) throw new Error('Deploy link failed')
        await loadData()
        setBanner({ type: 'success', message: 'Vercel preview linked.' })
      } catch {
        setBanner({ type: 'error', message: 'Could not enable Vercel preview.' })
      } finally {
        setConnectingProvider(null)
      }
      return
    }

    setConnectingProvider(providerId)
    try {
      window.location.assign(`/api/integrations/${providerId}/connect`)
      return
    } catch (err) {
      console.error(err)
      setBanner({ type: 'error', message: `Could not start ${providerId} connection.` })
      setConnectingProvider(null)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    setConnectingProvider(providerId)
    try {
      const res = await fetch(`/api/integrations/${providerId}/disconnect`, {
        method: 'POST',
      })
      if (!res.ok) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase
            .from('integrations')
            .delete()
            .eq('founder_id', session.user.id)
            .eq('provider', providerId)
        }
      }
      setIntegrations((prev) => prev.filter((i) => i.provider !== providerId))
      setBanner({ type: 'success', message: `Disconnected ${providerId}.` })
    } catch (err) {
      console.error(err)
      setBanner({ type: 'error', message: 'Disconnect failed.' })
    } finally {
      setConnectingProvider(null)
    }
  }

  if (loading) {
    return (
      <p className="text-[13px] text-[#525252] py-8 text-center">Loading integrations…</p>
    )
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-[13px] ${
            banner.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div>
        <h2 className="section-label mb-4">Level 1 — Connect</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATION_PROVIDERS.map((prov) => (
            <IntegrationCard
              key={prov.id}
              provider={prov}
              integration={integrations.find((i) => i.provider === prov.id)}
              platformResendActive={platformResendActive}
              githubConnected={githubConnected}
              connecting={connectingProvider === prov.id}
              onConnect={() => handleConnect(prov.id)}
              onDisconnect={() => handleDisconnect(prov.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
