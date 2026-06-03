import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardHQ from '@/components/dashboard/DashboardHQ'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Fetch founder profile
  const { data: founder } = await supabase
    .from('founders')
    .select('id, full_name, display_name, momentum_score, streak_days, last_standup_at, onboarding_step')
    .eq('id', user.id)
    .maybeSingle()

  if (!founder) {
    redirect('/onboarding')
  }

  // 2. Fetch subscription details
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, tasks_used_this_cycle, tasks_limit')
    .eq('founder_id', user.id)
    .maybeSingle()

  // 3. Fetch active roadmap progress
  const { data: activeRoadmap } = await supabase
    .from('roadmaps')
    .select('id, phases, start_date, title')
    .eq('founder_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let daysRemaining = 90
  let percentComplete = 0
  let phaseTitle = 'Concept Validation'
  let roadmapId = null

  if (activeRoadmap) {
    roadmapId = activeRoadmap.id
    const startDate = new Date(activeRoadmap.start_date)
    const today = new Date()
    const diffTime = today.getTime() - startDate.getTime()
    const elapsedDays = Math.max(0, Math.min(90, Math.floor(diffTime / (1000 * 60 * 60 * 24))))
    
    daysRemaining = Math.max(0, 90 - elapsedDays)
    percentComplete = Math.round((elapsedDays / 90) * 100)

    if (Array.isArray(activeRoadmap.phases) && activeRoadmap.phases.length > 0) {
      let phaseIdx = 0
      if (elapsedDays > 60) phaseIdx = 2
      else if (elapsedDays > 30) phaseIdx = 1
      
      const phase = activeRoadmap.phases[phaseIdx]
      if (phase) {
        phaseTitle = `Phase ${phase.phase_number ?? (phaseIdx + 1)}: ${phase.title || ''}`
      }
    }
  }

  // 4. Fetch sprint tasks (find active sprint first)
  let tasks: any[] = []
  if (roadmapId) {
    const { data: activeSprint } = await supabase
      .from('sprints')
      .select('id')
      .eq('roadmap_id', roadmapId)
      .eq('status', 'active')
      .maybeSingle()

    const sprintId = activeSprint?.id
    if (sprintId) {
      const { data: taskList } = await supabase
        .from('tasks')
        .select('*')
        .eq('sprint_id', sprintId)
        .order('priority', { ascending: true })

      if (taskList && taskList.length > 0) {
        tasks = taskList
      }
    }
  }

  // Fallback / mock tasks if database does not contain sprint tasks yet (ensures high-fidelity demo)
  if (tasks.length === 0) {
    tasks = [
      {
        id: 'mock-task-1',
        title: 'Build the invoicing module',
        description: 'Create invoice schemas, design React totals calculators, and generate PDF bills.',
        priority: 1,
        category: 'build',
        status: 'todo',
        execute_label: 'Let Karnex build invoicing',
        auto_executable: true,
        agent_config: {
          task_type: 'scaffold_feature',
          specification: 'Invoicing UI and totals calculator',
        },
        agent_output: null,
        sprint_id: 'mock-sprint-1'
      },
      {
        id: 'mock-task-2',
        title: 'Email 10 freelance designers',
        description: 'Batch personalized discovery outreach templates to target branding freelancers.',
        priority: 2,
        category: 'outreach',
        status: 'todo',
        execute_label: 'Let Karnex pitch outreach',
        auto_executable: true,
        agent_config: {
          campaign_goal: 'Discover invoicing paint points',
        },
        agent_output: null,
        sprint_id: 'mock-sprint-1'
      },
      {
        id: 'mock-task-3',
        title: 'Map 5 invoicing competitors',
        description: 'Map FreshBooks, HoneyBook and other creative billing workarounds to identify moats.',
        priority: 3,
        category: 'research',
        status: 'todo',
        execute_label: 'Let Karnex search competitors',
        auto_executable: true,
        agent_config: {
          research_question: 'Map creative invoicing software competitors',
        },
        agent_output: null,
        sprint_id: 'mock-sprint-1'
      }
    ]
  }

  const defaultSubscription = {
    plan: 'free',
    tasks_used_this_cycle: 4,
    tasks_limit: 20
  }

  return (
    <DashboardHQ
      initialFounder={{
        id: founder.id,
        full_name: founder.full_name,
        display_name: founder.display_name,
        momentum_score: founder.momentum_score ?? 50,
        streak_days: founder.streak_days ?? 0,
        last_standup_at: founder.last_standup_at,
        onboarding_step: founder.onboarding_step ?? 0
      }}
      initialSubscription={subscription || defaultSubscription}
      initialTasks={tasks}
      initialRoadmapProgress={{
        phaseTitle,
        percentComplete,
        daysRemaining
      }}
    />
  )
}
