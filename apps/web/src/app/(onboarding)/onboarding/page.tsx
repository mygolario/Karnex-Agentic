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
    redirect('/dashboard')
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

  // Fetch selected hypothesis to verify if they can access step 3
  const { data: hypothesisMemory } = await supabase
    .from('founder_memory')
    .select('value')
    .eq('founder_id', user.id)
    .eq('namespace', 'onboarding')
    .eq('key', 'selected_hypothesis')
    .maybeSingle()
  const hasSelectedHypothesis = !!hypothesisMemory?.value

  // Fetch roadmap data to verify if they can access step 4
  const { data: roadmapMemory } = await supabase
    .from('founder_memory')
    .select('value')
    .eq('founder_id', user.id)
    .eq('namespace', 'onboarding')
    .eq('key', 'roadmap_data')
    .maybeSingle()
  const hasRoadmap = !!roadmapMemory?.value

  // Determine max allowed step based on completed stages data
  let maxAllowedStep = 1
  if (savedContext?.pain_description) {
    maxAllowedStep = 2
  }
  if (hasSelectedHypothesis) {
    maxAllowedStep = 3
  }
  if (hasRoadmap) {
    maxAllowedStep = 4
  }

  const urlStep = params.step ? parseInt(params.step, 10) : undefined
  const urlRunId = params.run_id

  // Enforce step constraint to prevent bypassing
  let targetStep = urlStep
  let targetRunId = urlRunId || savedRunId

  if (targetStep === undefined) {
    // If no step is in the URL, redirect to the saved step (bounded by max allowed step)
    const activeStep = Math.min(savedStep, maxAllowedStep)
    redirect(`/onboarding?step=${activeStep}${targetRunId ? `&run_id=${targetRunId}` : ''}`)
  }

  if (targetStep > maxAllowedStep) {
    // If attempting to bypass steps, redirect to max allowed step
    redirect(`/onboarding?step=${maxAllowedStep}${targetRunId ? `&run_id=${targetRunId}` : ''}`)
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
