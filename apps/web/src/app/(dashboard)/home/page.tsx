import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import JourneyHeader from '@/components/home/JourneyHeader'
import MorningStandup from '@/components/home/MorningStandup'
import TodaysTasks from '@/components/home/TodaysTasks'
import MomentumStrip from '@/components/home/MomentumStrip'
import CoachingInsight from '@/components/home/CoachingInsight'
import AgentRoster from '@/components/home/AgentRoster'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Home — Karnex',
  description: 'Your daily founder HQ. Standup, tasks, and momentum — all in one place.',
}

/** Check if a timestamp is from today */
function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

/** Determine current phase (1/2/3) from elapsed days */
function getPhaseFromDays(elapsed: number): 1 | 2 | 3 {
  if (elapsed > 60) return 3
  if (elapsed > 30) return 2
  return 1
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── 1. Founder profile ────────────────────────────────────────────
  const { data: founder } = await supabase
    .from('founders')
    .select(
      'id, full_name, display_name, momentum_score, streak_days, last_standup_at'
    )
    .eq('id', user.id)
    .maybeSingle()

  if (!founder) {
    redirect('/onboarding')
  }

  // ── 2. Subscription ───────────────────────────────────────────────
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, tasks_used_this_cycle, tasks_limit')
    .eq('founder_id', user.id)
    .maybeSingle()

  const sub = subscription || { plan: 'free', tasks_used_this_cycle: 4, tasks_limit: 20 }

  // ── 3. Active roadmap + phase calculation ─────────────────────────
  const { data: activeRoadmap } = await supabase
    .from('roadmaps')
    .select('id, phases, start_date, title, current_phase')
    .eq('founder_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let dayNumber = 1
  let progressPercent = 0
  let currentPhase: 1 | 2 | 3 = 1
  let roadmapId: string | null = null

  if (activeRoadmap) {
    roadmapId = activeRoadmap.id
    const startDate = new Date(activeRoadmap.start_date)
    const today = new Date()
    const elapsed = Math.max(
      0,
      Math.min(90, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    )
    dayNumber = elapsed + 1
    progressPercent = Math.round((elapsed / 90) * 100)
    currentPhase = getPhaseFromDays(elapsed)
  }

  // ── 4. Active sprint + tasks ──────────────────────────────────────
  let tasks: Array<{
    id: string
    title: string
    description: string | null
    priority: number
    category: 'build' | 'research' | 'outreach' | 'content' | 'design' | 'finance' | 'legal' | 'other'
    status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'deferred' | 'pending_approval'
    agent_config: Record<string, unknown> | null
    agent_output: Record<string, unknown> | null
    execute_label: string | null
    auto_executable: boolean
    sprint_id: string
    agent_run_id: string | null
  }> = []

  if (roadmapId) {
    const { data: activeSprint } = await supabase
      .from('sprints')
      .select('id')
      .eq('roadmap_id', roadmapId)
      .eq('status', 'active')
      .maybeSingle()

    if (activeSprint?.id) {
      const { data: taskList } = await supabase
        .from('tasks')
        .select('*')
        .eq('sprint_id', activeSprint.id)
        .order('priority', { ascending: true })

      if (taskList && taskList.length > 0) {
        tasks = taskList.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          category: t.category,
          status: t.status,
          agent_config: t.agent_config as Record<string, unknown> | null,
          agent_output: t.agent_output as Record<string, unknown> | null,
          execute_label: t.execute_label,
          auto_executable: t.auto_executable,
          sprint_id: t.sprint_id,
          agent_run_id: t.agent_run_id,
        }))
      }
    }
  }

  // Fallback mock tasks for demo fidelity
  if (tasks.length === 0) {
    tasks = [
      {
        id: 'mock-task-1',
        title: 'Build the invoicing module',
        description:
          'Create invoice schemas, design React totals calculators, and generate PDF bills.',
        priority: 1,
        category: 'build',
        status: 'todo',
        execute_label: 'Let Karnex build invoicing',
        auto_executable: true,
        agent_config: {
          agent_id: 'builder-v1',
          context_summary:
            'Scaffold the invoicing module: Supabase table, API routes, React totals calculator, and PDF generation.',
          estimated_duration_seconds: 90,
          pre_populated_input: {
            task_type: 'scaffold_feature',
            specification: 'Invoicing UI and totals calculator',
          },
        },
        agent_output: null,
        sprint_id: 'mock-sprint-1',
        agent_run_id: null,
      },
      {
        id: 'mock-task-2',
        title: 'Email 10 freelance designers',
        description:
          'Batch personalized discovery outreach templates to target branding freelancers.',
        priority: 2,
        category: 'outreach',
        status: 'todo',
        execute_label: 'Let Karnex pitch outreach',
        auto_executable: true,
        agent_config: {
          agent_id: 'outreach-v1',
          context_summary:
            'Write a 3-stage customer discovery sequence and prepare a list of 10 Portland brand designers.',
          estimated_duration_seconds: 45,
          pre_populated_input: {
            campaign_goal: 'Discover invoicing pain points',
          },
        },
        agent_output: null,
        sprint_id: 'mock-sprint-1',
        agent_run_id: null,
      },
      {
        id: 'mock-task-3',
        title: 'Map 5 invoicing competitors',
        description:
          'Map FreshBooks, HoneyBook and other creative billing workarounds to identify moats.',
        priority: 3,
        category: 'research',
        status: 'todo',
        execute_label: 'Let Karnex search competitors',
        auto_executable: true,
        agent_config: {
          agent_id: 'research-v1',
          context_summary:
            'Research and map the top 5 invoicing/billing competitors in the creative freelancer space.',
          estimated_duration_seconds: 60,
          pre_populated_input: {
            research_question: 'Map creative invoicing software competitors',
          },
        },
        agent_output: null,
        sprint_id: 'mock-sprint-1',
        agent_run_id: null,
      },
    ]
  }

  // ── 5. Standup check ──────────────────────────────────────────────
  const hasStandupToday = isToday(founder.last_standup_at)

  // ── 6. Recent outreach replies (last 24h) ─────────────────────────
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentReplies } = await supabase
    .from('outreach_contacts')
    .select('first_name, campaign_id')
    .eq('founder_id', user.id)
    .eq('status', 'replied')
    .gte('replied_at', oneDayAgo)
    .limit(3)

  const formattedReplies = (recentReplies || []).map((r) => ({
    contact_name: r.first_name || 'Someone',
    campaign_id: r.campaign_id,
  }))

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 dash-reveal space-y-6">
      
      {/* Immersive header timeline at the top */}
      <JourneyHeader
        founder={{
          id: founder.id,
          full_name: founder.full_name,
          display_name: founder.display_name,
        }}
        currentPhase={currentPhase}
        progressPercent={progressPercent}
        dayNumber={dayNumber}
      />

      {/* Two Column Mission Control Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Sprints, Morning Standup, Dials */}
        <div className="lg:col-span-2 space-y-6">
          <MorningStandup
            founderId={founder.id}
            founderName={founder.display_name || founder.full_name || 'Founder'}
            hasStandupToday={hasStandupToday}
          />

          <TodaysTasks tasks={tasks} founderId={founder.id} />

          <MomentumStrip
            founderId={founder.id}
            initialMomentum={founder.momentum_score ?? 50}
            initialStreak={founder.streak_days ?? 0}
            initialCreditsUsed={sub.tasks_used_this_cycle}
            initialCreditsLimit={sub.tasks_limit}
          />
        </div>

        {/* Right Column: Visual Agent Roster and Coaching Wisdom */}
        <div className="space-y-6">
          <AgentRoster />

          <CoachingInsight
            phase={currentPhase}
            lastStandupSummary={
              hasStandupToday
                ? "Great progress on your standups. Keep the momentum — you're on track for Phase completion."
                : null
            }
            recentReplies={formattedReplies}
          />
        </div>

      </div>
    </div>
  )
}
