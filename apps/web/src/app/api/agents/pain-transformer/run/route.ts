import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function getAgentServiceBaseUrl(): string {
  const raw =
    process.env.AGENT_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENT_SERVICE_URL ||
    'http://localhost:8000'
  return raw.replace(/\/$/, '')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pain_description, industry_context } = await request.json()
    if (!pain_description || pain_description.length < 30) {
      return NextResponse.json({ error: 'Pain description must be at least 30 characters' }, { status: 400 })
    }

    // 1. Save context to DB (founder_memory)
    const contextData = {
      pain_description,
      industry_context: industry_context || '',
      updated_at: new Date().toISOString()
    }

    const { error: memoryError } = await supabase
      .from('founder_memory')
      .upsert({
        founder_id: user.id,
        namespace: 'onboarding',
        key: 'pain_context',
        value: contextData
      }, { onConflict: 'founder_id,namespace,key' })

    if (memoryError) {
      console.error('Error saving onboarding pain_context to founder_memory:', memoryError)
    }

    // Save the current step to founder_memory
    await supabase
      .from('founder_memory')
      .upsert({
        founder_id: user.id,
        namespace: 'onboarding',
        key: 'step',
        value: { step: 1 }
      }, { onConflict: 'founder_id,namespace,key' })

    // 2. Call internal agent API (the FastAPI service proxy or the backend directly)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      return NextResponse.json({ error: 'Session token not found' }, { status: 401 })
    }

    const agentUrl = `${getAgentServiceBaseUrl()}/v1/agents/pain-transformer`
    console.log(`Triggering pain-transformer agent at: ${agentUrl}`)

    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pain_description,
        industry_context: industry_context || undefined
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pain transformer agent trigger failed:', errorText)
      return NextResponse.json({ error: `Agent execution failed: ${response.statusText}` }, { status: 502 })
    }

    // Wait, the agent ran synchronously and successfully.
    // Query agent_runs to retrieve the newly generated run_id for this user.
    const { data: latestRun, error: queryError } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('founder_id', user.id)
      .eq('agent_id', 'pain-transformer-v1')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (queryError || !latestRun) {
      console.error('Error retrieving agent run ID from database:', queryError)
      return NextResponse.json({ error: 'Failed to retrieve agent execution ID' }, { status: 500 })
    }

    return NextResponse.json({ success: true, run_id: latestRun.id })

  } catch (error) {
    console.error('Error running pain transformer agent:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
