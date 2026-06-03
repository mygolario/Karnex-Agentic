import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      ideaId, 
      productBrief, 
      icpDocument,
      displayName,
      technicalLevel,
      weeklyHours,
      communicationTone,
      preferredAgentSpeed
    } = body

    if (!ideaId || !productBrief || !icpDocument) {
      return NextResponse.json(
        { error: 'ideaId, productBrief, and icpDocument are required' },
        { status: 400 }
      )
    }

    // 1. Update founder preferences in founders table if provided
    if (
      displayName !== undefined ||
      technicalLevel !== undefined ||
      weeklyHours !== undefined ||
      communicationTone !== undefined ||
      preferredAgentSpeed !== undefined
    ) {
      const { error: founderUpdateErr } = await supabase
        .from('founders')
        .update({
          ...(displayName !== undefined && { display_name: displayName }),
          ...(technicalLevel !== undefined && { technical_level: technicalLevel }),
          ...(weeklyHours !== undefined && { weekly_hours_available: weeklyHours }),
          ...(communicationTone !== undefined && { communication_tone: communicationTone }),
          ...(preferredAgentSpeed !== undefined && { preferred_agent_speed: preferredAgentSpeed }),
        })
        .eq('id', user.id)

      if (founderUpdateErr) {
        console.error('Error updating founder preferences:', founderUpdateErr)
      }
    }

    // 2. Save brief data to ideas table
    const { error: ideaUpdateErr } = await supabase
      .from('ideas')
      .update({
        product_brief: productBrief,
        icp_document: icpDocument,
        status: 'selected',
        selected_at: new Date().toISOString()
      })
      .eq('id', ideaId)

    if (ideaUpdateErr) {
      console.error('Error updating idea:', ideaUpdateErr)
      return NextResponse.json(
        { error: `Failed to update idea: ${ideaUpdateErr.message}` },
        { status: 500 }
      )
    }

    // 3. Fetch founder capacity details
    const { data: founder, error: founderErr } = await supabase
      .from('founders')
      .select('weekly_hours_available, technical_level')
      .eq('id', user.id)
      .maybeSingle()

    if (founderErr) {
      console.error('Error fetching founder details:', founderErr)
    }

    const finalWeeklyHours = founder?.weekly_hours_available || weeklyHours || 20
    const finalTechnicalLevel = founder?.technical_level || technicalLevel || 'intermediate'
    const budgetMonthly = 0 // Default budget to preserve db structure constraints

    // 3. Fire the war-room run by making a POST request to the Python service
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000'
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const authHeader = token ? `Bearer ${token}` : (request.headers.get('authorization') || '')

    console.log(`Firing war-room agent run for founder ${user.id} at ${agentServiceUrl}/v1/agents/war-room`)

    const runRes = await fetch(`${agentServiceUrl}/v1/agents/war-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        product_brief: productBrief,
        icp_document: icpDocument,
        founder_capacity: {
          weekly_hours: finalWeeklyHours,
          technical_level: finalTechnicalLevel,
          budget_monthly: budgetMonthly
        }
      })
    })

    if (!runRes.ok) {
      const errText = await runRes.text()
      console.error('Failed to trigger war-room agent:', errText)
      return NextResponse.json(
        { error: `Failed to trigger war-room agent: ${errText}` },
        { status: runRes.status }
      )
    }

    // 4. Query the latest agent_runs record for war-room-v1 to get the run ID
    const { data: latestRun, error: runErr } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('founder_id', user.id)
      .eq('agent_id', 'war-room-v1')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (runErr || !latestRun) {
      console.error('Failed to retrieve war-room run ID:', runErr)
      return NextResponse.json(
        { error: 'War Room agent triggered, but failed to retrieve execution run ID.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, warRoomRunId: latestRun.id })

  } catch (error) {
    console.error('Error in war-room trigger API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
