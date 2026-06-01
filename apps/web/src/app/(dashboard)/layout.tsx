import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/SidebarNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userProps = {
    email: user.email ?? '',
    fullName: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Founder',
  }

  return (
    <div className="flex min-h-screen bg-[#050505] font-sans antialiased text-[#e5e5e5]">
      {/* Sidebar Navigation */}
      <SidebarNav user={userProps} />

      {/* Main content area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Header / Status bar */}
        <header className="h-20 border-b border-[#1a1a1a] flex items-center justify-between px-8 bg-[#050505]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">WORKSPACE</span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
              {userProps.fullName}&apos;s Startup
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* System Status */}
            <div className="flex items-center gap-2 rounded-full border border-[#1a1a1a] bg-[#07070a] px-3.5 py-1.5 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-400 font-medium">All Agents Standby</span>
            </div>

            {/* Quick Action Button */}
            <a
              href="/agents"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Deploy Agent
            </a>
          </div>
        </header>

        {/* Content view */}
        <main className="flex-1 p-8 bg-[#050505]">
          {children}
        </main>
      </div>
    </div>
  )
}
