import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

const features = [
  {
    title: 'Dream Engine',
    description: 'Transform user feedback and frustrations into validated product hypotheses.',
    href: '/ideas',
    badge: 'Ideation',
    gradient: 'from-violet-500/10 to-purple-500/10',
    ring: 'border-violet-500/20 group-hover:border-violet-500/40',
    iconColor: 'text-violet-400',
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
    badge: 'Roadmap & Build',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    ring: 'border-blue-500/20 group-hover:border-blue-500/40',
    iconColor: 'text-blue-400',
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
    badge: 'Specialized Agents',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    ring: 'border-emerald-500/20 group-hover:border-emerald-500/40',
    iconColor: 'text-emerald-400',
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
    badge: 'Accountability Coaching',
    gradient: 'from-amber-500/10 to-orange-500/10',
    ring: 'border-amber-500/20 group-hover:border-amber-500/40',
    iconColor: 'text-amber-400',
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
  let currentPhaseTheme = 'Validating user pain points and customer discovery.'

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
        currentPhaseTheme = phase.theme || ''
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

  // 4. Fetch live activity logs
  const { data: recentRuns } = await supabase
    .from('agent_runs')
    .select('created_at, agent_id, status, error_message')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)

  const liveLogs = []
  if (recentRuns && recentRuns.length > 0) {
    for (const run of recentRuns) {
      const timeStr = new Date(run.created_at).toLocaleTimeString()
      const agentLabel = run.agent_id.replace('-v1', '').toUpperCase().replace('_', ' ')
      
      let message = 'Execution logs registered.'
      let color = 'text-zinc-500'
      if (run.status === 'success') {
        message = 'Agent completed computation sequence successfully.'
        color = 'text-emerald-400'
      } else if (run.status === 'error') {
        message = `Failure context: ${run.error_message || 'Unhandled runtime error'}`
        color = 'text-red-400'
      } else if (run.status === 'running') {
        message = 'Processing workflow variables...'
        color = 'text-indigo-400 animate-pulse'
      }
      
      liveLogs.push({
        time: timeStr,
        type: agentLabel,
        message,
        color
      })
    }
  } else {
    liveLogs.push({ time: new Date().toLocaleTimeString(), type: 'SYSTEM', message: 'Booting Karnex AI Co-Founder network...', color: 'text-zinc-500' })
    liveLogs.push({ time: new Date().toLocaleTimeString(), type: 'SYSTEM', message: 'Connected to Supabase auth & DB cluster successfully.', color: 'text-zinc-500' })
    liveLogs.push({ time: new Date().toLocaleTimeString(), type: 'AGENT CONSOLE', message: 'Listening for new co-founder pipeline directives...', color: 'text-indigo-400' })
  }

  // 5. Fetch recent pipeline activities
  const { data: activityLogs } = await supabase
    .from('agent_runs')
    .select('agent_id, status, created_at')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })
    .limit(4)

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
      module: agentClean.replace('_', ' ').toUpperCase(),
      time: timeStr,
      status: r.status || 'success'
    }
  }) : []

  // SVG parameters for circular indicator
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (momentumScore / 100) * circumference

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      
      {/* Header Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1a1a1a]/40 pb-6 relative">
        <div className="absolute -top-10 left-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">{displayName}</span>
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500 font-medium">
            {formattedDate} &bull; All agent workflows synchronized and standing by.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-2 rounded-lg border border-[#1a1a1a]/40 bg-[#060608]/80 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider uppercase">
            ENV: DEVELOPMENT
          </span>
        </div>
      </div>

      {/* Startup Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Momentum Score Widget (Circular Gauge) */}
        <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 flex items-center justify-between relative overflow-hidden group hover:border-[#1a1a1a]">
          <div className="space-y-4 flex-1">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono block">
              Momentum Velocity
            </span>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white tracking-tight">{momentumScore}</span>
                <span className="text-xs text-zinc-600 font-bold">/ 100</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                Sync accountability rating based on daily task progression logs.
              </p>
            </div>
          </div>
          
          <div className="relative flex items-center justify-center pl-4 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              {/* Background Track */}
              <circle
                className="text-zinc-900"
                strokeWidth="5"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="40"
                cy="40"
              />
              {/* Active Indicator */}
              <circle
                className="text-indigo-500 transition-all duration-1000"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="40"
                cy="40"
              />
            </svg>
            <div className="absolute text-[10px] font-bold text-zinc-400 font-mono">
              {momentumScore}%
            </div>
          </div>
        </div>

        {/* Milestone Tracker (Horizontal Steps) */}
        <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 flex flex-col justify-between hover:border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono">
              Launch Timeline
            </span>
            <span className="text-[10px] font-bold text-zinc-400 font-mono bg-zinc-900 border border-zinc-800/40 rounded px-1.5 py-0.5">
              {daysRemaining} Days Left
            </span>
          </div>

          <div className="my-3">
            <p className="text-xs font-bold text-zinc-200 truncate leading-relaxed">
              {currentPhaseTitle}
            </p>
            <p className="text-[10px] text-zinc-500 truncate leading-relaxed mt-0.5">
              {currentPhaseTheme}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500" 
                style={{ width: `${timelinePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-600">
              <span>Sprint progress: {timelinePct}%</span>
              <span>Total timeline: 90 Days</span>
            </div>
          </div>
        </div>

        {/* Active Agents workforce summary */}
        <div className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 flex flex-col justify-between hover:border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono">
              AI Workforce
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/15 font-mono">
              ACTIVE
            </span>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">{activeRunsCount ?? 0}</span>
              <span className="text-[11px] text-zinc-500 font-semibold font-sans">Agent Runs live</span>
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {activeAgentNames.length > 0 ? (
              activeAgentNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800/40 px-2 py-0.5 text-[9px] font-bold text-zinc-400 font-mono capitalize">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {name}
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-600 font-mono">
                All builder agents on standby.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Core Layouts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Module Navigation Grid (Left side, takes 3 columns) */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono">
            Startup Builder Modules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group relative flex flex-col justify-between rounded-xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 hover:border-indigo-500/25 hover:bg-white/[0.01] transition-all duration-300 shadow-inner"
              >
                <div>
                  <div className={`mb-3.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#050505] border ${feature.ring} ${feature.iconColor} transition-colors group-hover:bg-indigo-500/5`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between text-[10px] border-t border-[#1a1a1a]/30 pt-3">
                  <span className="rounded bg-indigo-500/5 px-2 py-0.5 font-bold text-indigo-400/80 border border-indigo-500/10 font-mono text-[9px] uppercase tracking-wide">
                    {feature.badge}
                  </span>
                  <span className="text-zinc-600 group-hover:text-indigo-400 transition-all font-bold">
                    Open &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live AI Console Logs Terminal (Right side, takes 2 columns) */}
        <div className="lg:col-span-2 space-y-4 flex flex-col h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
              </span>
              Agent Console logs
            </h2>
            <span className="text-[9px] font-mono text-zinc-600">
              BUFFER_OK
            </span>
          </div>

          {/* Windowed Terminal Design */}
          <div className="flex-1 rounded-xl border border-[#1a1a1a]/40 bg-[#030305]/95 shadow-2xl flex flex-col overflow-hidden min-h-[300px]">
            {/* Header controls bar */}
            <div className="bg-[#08080c] border-b border-[#1a1a1a]/40 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest font-semibold">terminal.sh</span>
              <div className="w-12" /> {/* Spacer */}
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-5 font-mono text-[10px] leading-relaxed overflow-y-auto max-h-[310px] select-all">
              <div className="space-y-2">
                {liveLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 hover:bg-white/[0.01] p-0.5 rounded transition-all">
                    <span className="text-zinc-600 select-none shrink-0 font-semibold">{log.time}</span>
                    <span className="text-zinc-700 select-none shrink-0">|</span>
                    <span className={`font-bold shrink-0 uppercase tracking-tight text-[9px] ${log.color} w-20 truncate`}>
                      [{log.type}]
                    </span>
                    <span className="text-zinc-400 break-all">{log.message}</span>
                  </div>
                ))}
                
                <div className="flex items-center gap-1.5 text-indigo-400 pt-1.5 select-none">
                  <span className="text-zinc-500 font-bold">founder@karnex:~$</span>
                  <span className="prompt-cursor" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Activities Log Table */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono">
          Recent Pipeline Activities
        </h2>
        <div className="rounded-xl border border-[#1a1a1a]/40 bg-[#07070a]/90 overflow-hidden shadow-inner">
          {recentActivities.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1a1a1a]/40 bg-[#060609]/80 text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wide">
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((act, idx) => (
                  <tr key={idx} className="border-b border-[#1a1a1a]/30 last:border-b-0 hover:bg-white/[0.01] transition-all text-xs text-zinc-300">
                    <td className="px-6 py-4 font-semibold text-zinc-200">{act.action}</td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">{act.module}</td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">{act.time}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold border capitalize font-mono ${
                        act.status === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : act.status === 'running'
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${
                          act.status === 'success' ? 'bg-emerald-400' : act.status === 'running' ? 'bg-indigo-400' : 'bg-red-400'
                        }`} />
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-zinc-600 text-xs font-mono">
              No recent pipeline agent executions. Run validation loops to see logs.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
