import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { calculateCompletenessScore, FounderProfile } from '@/types/profile'

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
      roadmap,
      profileData
    } = body

    const finalStartupName = startupName || 'My Venture'
    const finalDescription = description || 'Building the future of digital products.'
    const finalTagline = tagline || 'Instant MVP development.'
    const finalIndustry = industry || 'SaaS'
    const finalTargetAudience = targetAudience || 'General Audience'
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
      await supabase
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

    // Ensure an active selected idea exists in the database
    const { data: existingIdea } = await supabase
      .from('ideas')
      .select('id')
      .eq('founder_id', user.id)
      .eq('status', 'selected')
      .limit(1)
      .maybeSingle()

    if (existingIdea) {
      await supabase
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
    } else {
      await supabase
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
          generated_by: 'onboarding-v2'
        })
    }

    // 2. Update structural founder record
    await supabase
      .from('founders')
      .update({
        display_name: displayName || user.user_metadata?.full_name || 'Founder',
        technical_level: technicalLevel || 'intermediate',
        weekly_hours_available: weeklyHoursAvailable || 20,
        communication_tone: communicationTone || 'direct',
        preferred_agent_speed: preferredAgentSpeed || 'thorough',
        primary_goal: primaryGoal || finalTagline || 'Build startup',
        current_startup_id: startupId,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 4
      })
      .eq('id', user.id)

    // 3. Save roadmap if provided
    let finalRoadmap = roadmap
    if (!finalRoadmap) {
      // Fallback: Generate a high quality 90-day execution plan dynamically
      const targetHours = weeklyHoursAvailable || 20
      finalRoadmap = {
        title: '90-Day Personalized Roadmap',
        phases: [
          {
            phase_number: 1,
            title: 'Concept Refinement & Validation',
            theme: 'Validating user pain points and crystallizing core features.',
            weekly_goals: [
              {
                week_number: 1,
                focus: 'Customer Research',
                goals: [
                  'Conduct 5 discovery interviews with target users',
                  'Define the top 3 high-intensity user pain points',
                  'Draft initial product value proposition document'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 2,
                focus: 'Wedge Definition',
                goals: [
                  'Identify the core features needed for the MVP',
                  'Conduct competitive analysis mapping 3 key competitors',
                  'Select primary launch channel strategy'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 3,
                focus: 'Landing Page Test',
                goals: [
                  'Deploy a high-converting landing page with a waitlist',
                  'Set up basic conversion metrics monitoring (e.g. PostHog)',
                  'Drive 100 targeted visitors to the landing page'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 4,
                focus: 'Validation Review',
                goals: [
                  'Analyze waitlist conversion rate and signups',
                  'Formulate 3 product-market validation hypotheses',
                  'Conduct War Room planning loop to review feedback'
                ],
                estimated_hours: targetHours
              }
            ]
          },
          {
            phase_number: 2,
            title: 'MVP Development Sequence',
            theme: 'Building the core functional application layers.',
            weekly_goals: [
              {
                week_number: 5,
                focus: 'Database & Core Schema',
                goals: [
                  'Design normalized database tables and indexes',
                  'Set up Supabase authentication and access controls',
                  'Write basic server functions to process data'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 6,
                focus: 'Core Application Logic',
                goals: [
                  'Develop the primary dashboards and user interfaces',
                  'Integrate external AI model endpoints (Gemini/OpenRouter)',
                  'Connect core logical handlers to state providers'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 7,
                focus: 'Integrations & API Hookup',
                goals: [
                  'Configure third-party service provider integrations',
                  'Implement stripe/auth payment transaction routes',
                  'Conduct internal end-to-end integration dry runs'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 8,
                focus: 'Internal QA & Debugging',
                goals: [
                  'Run functional validation tests across core app flows',
                  'Optimize API latency and database query speeds',
                  'Fix top blocker bugs and improve UI micro-interactions'
                ],
                estimated_hours: targetHours
              }
            ]
          },
          {
            phase_number: 3,
            title: 'Launch & Growth Loop',
            theme: 'Going live to waitlist and driving initial transactions.',
            weekly_goals: [
              {
                week_number: 9,
                focus: 'Beta User Onboarding',
                goals: [
                  'Invite top 10 waitlist members into private beta',
                  'Create feedback channel for reporting bugs and suggestions',
                  'Deploy hotfixes based on beta user feedback'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 10,
                focus: 'Public Launch Prep',
                goals: [
                  'Write launch copy for Product Hunt, Hacker HN, & X',
                  'Create demo video walk-through demonstrating features',
                  'Configure production deployment domains and certificates'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 11,
                focus: 'Launch Campaign',
                goals: [
                  'Publish launch announcements across all channels',
                  'Run outbound outreach campaigns targeting first users',
                  'Coordinate community support for product release'
                ],
                estimated_hours: targetHours
              },
              {
                week_number: 12,
                focus: 'Analytics & Scaling',
                goals: [
                  'Review post-launch traction metrics and funnel drop-offs',
                  'Identify high-impact scaling bottlenecks',
                  'Outline Sprint plan for Phase 4 validation'
                ],
                estimated_hours: targetHours
              }
            ]
          }
        ]
      }
    }

    if (finalRoadmap && Array.isArray(finalRoadmap.phases)) {
      // Set previous roadmaps to inactive
      await supabase
        .from('roadmaps')
        .update({ is_active: false })
        .eq('founder_id', user.id)

      const { data: newRoadmap } = await supabase
        .from('roadmaps')
        .insert({
          startup_id: startupId,
          founder_id: user.id,
          title: finalRoadmap.title || '90-Day Roadmap',
          phases: finalRoadmap.phases,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (newRoadmap) {
        // Provision Sprints and Tasks from roadmap phases
        const baseDate = new Date()
        for (const phase of (finalRoadmap.phases as Phase[])) {
          if (Array.isArray(phase.weekly_goals)) {
            for (const weeklyGoal of phase.weekly_goals) {
              const weekNum = weeklyGoal.week_number ?? 1
              const startOffset = (weekNum - 1) * 7 * 24 * 60 * 60 * 1000
              const sprintStart = new Date(baseDate.getTime() + startOffset)
              const sprintEnd = new Date(sprintStart.getTime() + 6 * 24 * 60 * 60 * 1000)

              const { data: spInserted } = await supabase
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
                    category: 'build'
                  }
                })

                if (tasksPayload.length > 0) {
                  await supabase
                    .from('tasks')
                    .insert(tasksPayload)
                }
              }
            }
          }
        }
      }
    }

    // 4. Consolidate profileData into Founder Profile Object and save to founder_memory
    const p = profileData || {}
    const cycle = p.execution?.cyclePosition || 'pre-validation'
    const bottleneck = p.execution?.bottleneck || 'unclear-idea'
    const founderProfile: FounderProfile = {
      identity: {
        fullName: displayName || user.user_metadata?.full_name || 'Founder',
        displayName: displayName || 'Founder',
        timezone: p.identity?.timezone || 'America/New_York',
        workingHours: p.identity?.workingHours || '9am - 5pm',
        feedbackStyle: p.identity?.feedbackStyle || 'direct',
        technicalLevel: technicalLevel || 'intermediate',
        startupExperience: p.identity?.startupExperience || 'first-time'
      },
      venture: {
        idea: finalDescription,
        stage: finalStage as any,
        domain: finalIndustry,
        painOrigin: p.venture?.painOrigin || finalDescription,
        productName: finalStartupName,
        hasName: !!finalStartupName
      },
      market: {
        targetCustomer: {
          jobTitle: p.market?.targetCustomer?.jobTitle || finalTargetAudience,
          companySize: p.market?.targetCustomer?.companySize || '1-10',
          type: p.market?.targetCustomer?.type || 'B2B'
        },
        competitors: p.market?.competitors || [],
        positioningAdvantage: p.market?.positioningAdvantage || finalTagline,
        hasCustomerConversations: !!p.market?.hasCustomerConversations
      },
      execution: {
        cyclePosition: (cycle || 'pre-validation') as any,
        bottleneck: (bottleneck || 'unclear-idea') as any,
        tools: p.execution?.tools || [],
        weeklyAvailability: (weeklyHoursAvailable ? `${weeklyHoursAvailable} hrs` : '15+ hrs') as any,
        fundingPath: p.execution?.fundingPath || 'bootstrapping'
      },
      voice: {
        writingSamples: p.voice?.writingSamples || [],
        contentChannels: p.voice?.contentChannels || [],
        communicationStyle: p.voice?.communicationStyle || 'Professional and direct.'
      },
      momentum: {
        score: 50,
        lastUpdated: new Date().toISOString()
      },
      completenessScore: 100
    }

    // Calculate score
    founderProfile.completenessScore = calculateCompletenessScore(founderProfile)

    // Save profile to founder_memory namespace profile
    await supabase
      .from('founder_memory')
      .upsert({
        founder_id: user.id,
        namespace: 'profile',
        key: 'founder_profile',
        value: founderProfile
      }, { onConflict: 'founder_id,namespace,key' })

    // 5. Tool Integration Configuration: Auto-insert active integrations checklists
    const toolsToCheck = founderProfile.execution.tools
    if (toolsToCheck.length > 0) {
      const integrationsPayload = toolsToCheck.map((tool) => ({
        founder_id: user.id,
        provider: tool as any,
        status: 'active',
        connected_at: new Date().toISOString(),
        metadata: { pre_configured_during_onboarding: true }
      }))
      await supabase
        .from('integrations')
        .upsert(integrationsPayload, { onConflict: 'founder_id,provider' })
    }

    // 6. Preload voice model to memory namespace outreach key voice_profile
    if (founderProfile.voice.writingSamples && founderProfile.voice.writingSamples.length > 0) {
      await supabase
        .from('founder_memory')
        .upsert({
          founder_id: user.id,
          namespace: 'outreach',
          key: 'voice_profile',
          value: {
            samples: founderProfile.voice.writingSamples,
            style: founderProfile.voice.communicationStyle,
            calibrated_at: new Date().toISOString()
          }
        }, { onConflict: 'founder_id,namespace,key' })
    }

    // Clean up temporary wizard step memory
    await supabase
      .from('founder_memory')
      .delete()
      .eq('founder_id', user.id)
      .eq('namespace', 'onboarding')
      .eq('key', 'onboarding_progress_state')

    return NextResponse.json({ success: true, startupId })

  } catch (error) {
    console.error('Error completing onboarding API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
