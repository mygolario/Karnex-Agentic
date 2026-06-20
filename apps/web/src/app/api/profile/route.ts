import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { calculateCompletenessScore, FounderProfile } from '@/types/profile'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: memory, error } = await supabase
      .from('founder_memory')
      .select('value')
      .eq('founder_id', user.id)
      .eq('namespace', 'profile')
      .eq('key', 'founder_profile')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!memory) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    return NextResponse.json({ profile: memory.value })
  } catch (error: any) {
    console.error('Error fetching founder profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const newProfileData = await request.json() as Partial<FounderProfile>

    // 1. Fetch current profile to check for significant updates (pivots)
    const { data: existingMemory } = await supabase
      .from('founder_memory')
      .select('value')
      .eq('founder_id', user.id)
      .eq('namespace', 'profile')
      .eq('key', 'founder_profile')
      .maybeSingle()

    const oldProfile = existingMemory?.value as FounderProfile | null
    const isPivot = oldProfile && (
      (newProfileData.venture?.idea && oldProfile.venture?.idea && newProfileData.venture.idea !== oldProfile.venture.idea) ||
      (newProfileData.venture?.productName && oldProfile.venture?.productName && newProfileData.venture.productName !== oldProfile.venture.productName) ||
      (newProfileData.market?.targetCustomer?.jobTitle && oldProfile.market?.targetCustomer?.jobTitle && newProfileData.market.targetCustomer.jobTitle !== oldProfile.market.targetCustomer.jobTitle)
    )

    // Merge old and new values
    const mergedProfile: Partial<FounderProfile> = {
      identity: { ...(oldProfile?.identity || {}), ...(newProfileData.identity || {}) } as any,
      venture: { ...(oldProfile?.venture || {}), ...(newProfileData.venture || {}) } as any,
      market: { ...(oldProfile?.market || {}), ...(newProfileData.market || {}) } as any,
      execution: { ...(oldProfile?.execution || {}), ...(newProfileData.execution || {}) } as any,
      voice: { ...(oldProfile?.voice || {}), ...(newProfileData.voice || {}) } as any,
      momentum: { ...(oldProfile?.momentum || { score: 50, lastUpdated: new Date().toISOString() }), ...(newProfileData.momentum || {}) } as any
    }

    // 2. Compute completeness score
    mergedProfile.completenessScore = calculateCompletenessScore(mergedProfile)

    // 3. Save to founder_memory
    const { error: memoryError } = await supabase
      .from('founder_memory')
      .upsert({
        founder_id: user.id,
        namespace: 'profile',
        key: 'founder_profile',
        value: mergedProfile
      }, { onConflict: 'founder_id,namespace,key' })

    if (memoryError) {
      return NextResponse.json({ error: `Memory save error: ${memoryError.message}` }, { status: 500 })
    }

    // 4. Update startups/founders tables structural columns for parity
    const { data: startup } = await supabase
      .from('startups')
      .select('id, name')
      .eq('founder_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (startup) {
      await supabase
        .from('startups')
        .update({
          name: mergedProfile.venture?.productName || startup.name || 'Startup',
          description: mergedProfile.venture?.idea || '',
          industry: mergedProfile.venture?.domain || '',
          target_audience: mergedProfile.market?.targetCustomer?.jobTitle || '',
          stage: mergedProfile.venture?.stage || 'ideation'
        })
        .eq('id', startup.id)
    }

    await supabase
      .from('founders')
      .update({
        display_name: mergedProfile.identity?.displayName || '',
        full_name: mergedProfile.identity?.fullName || '',
        timezone: mergedProfile.identity?.timezone || 'America/New_York',
        technical_level: mergedProfile.identity?.technicalLevel === 'technical' ? 'advanced' : mergedProfile.identity?.technicalLevel === 'non-technical' ? 'beginner' : 'intermediate',
        weekly_hours_available: mergedProfile.execution?.weeklyAvailability === '<5 hrs' ? 5 : mergedProfile.execution?.weeklyAvailability === '5-15 hrs' ? 10 : 20,
        communication_tone: mergedProfile.identity?.feedbackStyle === 'gentle' ? 'casual' : mergedProfile.identity?.feedbackStyle === 'brutal' ? 'direct' : 'direct'
      })
      .eq('id', user.id)

    // 5. Log to Decision Journal automatically if it's a pivot
    if (isPivot && startup) {
      await supabase
        .from('decisions')
        .insert({
          startup_id: startup.id,
          founder_id: user.id,
          title: 'Founder Profile Pivot',
          description: `Pivot detected during profile update. Changed product name to "${mergedProfile.venture?.productName}" and idea to "${mergedProfile.venture?.idea}".`,
          rationale: `Profile updated manually by founder. Previous: Name="${oldProfile?.venture?.productName}", Idea="${oldProfile?.venture?.idea}".`,
          category: 'pivot',
          reversibility: 'easily_reversible',
          confidence: 'medium',
          decided_at: new Date().toISOString()
        })
    }

    return NextResponse.json({ success: true, profile: mergedProfile })
  } catch (error: any) {
    console.error('Error updating founder profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete Founder Profile memory
    await supabase
      .from('founder_memory')
      .delete()
      .eq('founder_id', user.id)
      .eq('namespace', 'profile')
      .eq('key', 'founder_profile')

    // Reset onboarding completed status in founders table
    await supabase
      .from('founders')
      .update({
        onboarding_completed: false,
        onboarding_completed_at: null,
        current_startup_id: null
      })
      .eq('id', user.id)

    // Delete related startups/ideas to ensure absolute data privacy
    await supabase
      .from('startups')
      .delete()
      .eq('founder_id', user.id)

    return NextResponse.json({ success: true, message: 'All founder profile data successfully removed.' })
  } catch (error: any) {
    console.error('Error deleting founder profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
