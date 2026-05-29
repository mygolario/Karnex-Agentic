import { createSupabaseServerClient } from '@/lib/supabase/server'

const features = [
  {
    title: 'Dream Engine',
    description: 'Transform your pain into validated product hypotheses',
    href: '/ideas',
    gradient: 'from-violet-500/20 to-purple-500/20',
    ring: 'ring-violet-500/30',
    iconColor: 'text-violet-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    title: 'War Room',
    description: 'Generate your 90-day roadmap with milestones and sprints',
    href: '/warroom',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    ring: 'ring-blue-500/30',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    title: 'Agent Hub',
    description: 'Trigger AI agents to build, research, and execute for you',
    href: '/agents',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    ring: 'ring-emerald-500/30',
    iconColor: 'text-emerald-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
      </svg>
    ),
  },
  {
    title: 'Compass',
    description: 'Daily standups, momentum tracking, and coaching',
    href: '/compass',
    gradient: 'from-amber-500/20 to-orange-500/20',
    ring: 'ring-amber-500/30',
    iconColor: 'text-amber-400',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 0v.938m0 17.063V21m9.75-9H20.812M3.188 12H2.25" />
      </svg>
    ),
  },
]

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Founder'

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">{displayName}</span>
        </h1>
        <p className="mt-2 text-zinc-500">
          Your AI co-founder is ready. What are we building today?
        </p>
      </div>

      {/* Momentum placeholder */}
      <div className="mb-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-400">Momentum Score</p>
            <p className="mt-1 text-4xl font-bold text-white">50<span className="text-lg text-zinc-600">/100</span></p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-zinc-800/50 px-4 py-2 text-sm text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Getting started
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all" />
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <a
            key={feature.title}
            href={feature.href}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} ring-1 ${feature.ring} ${feature.iconColor}`}>
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-zinc-100">
              {feature.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-500 group-hover:text-zinc-400">
              {feature.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
