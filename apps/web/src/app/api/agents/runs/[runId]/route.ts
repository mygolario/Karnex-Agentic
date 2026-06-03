import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query agent run status
    const { data: run, error: runErr } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runErr || !run) {
      return NextResponse.json({ error: `Agent run not found: ${runErr?.message || ''}` }, { status: 404 })
    }

    let output = null
    if (run.status === 'success') {
      const { data: outputRow, error: outputErr } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('agent_run_id', runId)
        .maybeSingle()

      if (!outputErr && outputRow) {
        output = outputRow.output
      }
    }

    return NextResponse.json({ run, output })

  } catch (error) {
    console.error('Error fetching agent run status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
