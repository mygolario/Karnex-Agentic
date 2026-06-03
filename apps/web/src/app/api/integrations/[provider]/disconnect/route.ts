import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupportedOAuthProvider } from '@/lib/integrations/oauth'

type RouteContext = { params: Promise<{ provider: string }> }

export async function POST(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const { provider } = await context.params

  if (!isSupportedOAuthProvider(provider)) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('founder_id', user.id)
    .eq('provider', provider)

  if (error) {
    console.error('Disconnect failed:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
