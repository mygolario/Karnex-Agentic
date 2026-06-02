import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

const features = [
  {
    title: 'Dream Engine',
    description: 'Transform user feedback and frustrations into validated product hypotheses.',
    href: '/ideas',
    badge: 'Ideation',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    title: 'War Room',
    description: 'Structure your 90-day plan with sprints, tasks, and automated roadmap builds.',
    href: '/warroom',
    badge: 'Strategy',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    title: 'Agent Hub',
    description: 'Orchestrate specialized AI agents to write code, run research, and deploy outreach.',
    href: '/agents',
    badge: 'Execution',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
      </svg>
    ),
  },
  {
    title: 'Compass',
    description: 'Check daily standups, review velocity metrics, and maintain momentum.',
    href: '/compass',
    badge: 'Coaching',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 0v.938m0 17.063V21m9.75-9H20.812M3.188 12H2.25" />
      </svg>
    ),
  },
]

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Founder'
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // 1. Fetch founder momentum score
  const { data: founder } = await supabase
    .from('founders')
    .select('momentum_score')
    .eq('id', user.id)
    .maybeSingle()

  const momentumScore = founder?.momentum_score ?? 0

  // 2. Fetch active roadmap details
  const { data: activeRoadmap } = await supabase
    .from('roadmaps')
    .select('phases, start_date, title')
    .eq('founder_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let daysRemaining = 90
  let timelinePct = 0
  let currentPhaseTitle = 'Concept Refinement & Validation'

  if (activeRoadmap) {
    const startDate = new Date(activeRoadmap.start_date)
    const today = new Date()
    const diffTime = today.getTime() - startDate.getTime()
    const elapsedDays = Math.max(0, Math.min(90, Math.floor(diffTime / (1000 * 60 * 60 * 24))))
    
    daysRemaining = Math.max(0, 90 - elapsedDays)
    timelinePct = Math.round((elapsedDays / 90) * 100)

    if (Array.isArray(activeRoadmap.phases) && activeRoadmap.phases.length > 0) {
      let phaseIdx = 0
      if (elapsedDays > 60) phaseIdx = 2
      else if (elapsedDays > 30) phaseIdx = 1
      
      const phase = activeRoadmap.phases[phaseIdx]
      if (phase) {
        currentPhaseTitle = `Phase ${phase.phase_number ?? (phaseIdx + 1)}: ${phase.title || ''}`
      }
    }
  }

  // 3. Fetch running agent status counts
  const { count: activeRunsCount } = await supabase
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })
    .eq('founder_id', user.id)
    .eq('status', 'running')

  const { data: runningRuns } = await supabase
    .from('agent_runs')
    .select('agent_id')
    .eq('founder_id', user.id)
    .eq('status', 'running')
    .limit(4)

  const activeAgentNames = runningRuns ? runningRuns.map(r => r.agent_id.replace('-v1', '')) : []

  // 4. Fetch recent pipeline activities
  const { data: activityLogs } = await supabase
    .from('agent_runs')
    .select('agent_id, status, created_at')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6)

  const recentActivities = activityLogs ? activityLogs.map(r => {
    let action = 'Agent task triggered'
    const agentClean = r.agent_id.replace('-v1', '')
    if (agentClean === 'pain-transformer') action = 'Extract pain-to-product wedges'
    else if (agentClean === 'war-room') action = 'Structure 90-day milestones & roadmap'
    else if (agentClean === 'daily-standup') action = 'Daily standup coaching sync feedback'
    else if (agentClean === 'outreach') action = 'Compose personalized outbound lead campaigns'

    const diffMs = new Date().getTime() - new Date(r.created_at).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    let timeStr = 'Just now'
    if (diffMin >= 1440) {
      timeStr = `${Math.floor(diffMin / 1440)}d ago`
    } else if (diffMin >= 60) {
      timeStr = `${Math.floor(diffMin / 60)}h ago`
    } else if (diffMin > 0) {
      timeStr = `${diffMin}m ago`
    }

    return {
      action,
      module: agentClean.replace('_', ' '),
      time: timeStr,
      status: r.status || 'success'
    }
  }) : []

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-8">
        <h1 className="font-display font-bold text-[clamp(28px,3.5vw,36px)] leading-[1.15] tracking-[-0.025em] text-white">
          Welcome back, {displayName}
        </h1>
        <p className="mt-2 text-[15px] text-[#737373]">
          {formattedDate}
        </p>
      </div>

      {/* Metrics Row — 3 columns, matching landing page number style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        
        {/* Momentum Score */}
        <div className="bg-[#050505] p-6 space-y-3">
          <p className="text-[13px] text-[#525252]">Momentum</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[36px] tracking-[-0.03em] text-white">{momentumScore}</span>
            <span className="text-[14px] text-[#525252]">/ 100</span>
          </div>
          <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-700" 
              style={{ width: `${momentumScore}%` }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-[#050505] p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-[#525252]">Launch Timeline</p>
            <span className="text-[12px] text-[#a1a1a1]">{daysRemaining} days left</span>
          </div>
          <p className="text-[15px] font-medium text-[#e5e5e5] leading-snug">
            {currentPhaseTitle}
          </p>
          <div className="space-y-1.5">
            <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] transition-all duration-700" 
                style={{ width: `${timelinePct}%` }}
              />
            </div>
            <p className="text-[12px] text-[#525252]">{timelinePct}% complete</p>
          </div>
        </div>

        {/* Active Agents */}
        <div className="bg-[#050505] p-6 space-y-3">
          <p className="text-[13px] text-[#525252]">Active Agents</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[36px] tracking-[-0.03em] text-white">{activeRunsCount ?? 0}</span>
            <span className="text-[14px] text-[#525252]">running</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {activeAgentNames.length > 0 ? (
              activeAgentNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[12px] text-[#a1a1a1] bg-[#0a0a0a] border border-[#1a1a1a] px-2.5 py-1 rounded-lg capitalize">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {name}
                </span>
              ))
            ) : (
              <span className="text-[13px] text-[#525252]">All agents on standby</span>
            )}
          </div>
        </div>
      </div>

      {/* Modules Grid — matches landing page agent card grid style */}
      <div className="space-y-5">
        <p className="section-label">Startup Modules</p>
        <div className="grid md:grid-cols-2 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="bg-[#050505] p-8 hover:bg-[#0a0a0a] transition-colors group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#6366f1] opacity-60 group-hover:opacity-100 transition-opacity" />
                <h3 className="font-display font-semibold text-[16px] text-white">
                  {feature.title}
                </h3>
              </div>
              <p className="text-[14px] leading-[1.65] text-[#737373] mb-5">
                {feature.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[#525252]">
                  {feature.badge}
                </span>
                <span className="text-[13px] text-[#525252] group-hover:text-[#6366f1] transition-colors">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-5">
        <p className="section-label">Recent Activity</p>
        <div className="border border-[#1a1a1a] rounded-2xl overflow-hidden">
          {recentActivities.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[12px] font-medium tracking-[0.06em] uppercase text-[#525252]">
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((act, idx) => (
                  <tr key={idx} className="border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#0a0a0a] transition-colors text-[14px]">
                    <td className="px-6 py-4 font-medium text-[#e5e5e5]">{act.action}</td>
                    <td className="px-6 py-4 text-[#737373] capitalize">{act.module}</td>
                    <td className="px-6 py-4 text-[#525252]">{act.time}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`dash-badge ${
                        act.status === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : act.status === 'running'
                          ? 'bg-[#6366f1]/10 border-[#6366f1]/20 text-[#6366f1]'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          act.status === 'success' ? 'bg-emerald-400' : act.status === 'running' ? 'bg-[#6366f1]' : 'bg-red-400'
                        }`} />
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center text-[#525252]">
              <p className="text-[15px]">No recent activity yet. Run your first agent to see logs here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
