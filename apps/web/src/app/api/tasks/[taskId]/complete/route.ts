import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

function verifyWebhookAuth(request: NextRequest): boolean {
  const secret = process.env.KARNEX_INTERNAL_WEBHOOK_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice(7) === secret
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase service credentials not configured')
  }
  return createClient(url, key)
}

type CompleteBody = {
  run_id: string
  status: 'success' | 'error' | 'partial'
  agent_output?: Record<string, unknown>
  agent_id?: string
  error_message?: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  if (!verifyWebhookAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { taskId } = await context.params
    const body = (await request.json()) as CompleteBody

    if (!body.run_id || !body.status) {
      return NextResponse.json(
        { error: 'run_id and status are required' },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()

    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select('id, founder_id, category, agent_run_id, status')
      .eq('id', taskId)
      .single()

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.agent_run_id && task.agent_run_id !== body.run_id) {
      return NextResponse.json(
        { error: 'run_id does not match task agent_run_id' },
        { status: 409 }
      )
    }

    let output = body.agent_output ?? {}
    if (!output || Object.keys(output).length === 0) {
      const { data: outRow } = await supabase
        .from('agent_outputs')
        .select('output, output_type')
        .eq('agent_run_id', body.run_id)
        .maybeSingle()
      if (outRow?.output && typeof outRow.output === 'object') {
        output = outRow.output as Record<string, unknown>
      }
    }

    const now = new Date().toISOString()

    if (body.status === 'error') {
      await supabase
        .from('tasks')
        .update({
          status: 'blocked',
          agent_output: {
            error: body.error_message ?? 'Agent execution failed',
            run_id: body.run_id,
          },
          execution_completed_at: now,
        })
        .eq('id', taskId)

      return NextResponse.json({ ok: true, task_status: 'blocked' })
    }

    let taskStatus: Database['public']['Enums']['task_status'] = 'done'
    if (task.category === 'outreach') {
      taskStatus = 'pending_approval'
      output = {
        ...output,
        requires_approval: true,
        campaign_status: 'pending_approval',
      }
    }

    await supabase
      .from('tasks')
      .update({
        status: taskStatus,
        agent_output: output,
        completed_at: taskStatus === 'done' ? now : null,
        execution_completed_at: now,
      })
      .eq('id', taskId)

    const outputType =
      task.category === 'build'
        ? 'builder_output'
        : task.category === 'outreach'
          ? 'outreach_campaign'
          : task.category === 'research'
            ? 'research_brief'
            : `task_${task.category}`

    const { data: existingOut } = await supabase
      .from('agent_outputs')
      .select('id')
      .eq('agent_run_id', body.run_id)
      .maybeSingle()

    if (!existingOut) {
      await supabase.from('agent_outputs').insert({
        agent_run_id: body.run_id,
        founder_id: task.founder_id,
        output_type: outputType,
        output,
      })
    }

    if (task.category === 'build' && taskStatus === 'done') {
      const secret = process.env.KARNEX_INTERNAL_WEBHOOK_SECRET
      const base =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.KARNEX_APP_URL ||
        'http://localhost:3000'
      if (secret) {
        const prUrl =
          typeof output.pr_url === 'string'
            ? output.pr_url
            : typeof output.preview_url === 'string'
              ? output.preview_url
              : undefined
        fetch(`${base.replace(/\/$/, '')}/api/automations/trigger`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            founder_id: task.founder_id,
            recipe_id: 'build_and_ship',
            trigger_event: 'builder_task_complete',
            metadata: { task_id: taskId, run_id: body.run_id, pr_url: prUrl },
          }),
        }).catch((err) =>
          console.error('build_and_ship automation fire failed:', err)
        )
      }
    }

    if (task.category === 'outreach' && taskStatus === 'pending_approval') {
      const secret = process.env.KARNEX_INTERNAL_WEBHOOK_SECRET
      const base =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.KARNEX_APP_URL ||
        'http://localhost:3000'
      if (secret) {
        fetch(`${base.replace(/\/$/, '')}/api/automations/trigger`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            founder_id: task.founder_id,
            recipe_id: 'outreach_review',
            trigger_event: 'outreach_campaign_drafted',
            metadata: { task_id: taskId },
          }),
        }).catch((err) =>
          console.error('outreach_review automation fire failed:', err)
        )
      }
    }

    return NextResponse.json({ ok: true, task_status: taskStatus })
  } catch (error) {
    console.error('Task complete webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
