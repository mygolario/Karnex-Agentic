import { NextRequest, NextResponse } from 'next/server'
import { runAutomationTrigger } from '@/lib/automations/execute'

export const dynamic = 'force-dynamic'

function verifyInternalAuth(request: NextRequest): boolean {
  const secret = process.env.KARNEX_INTERNAL_WEBHOOK_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice(7) === secret
}

type TriggerBody = {
  founder_id: string
  recipe_id: string
  trigger_event: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyInternalAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as TriggerBody
    if (!body.founder_id || !body.recipe_id || !body.trigger_event) {
      return NextResponse.json(
        { error: 'founder_id, recipe_id, and trigger_event are required' },
        { status: 400 }
      )
    }

    const result = await runAutomationTrigger({
      founder_id: body.founder_id,
      recipe_id: body.recipe_id,
      trigger_event: body.trigger_event,
      metadata: body.metadata,
    })

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: result.reason === 'recipe_disabled' ? 200 : 422 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Automation trigger error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
