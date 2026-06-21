import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: List versions for a project
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId parameter' }, { status: 400 })
  }

  // Verify project belongs to user
  const { data: project, error: projError } = await supabase
    .from('forge_projects')
    .select('id')
    .eq('id', projectId)
    .eq('founder_id', user.id)
    .maybeSingle()

  if (projError || !project) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
  }

  const { data: versions, error } = await supabase
    .from('forge_versions')
    .select('id, version_number, diff_summary, commit_sha, created_at')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(versions || [])
}

// POST: Restore a specific version
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { projectId, versionNumber, versionId } = body

    if (!projectId || (versionNumber === undefined && !versionId)) {
      return NextResponse.json({ error: 'Missing projectId, versionNumber, or versionId' }, { status: 400 })
    }

    // Verify project belongs to user
    const { data: project, error: projError } = await supabase
      .from('forge_projects')
      .select('id')
      .eq('id', projectId)
      .eq('founder_id', user.id)
      .maybeSingle()

    if (projError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Get the version snapshot
    let query = supabase
      .from('forge_versions')
      .select('snapshot, version_number')
      .eq('project_id', projectId)

    if (versionNumber !== undefined) {
      query = query.eq('version_number', versionNumber)
    } else {
      query = query.eq('id', versionId)
    }

    const { data: version, error: verError } = await query.maybeSingle()

    if (verError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Update current project version in forge_projects
    const { error: updateError } = await supabase
      .from('forge_projects')
      .update({ current_version: version.version_number })
      .eq('id', projectId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      message: `Successfully restored project to version ${version.version_number}`,
      snapshot: version.snapshot
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request body' }, { status: 400 })
  }
}
