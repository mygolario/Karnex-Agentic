import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgentApiUrl } from '@/lib/agent-service'

export const dynamic = 'force-dynamic'

/** Trigger a proactive debug scan via builder agent in debug mode */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const specification =
    String(body.specification || '').trim() ||
    'Proactive scan: find bugs, missing error handling, type issues, and security risks in the codebase. Return patches where possible.'

  const payload = {
    task_type: 'custom',
    specification,
    mode: 'debug',
    autonomy: body.autonomy || 'founder',
    project_type: body.project_type || 'auto',
    plan_approved: true,
    tech_stack: body.tech_stack || {
      framework: 'nextjs',
      styling: 'tailwind',
      database: 'supabase',
    },
  }

  const response = await fetch(getAgentApiUrl('v1/agents/builder'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err || 'Scan failed' }, { status: response.status })
  }

  const result = await response.json()
  return NextResponse.json(result)
}
