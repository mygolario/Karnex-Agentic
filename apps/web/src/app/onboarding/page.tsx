import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingWizard from './OnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch founder to check if onboarding is already completed
  const { data: founder } = await supabase
    .from('founders')
    .select('display_name, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (founder?.onboarding_completed) {
    redirect('/dashboard')
  }

  const initialName = founder?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Founder'

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] font-sans antialiased overflow-x-hidden relative">
      {/* Mesh Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c0c_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Subtle Glowing Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6366f1]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      <OnboardingWizard initialName={initialName} />
    </div>
  )
}
