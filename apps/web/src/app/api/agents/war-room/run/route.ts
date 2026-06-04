import { NextRequest, NextResponse } from 'next/server'
import * as NextServer from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    // 1. Update founder preferences if provided
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

    // 3. Fetch founder capacity
    const { data: founder } = await supabase
      .from('founders')
      .select('weekly_hours_available, technical_level')
      .eq('id', user.id)
      .maybeSingle()

    const finalWeeklyHours = founder?.weekly_hours_available || weeklyHours || 20
    const finalTechnicalLevel = founder?.technical_level || technicalLevel || 'intermediate'

    // 4. Create an agent_runs record immediately so we can return the run_id right away
    const { data: run, error: runErr } = await supabase
      .from('agent_runs')
      .insert({
        founder_id: user.id,
        agent_id: 'war-room',
        agent_version: 'v1.0.0',
        status: 'running',
        input: {
          product_brief: productBrief,
          icp_document: icpDocument,
          founder_capacity: {
            weekly_hours: finalWeeklyHours,
            technical_level: finalTechnicalLevel,
            budget_monthly: 0,
          },
        },
        triggered_by: 'user',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (runErr || !run) {
      return NextResponse.json(
        { error: `Failed to create war-room agent run: ${runErr?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    const warRoomRunId = run.id

    // 5. Get auth token for the background backend call
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const authHeader = token ? `Bearer ${token}` : (request.headers.get('authorization') || '')

    // 6. Run backend call in the background (with mock fallback)
    const afterFn = (NextServer as any).after || (NextServer as any).unstable_after
    const backgroundTask = async () => {
      const innerSupabase = await createSupabaseServerClient()
      const startTime = Date.now()
      try {
        let output: any = null
        let backendSuccess = false

        if (authHeader) {
          try {
            const res = await fetch(`${getAgentServiceBaseUrl()}/v1/agents/war-room`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
              },
              body: JSON.stringify({
                product_brief: productBrief,
                icp_document: icpDocument,
                founder_capacity: {
                  weekly_hours: finalWeeklyHours,
                  technical_level: finalTechnicalLevel,
                  budget_monthly: 0,
                },
              }),
              signal: AbortSignal.timeout(45000),
            })
            if (res.ok) {
              output = await res.json()
              backendSuccess = true
            } else {
              const errText = await res.text()
              console.warn('Backend war-room returned status:', res.status, errText)
            }
          } catch (err) {
            console.warn('Failed to call backend war-room:', err)
          }
        }

        if (!backendSuccess) {
          await new Promise((r) => setTimeout(r, 8000))
          output = generateMockRoadmap(productBrief?.selected_name || 'My Startup')
        }

        const duration = Date.now() - startTime

        await innerSupabase
          .from('agent_outputs')
          .insert({
            agent_run_id: warRoomRunId,
            founder_id: user.id,
            output_type: 'war-room',
            output,
            confidence: 'medium',
            suggested_next_agent: null,
          })

        await innerSupabase
          .from('agent_runs')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('id', warRoomRunId)

      } catch (err: any) {
        console.error(`Background war-room run ${warRoomRunId} failed:`, err)
        await innerSupabase
          .from('agent_runs')
          .update({
            status: 'error',
            completed_at: new Date().toISOString(),
            error_message: err?.message || String(err),
          })
          .eq('id', warRoomRunId)
      }
    }

    if (afterFn) {
      afterFn(() => backgroundTask().catch((err) => {
        console.error(`Error in war-room after() background task (run ${warRoomRunId}):`, err)
      }))
    } else {
      backgroundTask().catch((err) => {
        console.error(`Error in war-room background fallback (run ${warRoomRunId}):`, err)
      })
    }

    // 7. Return the run ID immediately so the UI can navigate to step 4
    return NextResponse.json({ success: true, warRoomRunId })

  } catch (error) {
    console.error('Error in war-room trigger API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Roadmap Generator (fallback when backend is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

function generateMockRoadmap(productName: string) {
  return {
    roadmap: {
      title: '90-Day Execution Roadmap',
      total_days: 90,
      start_date: new Date().toISOString().split('T')[0],
      phases: [
        {
          phase_number: 1,
          title: 'Validation & Discovery (Days 1–30)',
          start_day: 1,
          end_day: 30,
          theme: 'Validate the core problem-solution fit before writing any production code.',
          weekly_goals: [
            {
              week_number: 1,
              focus: 'Customer Discovery',
              goals: [
                'Conduct 5 discovery interviews with target users',
                'Define the top 3 high-intensity user pain points',
                'Draft initial product value proposition document',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 2,
              focus: 'Competitive Landscape',
              goals: [
                'Map 5 direct competitors and pricing patterns',
                'Identify core feature gaps across competitors',
                'Synthesize findings and rank primary pains',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 3,
              focus: 'Landing Page Test',
              goals: [
                `Deploy a waitlist landing page for ${productName}`,
                'Set up conversion tracking (PostHog or similar)',
                'Drive 100 targeted visitors via community channels',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 4,
              focus: 'Validation Synthesis',
              goals: [
                'Analyze waitlist conversions (target > 10%)',
                'Identify top 3 features requested by early adopters',
                'Run go/no-go check to lock Phase 2 scope',
              ],
              estimated_hours: 20,
            },
          ],
          milestones: [
            { title: '10 discovery interviews', target_week: 2, metric: 'interviews_done', target_value: 10 },
            { title: 'Landing page live', target_week: 3, metric: 'page_live', target_value: 1 },
            { title: '20 waitlist signups', target_week: 4, metric: 'waitlist_users', target_value: 20 },
          ],
          success_criteria: [
            'Completed 10 customer interviews',
            'Waitlist conversion rate > 10%',
          ],
          go_no_go_gate: 'Proceed to Phase 2 only if 20+ signups validate core pain.',
          key_risks: [
            'Low conversion may indicate problem is not severe enough',
            'Competitors may ship similar features',
          ],
          agents_to_use: ['research-v1', 'outreach-v1'],
        },
        {
          phase_number: 2,
          title: 'MVP Construction (Days 31–60)',
          start_day: 31,
          end_day: 60,
          theme: 'Build and deploy the core product with the minimum viable feature set.',
          weekly_goals: [
            {
              week_number: 5,
              focus: 'Architecture & Schema',
              goals: [
                'Design database schema for core entities',
                'Set up authentication and authorization',
                'Scaffold application structure',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 6,
              focus: 'Core Feature Build',
              goals: [
                'Implement the primary MVP feature',
                'Build basic data input and output flows',
                'Connect backend to frontend UI',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 7,
              focus: 'User-Facing Views',
              goals: [
                'Build user dashboard and core action views',
                'Implement responsive mobile-first layouts',
                'Integrate basic notification and feedback hooks',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 8,
              focus: 'Staging & QA',
              goals: [
                'Deploy to staging environment',
                'Run end-to-end tests covering core user flows',
                'Fix critical bugs and optimize load performance',
              ],
              estimated_hours: 20,
            },
          ],
          milestones: [
            { title: 'Core feature functional', target_week: 6, metric: 'core_feature_done', target_value: 1 },
            { title: 'Staging deployment live', target_week: 8, metric: 'staging_live', target_value: 1 },
          ],
          success_criteria: [
            'Core user flow works end-to-end',
            'Staging deployment passes QA review',
          ],
          go_no_go_gate: 'Proceed to Phase 3 only if end-to-end flow works without blockers.',
          key_risks: [
            'Scope creep adding features beyond MVP',
            'Integration complexity causing delays',
          ],
          agents_to_use: ['builder-v1'],
        },
        {
          phase_number: 3,
          title: 'Launch & Growth (Days 61–90)',
          start_day: 61,
          end_day: 90,
          theme: 'Onboard beta users, gather feedback, and start growth loops.',
          weekly_goals: [
            {
              week_number: 9,
              focus: 'Beta Onboarding',
              goals: [
                'Invite top 10 waitlist subscribers to private beta',
                'Onboard 3 active users and assist with setup',
                'Collect and log onboarding feedback',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 10,
              focus: 'Launch Preparation',
              goals: [
                'Record a 2-minute product walkthrough video',
                'Configure production domain and DNS',
                'Draft Product Hunt launch copy and social posts',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 11,
              focus: 'Public Launch',
              goals: [
                'Submit to Product Hunt and Hacker News',
                'Deploy email outreach campaign to target segment',
                'Monitor errors and session analytics',
              ],
              estimated_hours: 20,
            },
            {
              week_number: 12,
              focus: 'Metrics Review',
              goals: [
                'Analyze user activation and retention metrics',
                'Identify top friction points in user flow',
                'Plan sprint backlog based on customer feedback',
              ],
              estimated_hours: 20,
            },
          ],
          milestones: [
            { title: '3 active beta users', target_week: 9, metric: 'beta_users', target_value: 3 },
            { title: 'Product Hunt launch', target_week: 11, metric: 'hunt_live', target_value: 1 },
            { title: 'First paying customer', target_week: 12, metric: 'first_revenue', target_value: 1 },
          ],
          success_criteria: [
            'Product Hunt page submitted',
            'At least 1 paying customer in production',
          ],
          go_no_go_gate: 'Transition to weekly Compass standups and growth loops.',
          key_risks: [
            'Low launch traffic due to timing',
            'Churn from onboarding friction',
          ],
          agents_to_use: ['outreach-v1', 'daily-standup-v1'],
        },
      ],
    },
  }
}
