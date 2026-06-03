'use client'

import { useCallback, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function usePreviewUrl() {
  const supabase = createSupabaseBrowserClient()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [vercelConnected, setVercelConnected] = useState(false)

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: integration } = await supabase
      .from('integrations')
      .select('status, metadata')
      .eq('founder_id', session.user.id)
      .eq('provider', 'vercel')
      .maybeSingle()

    const active = integration?.status === 'active'
    setVercelConnected(!!active)

    const metadata = integration?.metadata as Record<string, unknown> | null
    const url = (metadata?.preview_url as string) || null
    setPreviewUrl(url)
  }, [supabase])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { previewUrl, setPreviewUrl, vercelConnected, refreshPreviewUrl: refresh }
}
