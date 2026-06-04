import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ status: 'degraded', reasons: ['Not signed in'] }, { status: 401 })
  }

  const reasons: string[] = []
  let degraded = false

  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, status')
    .eq('founder_id', user.id)

  const active = new Set(
    (integrations || []).filter((i) => i.status === 'active').map((i) => i.provider)
  )

  if (!active.has('github')) {
    reasons.push('GitHub not connected')
    degraded = true
  }

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || process.env.AGENT_SERVICE_URL
  if (!agentUrl) {
    reasons.push('Agent service URL not configured')
    degraded = true
  }

  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY)
  if (!openRouterConfigured) {
    reasons.push('OpenRouter key missing on server')
    degraded = true
  }

  return NextResponse.json({
    status: degraded ? 'degraded' : 'ok',
    reasons,
    integrations: Array.from(active),
    mcp_note: 'MCP tools depend on Cursor/host environment; Karnex integrations checked above.',
  })
}
