import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/SidebarNav'
import { createClient } from '@supabase/supabase-js'

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

  // Create admin client to bypass RLS for user provisioning
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ensure founder record exists
  const { data: founder, error: founderSelectError } = await supabaseAdmin
    .from('founders')
    .select('id, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (founderSelectError) {
    throw new Error(
      `Failed to read founders row (possible missing GRANTs/RLS). ${founderSelectError.message}`
    )
  }

  if (!founder) {
    const fullName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Founder'
    const { error: founderInsertError } = await supabaseAdmin
      .from('founders')
      .insert({
        id: user.id,
        full_name: fullName,
        display_name: fullName,
        technical_level: 'intermediate',
        weekly_hours_available: 20,
        momentum_score: 0,
        streak_days: 0,
        onboarding_completed: false
      })
    if (founderInsertError) {
      throw new Error(
        `Failed to provision founders row (possible missing GRANTs/RLS). ${founderInsertError.message}`
      )
    }
    // Redirection for new users
    redirect('/onboarding')
  }

  if (founder && !founder.onboarding_completed) {
    redirect('/onboarding')
  }

  // Ensure startup record exists
  const { data: startup, error: startupSelectError } = await supabaseAdmin
    .from('startups')
    .select('id')
    .eq('founder_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (startupSelectError) {
    throw new Error(
      `Failed to read startups row (possible missing GRANTs/RLS). ${startupSelectError.message}`
    )
  }

  let activeStartupId = startup?.id

  if (!startup) {
    const { data: newStartup } = await supabaseAdmin
      .from('startups')
      .insert({
        founder_id: user.id,
        name: `${user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Founder'}'s Startup`,
        description: 'Created by Karnex co-founder',
        is_active: true
      })
      .select()
      .single()

    if (newStartup) {
      activeStartupId = newStartup.id
      // Update founder current_startup_id
      const { error: founderUpdateError } = await supabaseAdmin
        .from('founders')
        .update({ current_startup_id: newStartup.id })
        .eq('id', user.id)
      if (founderUpdateError) {
        throw new Error(
          `Failed to set founders.current_startup_id (possible missing GRANTs/RLS). ${founderUpdateError.message}`
        )
      }
    }
  }

  // Ensure subscription record exists
  const { data: subscription, error: subscriptionSelectError } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('founder_id', user.id)
    .maybeSingle()

  if (subscriptionSelectError) {
    throw new Error(
      `Failed to read subscriptions row (possible missing GRANTs/RLS). ${subscriptionSelectError.message}`
    )
  }

  if (!subscription) {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const { error: subscriptionInsertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        founder_id: user.id,
        plan: 'starter',
        status: 'trialing',
        started_at: new Date().toISOString(),
        expires_at: thirtyDaysFromNow.toISOString(),
        tasks_used_this_cycle: 0,
        tasks_limit: 100
      })
    if (subscriptionInsertError) {
      throw new Error(
        `Failed to provision subscriptions row (possible missing GRANTs/RLS). ${subscriptionInsertError.message}`
      )
    }
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
