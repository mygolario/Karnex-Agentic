import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Skill-adaptive Studio defaults from founder profile */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      autonomy: 'founder',
      max_mode: false,
      auto_model: false,
      mode: 'auto',
      project_type: 'auto',
    })
  }

  const { data: founder } = await supabase
    .from('founders')
    .select('technical_level')
    .eq('id', user.id)
    .maybeSingle()

  const level = (founder?.technical_level as string) || 'intermediate'

  if (level === 'beginner' || level === 'non_technical') {
    return NextResponse.json({
      autonomy: 'founder',
      max_mode: false,
      auto_model: true,
      mode: 'auto',
      project_type: 'web_nextjs',
      technical_level: level,
    })
  }

  if (level === 'advanced' || level === 'expert') {
    return NextResponse.json({
      autonomy: 'developer',
      max_mode: true,
      auto_model: false,
      mode: 'auto',
      project_type: 'auto',
      technical_level: level,
    })
  }

  return NextResponse.json({
    autonomy: 'founder',
    max_mode: false,
    auto_model: false,
    mode: 'auto',
    project_type: 'auto',
    technical_level: level,
  })
}
