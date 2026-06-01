import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

const features = [
  {
    title: 'Dream Engine',
    description: 'Transform user feedback and pain points into validated product hypotheses.',
    href: '/ideas',
    badge: '3 Ideas',
    gradient: 'from-violet-500/15 to-purple-500/15',
    ring: 'ring-violet-500/20 border-violet-500/30',
    iconColor: 'text-violet-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    title: 'War Room',
    description: 'Structure your 90-day epic plan with sprints, tasks, and automated roadmap builds.',
    href: '/warroom',
    badge: 'Sprint 2 Active',
    gradient: 'from-blue-500/15 to-cyan-500/15',
    ring: 'ring-blue-500/20 border-blue-500/30',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    title: 'Agent Hub',
    description: 'Orchestrate specialized AI agents to write code, do research, and run outreach.',
    href: '/agents',
    badge: '5 Agents Live',
    gradient: 'from-emerald-500/15 to-teal-500/15',
    ring: 'ring-emerald-500/20 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
      </svg>
    ),
  },
  {
    title: 'Compass',
    description: 'Check daily standups, review velocity metrics, and keep your building momentum high.',
    href: '/compass',
    badge: 'Daily Standup Ready',
    gradient: 'from-amber-500/15 to-orange-500/15',
    ring: 'ring-amber-500/20 border-amber-500/30',
    iconColor: 'text-amber-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 0v.938m0 17.063V21m9.75-9H20.812M3.188 12H2.25" />
      </svg>
    ),
  },
]

const recentActivities = [
  {
    action: 'Generate 90-day war roadmap',
    module: 'War Room',
    time: '2 hours ago',
    status: 'completed',
  },
  {
    action: 'Synthesize feedback on user interview logs',
    module: 'Dream Engine',
    time: '5 hours ago',
    status: 'completed',
  },
  {
    action: 'LinkedIn lead campaign outreach-agent initialization',
    module: 'Agent Hub',
    time: 'Yesterday',
    status: 'completed',
  },
  {
    action: 'Co-founder alignment analysis & velocity index calculation',
    module: 'Compass',
    time: '2 days ago',
    status: 'completed',
  },
]

const mockLogs = [
  { time: '06:01:14 AM', type: 'SYSTEM', message: 'Booting Karnex AI Co-Founder network...', color: 'text-zinc-500' },
  { time: '06:01:18 AM', type: 'SYSTEM', message: 'Connected to Supabase auth & DB cluster successfully.', color: 'text-zinc-500' },
  { time: '06:01:22 AM', type: 'DREAM ENGINE', message: 'outreach-agent campaign initialized: "Founder Alpha Access".', color: 'text-violet-400' },
  { time: '06:01:30 AM', type: 'WAR ROOM', message: 'Sprint 2 timeline built: "Database migration & Auth sync".', color: 'text-blue-400' },
  { time: '06:02:05 AM', type: 'COMPASS', message: 'Standing daily summary reports generated.', color: 'text-amber-400' },
  { time: '06:05:40 AM', type: 'AGENT HUB', message: 'outreach-agent sent 12 follow-ups (success rate: 92%).', color: 'text-emerald-400' },
  { time: '06:17:10 AM', type: 'COMPASS', message: 'Calculated project momentum index: 50/100 (+12% delta).', color: 'text-amber-400' },
]

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Founder'

  // Get current date string representation
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1a1a1a] pb-8">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">{displayName}</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {formattedDate} — All systems operational. Your AI co-founder is ready to build.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-400 font-mono tracking-wider uppercase">
            Project: Karnex-Agentic
          </span>
        </div>
      </div>

      {/* Startup Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Momentum Score Widget */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
              Momentum Score
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              +12% vs last week
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white tracking-tight">50</span>
            <span className="text-lg text-zinc-600 font-medium">/ 100</span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Velocity: Optimal</span>
              <span>Next goal: 60</span>
            </div>
          </div>
        </div>

        {/* Milestone Tracker */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
              Launch Timeline
            </span>
            <span className="text-xs font-medium text-zinc-400 font-mono">
              Day 18 / 90
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-zinc-100 truncate">
              Phase 2: Product Architecture
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Building DB models, layout schema, & APIs
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
              <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Milestone: 60% Done</span>
              <span>72 Days remaining</span>
            </div>
          </div>
        </div>

        {/* Active Agents Summary */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
              AI Workforce
            </span>
            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
              Active Now
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white tracking-tight">3</span>
            <span className="text-lg text-zinc-600 font-medium">/ 5 Agents running</span>
          </div>
          <div className="mt-4 flex gap-1.5">
            <span className="flex items-center gap-1 rounded bg-[#1a1a1a] px-2 py-1 text-[10px] font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              outreach
            </span>
            <span className="flex items-center gap-1 rounded bg-[#1a1a1a] px-2 py-1 text-[10px] font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              warroom
            </span>
            <span className="flex items-center gap-1 rounded bg-[#1a1a1a] px-2 py-1 text-[10px] font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              compass
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Core Layouts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Module Navigation Grid */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Startup Builder Modules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group relative flex flex-col justify-between rounded-xl border border-[#1a1a1a] bg-[#07070a] p-5 hover:border-zinc-700 hover:bg-white/[0.01] transition-all duration-300"
              >
                <div>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} border ${feature.ring} ${feature.iconColor}`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px]">
                  <span className="rounded bg-indigo-500/5 px-2 py-0.5 font-medium text-indigo-400/80 ring-1 ring-inset ring-indigo-500/10">
                    {feature.badge}
                  </span>
                  <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors font-semibold">
                    Open &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live AI Console Logs Terminal */}
        <div className="space-y-4 flex flex-col h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Live Co-Founder Activity Logs
            </h2>
            <span className="text-[10px] font-mono text-zinc-600">
              BUFFER_OK — READY
            </span>
          </div>

          <div className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#020202] p-5 font-mono text-[11px] leading-relaxed shadow-inner overflow-y-auto max-h-[365px] min-h-[300px]">
            <div className="space-y-2">
              {mockLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 hover:bg-white/[0.02] p-0.5 rounded transition-all">
                  <span className="text-zinc-600 select-none">{log.time}</span>
                  <span className="text-zinc-500 select-none">|</span>
                  <span className={`font-semibold shrink-0 uppercase tracking-tight text-[10px] ${log.color} w-24 truncate`}>
                    [{log.type}]
                  </span>
                  <span className="text-zinc-300 break-all">{log.message}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-indigo-400 animate-pulse pt-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>Listening for new co-founder signals...</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Activities Log */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          Recent Pipeline Activities
        </h2>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1a1a1a] bg-[#020203]">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase font-mono">Action</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase font-mono">Module</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase font-mono">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase font-mono text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((act, idx) => (
                <tr key={idx} className="border-b border-[#1a1a1a] last:border-b-0 hover:bg-white/[0.01] transition-all">
                  <td className="px-6 py-4 text-xs font-medium text-zinc-200">{act.action}</td>
                  <td className="px-6 py-4 text-xs font-medium text-zinc-500">{act.module}</td>
                  <td className="px-6 py-4 text-xs text-zinc-500 font-mono">{act.time}</td>
                  <td className="px-6 py-4 text-xs text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" />
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
