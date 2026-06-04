import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface Phase {
  phase_number: number
  title: string
  theme: string
  weekly_goals: {
    week_number: number
    focus: string
    goals: string[]
    estimated_hours: number
  }[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      displayName,
      technicalLevel,
      weeklyHoursAvailable,
      communicationTone,
      preferredAgentSpeed,
      primaryGoal,
      startupName,
      tagline,
      description,
      industry,
      targetAudience,
      stage,
      roadmap
    } = body

    if (!startupName || !description) {
      // Attempt to recover from DB: check founder_memory for selected_hypothesis and pain_context
      const { data: hypMem } = await supabase
        .from('founder_memory')
        .select('value')
        .eq('founder_id', user.id)
        .eq('namespace', 'onboarding')
        .eq('key', 'selected_hypothesis')
        .maybeSingle()

      const { data: painMem } = await supabase
        .from('founder_memory')
        .select('value')
        .eq('founder_id', user.id)
        .eq('namespace', 'onboarding')
        .eq('key', 'pain_context')
        .maybeSingle()

      const hypVal = hypMem?.value as any
      const painVal = painMem?.value as any

      const recoveredName = startupName || hypVal?.startupName || hypVal?.hypothesis?.title
      const recoveredDesc = description || painVal?.pain_description || hypVal?.hypothesis?.problem_statement

      if (!recoveredName || !recoveredDesc) {
        return NextResponse.json({ error: 'Startup Name and Description are required' }, { status: 400 })
      }

      // Use recovered values for the rest of the request
      body.startupName = recoveredName
      body.description = recoveredDesc
      if (!tagline) body.tagline = hypVal?.tagline || hypVal?.hypothesis?.proposed_solution || ''
      if (!industry) body.industry = hypVal?.industry || ''
      if (!targetAudience) body.targetAudience = hypVal?.targetAudience || hypVal?.hypothesis?.target_audience || ''
    }

    // Re-read potentially recovered values
    const finalStartupName = body.startupName
    const finalDescription = body.description
    const finalTagline = body.tagline || tagline || ''
    const finalIndustry = body.industry || industry || ''
    const finalTargetAudience = body.targetAudience || targetAudience || ''
    const finalStage = stage || 'ideation'


    // 1. Ensure startup row exists/gets updated
    let startupId: string
    const { data: existingStartup } = await supabase
      .from('startups')
      .select('id')
      .eq('founder_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (existingStartup) {
      startupId = existingStartup.id
      const { error: startupUpdateErr } = await supabase
        .from('startups')
        .update({
          name: finalStartupName,
          tagline: finalTagline,
          description: finalDescription,
          industry: finalIndustry,
          target_audience: finalTargetAudience,
          stage: finalStage,
        })
        .eq('id', startupId)

      if (startupUpdateErr) {
        return NextResponse.json({ error: `Failed to update startup: ${startupUpdateErr.message}` }, { status: 500 })
      }
    } else {
      const { data: newStartup, error: startupInsertErr } = await supabase
        .from('startups')
        .insert({
          founder_id: user.id,
          name: finalStartupName,
          tagline: finalTagline,
          description: finalDescription,
          industry: finalIndustry,
          target_audience: finalTargetAudience,
          stage: finalStage,
          is_active: true
        })
        .select()
        .single()

      if (startupInsertErr || !newStartup) {
        return NextResponse.json({ error: `Failed to create startup: ${startupInsertErr?.message || 'Unknown'}` }, { status: 500 })
      }
      startupId = newStartup.id
    }

    // Ensure an active selected idea exists in the database for the War Room
    const { data: existingIdea } = await supabase
      .from('ideas')
      .select('id')
      .eq('founder_id', user.id)
      .eq('status', 'selected')
      .limit(1)
      .maybeSingle()

    if (existingIdea) {
      const { error: ideaUpdateErr } = await supabase
        .from('ideas')
        .update({
          title: finalStartupName,
          pain_description: finalDescription,
          proposed_solution: finalTagline,
          product_brief: {
            title: finalStartupName,
            problem_statement: finalDescription,
            proposed_solution: finalTagline,
            target_audience: finalTargetAudience
          },
          icp_document: {
            target_audience: finalTargetAudience,
            key_risks: [],
            next_steps: []
          },
          selected_at: new Date().toISOString()
        })
        .eq('id', existingIdea.id)

      if (ideaUpdateErr) {
        return NextResponse.json({ error: `Failed to update selected idea: ${ideaUpdateErr.message}` }, { status: 500 })
      }
    } else {
      const { error: ideaInsertErr } = await supabase
        .from('ideas')
        .insert({
          startup_id: startupId,
          founder_id: user.id,
          title: finalStartupName,
          pain_description: finalDescription,
          proposed_solution: finalTagline,
          status: 'selected',
          product_brief: {
            title: finalStartupName,
            problem_statement: finalDescription,
            proposed_solution: finalTagline,
            target_audience: finalTargetAudience
          },
          icp_document: {
            target_audience: finalTargetAudience,
            key_risks: [],
            next_steps: []
          },
          selected_at: new Date().toISOString(),
          generated_by: 'onboarding-v1'
        })

      if (ideaInsertErr) {
        return NextResponse.json({ error: `Failed to create selected idea: ${ideaInsertErr.message}` }, { status: 500 })
      }
    }

    // 2. Update the founder record
    const { error: founderUpdateErr } = await supabase
      .from('founders')
      .update({
        display_name: displayName || user.user_metadata?.full_name || 'Founder',
        technical_level: technicalLevel || 'intermediate',
        weekly_hours_available: weeklyHoursAvailable || 20,
        communication_tone: communicationTone || 'direct',
        preferred_agent_speed: preferredAgentSpeed || 'thorough',
        primary_goal: primaryGoal || finalTagline || 'Build startup',
        current_startup_id: startupId,
        onboarding_completed: true
      })
      .eq('id', user.id)

    if (founderUpdateErr) {
      return NextResponse.json({ error: `Failed to update founder: ${founderUpdateErr.message}` }, { status: 500 })
    }

    // 3. Save roadmap if provided
    if (roadmap && Array.isArray(roadmap.phases)) {
      // Set previous roadmaps to inactive
      await supabase
        .from('roadmaps')
        .update({ is_active: false })
        .eq('founder_id', user.id)

      const { data: newRoadmap, error: roadmapInsertErr } = await supabase
        .from('roadmaps')
        .insert({
          startup_id: startupId,
          founder_id: user.id,
          title: roadmap.title || '90-Day Roadmap',
          phases: roadmap.phases,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (roadmapInsertErr || !newRoadmap) {
        console.error('Roadmap insertion error:', roadmapInsertErr)
      } else {
        // 4. Provision Sprints and Tasks from roadmap phases
        const baseDate = new Date()
        for (const phase of (roadmap.phases as Phase[])) {
          if (Array.isArray(phase.weekly_goals)) {
            for (const weeklyGoal of phase.weekly_goals) {
              const weekNum = weeklyGoal.week_number ?? 1
              const startOffset = (weekNum - 1) * 7 * 24 * 60 * 60 * 1000
              const sprintStart = new Date(baseDate.getTime() + startOffset)
              const sprintEnd = new Date(sprintStart.getTime() + 6 * 24 * 60 * 60 * 1000)

              const { data: spInserted, error: spErr } = await supabase
                .from('sprints')
                .insert({
                  roadmap_id: newRoadmap.id,
                  founder_id: user.id,
                  sprint_number: weekNum,
                  title: `Sprint ${weekNum} — ${weeklyGoal.focus || 'Development'}`,
                  week_start: sprintStart.toISOString().split('T')[0],
                  week_end: sprintEnd.toISOString().split('T')[0],
                  goals: weeklyGoal.goals || [],
                  focus_area: weeklyGoal.focus || 'Build',
                  capacity_hours: weeklyGoal.estimated_hours || weeklyHoursAvailable || 20,
                  status: weekNum === 1 ? 'active' : 'planned'
                })
                .select()
                .single()

              if (spErr) {
                console.error(`Error inserting sprint week ${weekNum}:`, spErr)
                continue
              }

              // Insert Tasks for each goal item in this week
              if (spInserted && Array.isArray(weeklyGoal.goals) && weeklyGoal.goals.length > 0) {
                const estHours = weeklyGoal.estimated_hours || weeklyHoursAvailable || 20
                const tasksPayload = weeklyGoal.goals.map((goalText: string) => {
                  const estimatedHours = Math.round(estHours / weeklyGoal.goals.length)
                  return {
                    sprint_id: spInserted.id,
                    founder_id: user.id,
                    title: goalText,
                    description: `Onboarding goal target for Week ${weekNum}`,
                    priority: 3,
                    estimated_hours: estimatedHours > 0 ? estimatedHours : 2,
                    status: 'todo',
                    category: 'other'
                  }
                })

                if (tasksPayload.length > 0) {
                  const { error: tErr } = await supabase
                    .from('tasks')
                    .insert(tasksPayload)
                  if (tErr) {
                    console.error(`Error inserting tasks for sprint week ${weekNum}:`, tErr)
                  }
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, startupId })

  } catch (error) {
    console.error('Error completing onboarding API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
