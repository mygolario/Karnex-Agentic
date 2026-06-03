import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getAgentServiceBaseUrl,
  resolveAgentEndpoint,
} from '@/lib/agents/execute-map'
import type { TaskAgentConfig } from '@/types/database'

export const dynamic = 'force-dynamic'

function parseAgentConfig(raw: unknown): TaskAgentConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  if (typeof c.agent_id !== 'string') return null
  if (typeof c.context_summary !== 'string') return null
  const step_labels = Array.isArray(c.step_labels)
    ? (c.step_labels as unknown[]).filter((x): x is string => typeof x === 'string')
    : undefined
  return {
    agent_id: c.agent_id,
    pre_populated_input: (c.pre_populated_input as Record<string, unknown>) ?? {},
    context_summary: c.context_summary,
    estimated_duration_seconds:
      typeof c.estimated_duration_seconds === 'number'
        ? c.estimated_duration_seconds
        : 45,
    step_labels,
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select(
        'id, founder_id, category, auto_executable, agent_config, status, agent_run_id'
      )
      .eq('id', taskId)
      .eq('founder_id', user.id)
      .single()

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!task.auto_executable) {
      return NextResponse.json(
        { error: 'Task is not configured for one-click execution' },
        { status: 400 }
      )
    }

    const agentConfig = parseAgentConfig(task.agent_config)
    if (!agentConfig) {
      return NextResponse.json(
        { error: 'Incomplete agent_config on task' },
        { status: 400 }
      )
    }

    const endpoint = resolveAgentEndpoint(agentConfig.agent_id)
    if (!endpoint) {
      return NextResponse.json(
        { error: `Unsupported agent: ${agentConfig.agent_id}` },
        { status: 400 }
      )
    }

    const { error: creditErr } = await supabase.rpc('deduct_agent_credit', {
      p_founder_id: user.id,
    })

    if (creditErr) {
      const msg = creditErr.message || 'Credit deduction failed'
      const isLimit =
        msg.includes('No tasks remaining') ||
        msg.includes('No active subscription')
      return NextResponse.json(
        { error: msg },
        { status: isLimit ? 402 : 500 }
      )
    }

    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token
    if (!accessToken) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const agentBody = {
      ...agentConfig.pre_populated_input,
      task_id: taskId,
    }

    const agentRes = await fetch(
      `${getAgentServiceBaseUrl()}/v1/agents/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(agentBody),
      }
    )

    if (!agentRes.ok) {
      let detail = agentRes.statusText
      try {
        const errBody = await agentRes.json()
        detail =
          typeof errBody.detail === 'string'
            ? errBody.detail
            : JSON.stringify(errBody.detail ?? errBody)
      } catch {
        // ignore
      }
      return NextResponse.json(
        { error: detail || 'Agent service failed' },
        { status: agentRes.status }
      )
    }

    const agentResult = (await agentRes.json()) as {
      run_id?: string
      status?: string
    }
    const runId = agentResult.run_id
    if (!runId) {
      return NextResponse.json(
        { error: 'Agent service did not return run_id' },
        { status: 502 }
      )
    }

    const now = new Date().toISOString()
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        agent_run_id: runId,
        execution_started_at: now,
        agent_output: {},
        completed_at: null,
        execution_completed_at: null,
      })
      .eq('id', taskId)

    if (updateErr) {
      return NextResponse.json(
        { error: `Failed to update task: ${updateErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        run_id: runId,
        estimated_seconds: agentConfig.estimated_duration_seconds,
        status: agentResult.status ?? 'queued',
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('Task execute error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
