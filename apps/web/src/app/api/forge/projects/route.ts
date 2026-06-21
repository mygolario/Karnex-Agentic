import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: List projects for the authenticated founder
export async function GET() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: projects, error } = await supabase
    .from('forge_projects')
    .select('*')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(projects || [])
}

// POST: Create a new project
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, tech_stack, github_repo, description, project_type } = body

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const { data: project, error } = await supabase
      .from('forge_projects')
      .insert({
        founder_id: user.id,
        name,
        tech_stack: tech_stack || { framework: 'nextjs', styling: 'tailwind', database: 'supabase' },
        github_repo: github_repo || null,
        description: description || '',
        project_type: project_type || 'web_nextjs',
        status: 'active',
        current_version: 0
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(project)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request body' }, { status: 400 })
  }
}
