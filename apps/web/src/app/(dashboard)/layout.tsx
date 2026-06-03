import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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
    .select('id, name, stage')
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
  let activeStartupName = startup?.name || `${user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Founder'}'s Startup`
  let activeStartupStage = startup?.stage || 'ideation'

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
      activeStartupName = newStartup.name
      activeStartupStage = newStartup.stage || 'ideation'
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

  // Detect if we're on the Studio/Forge route for full-bleed layout
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''
  const isStudio = pathname.startsWith('/studio') || pathname.startsWith('/forge')

  return (
    <div className="flex min-h-screen bg-[#050505] font-sans antialiased text-[#e5e5e5]">
      {/* Sidebar Navigation */}
      <SidebarNav user={userProps} />

      {/* Main content area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        
        {/* Top Header — hidden on Studio for full-bleed IDE */}
        {!isStudio && (
          <header className="sticky top-0 z-30 h-14 border-b border-[#1a1a1a] flex items-center justify-between px-8 bg-[#050505]/90 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#525252]">Workspace</span>
              <span className="text-[#1a1a1a]">/</span>
              <span className="text-[13px] font-medium text-[#e5e5e5] truncate max-w-[200px]">
                {activeStartupName}
              </span>
              <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded capitalize">
                {activeStartupStage}
              </span>
            </div>

            <div className="flex items-center gap-5">
              {/* System Status */}
              <div className="flex items-center gap-2 text-[13px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-[#a1a1a1]">All agents standby</span>
              </div>

              {/* Quick Action Button */}
              <a
                href="/home"
                className="dash-btn dash-btn-primary text-[13px] px-4 py-2"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Deploy Agent
              </a>
            </div>
          </header>
        )}

        {/* Content view — no padding on Studio */}
        <main className={isStudio ? 'flex-1 bg-[#050505] overflow-hidden' : 'flex-1 px-8 py-8 bg-[#050505]'}>
          {children}
        </main>
      </div>
    </div>
  )
}
