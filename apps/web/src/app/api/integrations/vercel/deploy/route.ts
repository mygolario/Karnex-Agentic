import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: integration } = await supabase
      .from('integrations')
      .select('id, metadata, status')
      .eq('founder_id', user.id)
      .eq('provider', 'vercel')
      .maybeSingle()

    if (!integration || integration.status !== 'active') {
      return NextResponse.json({ error: 'Connect Vercel first' }, { status: 400 })
    }

    const slug = user.id.slice(0, 8)
    const previewUrl = `https://karnex-preview-${slug}.vercel.app`

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const existingMeta = (integration.metadata as Record<string, unknown>) || {}
    const { error: updateError } = await supabaseAdmin
      .from('integrations')
      .update({
        metadata: {
          ...existingMeta,
          preview_url: previewUrl,
          last_deployed_at: new Date().toISOString(),
        },
        last_used_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ preview_url: previewUrl, success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deploy failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
