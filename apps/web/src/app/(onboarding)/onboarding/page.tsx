import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingWizard from './OnboardingWizard'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ step?: string; run_id?: string }>
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams
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
    redirect('/home')
  }

  // Fetch saved onboarding step from founder_memory
  const { data: stepMemory } = await supabase
    .from('founder_memory')
    .select('value')
    .eq('founder_id', user.id)
    .eq('namespace', 'onboarding')
    .eq('key', 'step')
    .maybeSingle()

  const savedStepValue = stepMemory?.value as { step?: number; run_id?: string } | null
  const savedStep = savedStepValue?.step || 1
  const savedRunId = savedStepValue?.run_id || ''

  // Fetch saved pain context from founder_memory (if any)
  const { data: contextMemory } = await supabase
    .from('founder_memory')
    .select('value')
    .eq('founder_id', user.id)
    .eq('namespace', 'onboarding')
    .eq('key', 'pain_context')
    .maybeSingle()

  const savedContext = contextMemory?.value as { pain_description?: string, industry_context?: string } | null

  // Fetch onboarding progress state from founder_memory
  const { data: progressMemory } = await supabase
    .from('founder_memory')
    .select('value')
    .eq('founder_id', user.id)
    .eq('namespace', 'onboarding')
    .eq('key', 'onboarding_progress_state')
    .maybeSingle()

  const progress = progressMemory?.value as { currentStep?: number } | null
  const combinedSavedStep = Math.max(
    savedStepValue?.step || 1,
    progress?.currentStep || 1
  )

  // Determine max allowed step based on completed stages data
  const maxAllowedStep = Math.max(combinedSavedStep, 1)

  const urlStep = params.step ? parseInt(params.step, 10) : undefined
  const urlRunId = params.run_id

  // Enforce step constraint to prevent bypassing
  let targetStep = urlStep
  let targetRunId = urlRunId || savedRunId

  if (targetStep === undefined) {
    // If no step is in the URL, redirect to the saved step (bounded by 6)
    const activeStep = Math.min(combinedSavedStep, 6)
    redirect(`/onboarding?step=${activeStep}${targetRunId ? `&run_id=${targetRunId}` : ''}`)
  }

  if (targetStep < 1 || targetStep > 6) {
    // Redirect if step is out of valid range (1 to 6)
    const activeStep = Math.min(combinedSavedStep, 6)
    redirect(`/onboarding?step=${activeStep}${targetRunId ? `&run_id=${targetRunId}` : ''}`)
  }

  const initialName = founder?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Founder'

  return (
    <OnboardingWizard
      initialName={initialName}
      savedStep={targetStep}
      savedContext={savedContext}
    />
  )
}
